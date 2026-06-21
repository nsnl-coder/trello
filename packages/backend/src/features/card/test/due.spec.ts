import { BoardError, ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeEmail } from "../../auth/test/helpers.js";
import { runDueReminders } from "../card.reminder.js";
import {
  authedCaller,
  newTestDb,
  seedBoard,
  seedBoardAccess,
  seedColumn,
  seedProject,
  seedUser,
  seedUserCaller,
  type TestDb,
} from "./helpers.js";

async function ownerBoardColumn(db: TestDb, email = "owner@example.com") {
  const { user, caller } = await seedUserCaller(db, email);
  const project = await seedProject(db, { ownerId: user.id });
  const board = await seedBoard(db, { projectId: project.id, ownerId: user.id });
  const column = await seedColumn(db, { boardId: board.id, position: 1 });
  return { user, caller, project, board, column };
}

describe("card due dates", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await newTestDb();
  });
  afterEach(async () => {
    await db.destroy();
  });

  it("sets and clears dueAt; isOverdue derived", async () => {
    const { caller, column } = await ownerBoardColumn(db);
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    const past = new Date(Date.now() - 60_000);
    const set = await caller.cards.update({ id: card.id, dueAt: past });
    expect(set.dueAt?.getTime()).toBe(past.getTime());
    expect(set.isOverdue).toBe(true);

    const future = new Date(Date.now() + 3_600_000);
    const upd = await caller.cards.update({ id: card.id, dueAt: future });
    expect(upd.isOverdue).toBe(false);

    const cleared = await caller.cards.update({ id: card.id, dueAt: null });
    expect(cleared.dueAt).toBeNull();
    expect(cleared.isOverdue).toBe(false);
  });

  it("clearing dueAt resets reminder_sent_at", async () => {
    const { caller, column } = await ownerBoardColumn(db);
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    await caller.cards.update({ id: card.id, dueAt: new Date(Date.now() + 60_000) });
    await db
      .updateTable("cards")
      .set({ reminder_sent_at: new Date() })
      .where("id", "=", card.id)
      .execute();
    await caller.cards.update({ id: card.id, dueAt: null });
    const row = await db
      .selectFrom("cards")
      .select("reminder_sent_at")
      .where("id", "=", card.id)
      .executeTakeFirstOrThrow();
    expect(row.reminder_sent_at).toBeNull();
  });

  it("view-only grantee cannot set dueAt", async () => {
    const owner = await seedUser(db, { email: "o@example.com", verified: true });
    const viewer = await seedUser(db, { email: "v@example.com", verified: true });
    const project = await seedProject(db, { ownerId: owner.id });
    const board = await seedBoard(db, { projectId: project.id, ownerId: owner.id });
    const column = await seedColumn(db, { boardId: board.id, position: 1 });
    await seedBoardAccess(db, board.id, viewer.id, ProjectPermission.View);
    const ownerCaller = authedCaller(db, owner.id);
    const card = await ownerCaller.cards.create({ columnId: column.id, title: "A" });
    await expect(
      authedCaller(db, viewer.id).cards.update({ id: card.id, dueAt: new Date() }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("listDueCards returns cards in window ordered; from>to -> INVALID_DUE_RANGE", async () => {
    const { caller, column, board } = await ownerBoardColumn(db);
    const c1 = await caller.cards.create({ columnId: column.id, title: "A" });
    const c2 = await caller.cards.create({ columnId: column.id, title: "B" });
    await caller.cards.update({ id: c1.id, dueAt: new Date(Date.now() + 2 * 86_400_000) });
    await caller.cards.update({ id: c2.id, dueAt: new Date(Date.now() + 1 * 86_400_000) });
    const from = new Date(Date.now() - 86_400_000);
    const to = new Date(Date.now() + 3 * 86_400_000);
    const due = await caller.cards.due({ boardId: board.id, from, to });
    expect(due.map((c) => c.title)).toEqual(["B", "A"]);

    await expect(
      caller.cards.due({ boardId: board.id, from: to, to: from }),
    ).rejects.toMatchObject({ message: BoardError.INVALID_DUE_RANGE });
  });

  it("listDueCards on inaccessible board -> NOT_FOUND", async () => {
    const { board } = await ownerBoardColumn(db);
    const { caller: stranger } = await seedUserCaller(db, "x@example.com");
    await expect(
      stranger.cards.due({
        boardId: board.id,
        from: new Date(0),
        to: new Date(),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("runDueReminders sends once per card and is idempotent", async () => {
    const { caller, column } = await ownerBoardColumn(db);
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    const due = new Date(Date.now() + 30 * 60_000);
    await caller.cards.update({ id: card.id, dueAt: due, reminderMinutes: 60 });

    const email = fakeEmail();
    const sent1 = await runDueReminders(db, email);
    expect(sent1).toBe(1);
    expect(email.sent.filter((e) => e.type === "due")).toHaveLength(1);

    const sent2 = await runDueReminders(db, email);
    expect(sent2).toBe(0);
  });

  it("worker skips cards whose reminder window has not opened", async () => {
    const { caller, column } = await ownerBoardColumn(db);
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    const due = new Date(Date.now() + 5 * 86_400_000);
    await caller.cards.update({ id: card.id, dueAt: due, reminderMinutes: 10 });
    const email = fakeEmail();
    expect(await runDueReminders(db, email)).toBe(0);
  });
});
