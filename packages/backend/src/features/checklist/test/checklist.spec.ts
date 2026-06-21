import { ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as repo from "../checklist.repo.js";
import {
  authedCaller,
  newTestDb,
  ownerCard,
  seedBoard,
  seedBoardAccess,
  seedCard,
  seedColumn,
  seedProject,
  seedUser,
  seedUserCaller,
  type TestDb,
} from "./helpers.js";

describe("checklists", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("creates checklists on a card (edit)", async () => {
    const { caller, card } = await ownerCard(db);
    const a = await caller.checklists.create({ cardId: card.id, title: "A" });
    const b = await caller.checklists.create({ cardId: card.id, title: "B" });
    expect(b.position).toBeGreaterThan(a.position);
    expect(a.items).toEqual([]);
  });

  it("forbids a view-only grantee from creating a checklist", async () => {
    const owner = await seedUser(db, { email: "o@example.com", verified: true });
    const viewer = await seedUser(db, { email: "v@example.com", verified: true });
    const project = await seedProject(db, { ownerId: owner.id });
    const board = await seedBoard(db, { projectId: project.id, ownerId: owner.id });
    const column = await seedColumn(db, { boardId: board.id, position: 1 });
    const card = await seedCard(db, { columnId: column.id, position: 1 });
    await seedBoardAccess(db, board.id, viewer.id, ProjectPermission.View);
    await expect(
      authedCaller(db, viewer.id).checklists.create({
        cardId: card.id,
        title: "X",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lists checklists with items ordered by position", async () => {
    const { caller, card } = await ownerCard(db);
    const cl = await caller.checklists.create({ cardId: card.id, title: "A" });
    const i1 = await caller.checklistItems.create({
      checklistId: cl.id,
      text: "one",
    });
    const i2 = await caller.checklistItems.create({
      checklistId: cl.id,
      text: "two",
    });
    const list = await caller.checklists.listByCard({ cardId: card.id });
    expect(list).toHaveLength(1);
    expect(list[0].items.map((i) => i.id)).toEqual([i1.id, i2.id]);
  });

  it("adds, updates, deletes an item and toggling done updates progress", async () => {
    const { caller, card } = await ownerCard(db);
    const cl = await caller.checklists.create({ cardId: card.id, title: "A" });
    const item = await caller.checklistItems.create({
      checklistId: cl.id,
      text: "do",
    });
    const updated = await caller.checklistItems.update({
      id: item.id,
      text: "done thing",
      isDone: true,
    });
    expect(updated.isDone).toBe(true);
    expect(updated.text).toBe("done thing");

    const list = await caller.checklists.listByCard({ cardId: card.id });
    const items = list.flatMap((c) => c.items);
    expect(items.filter((i) => i.isDone)).toHaveLength(1);
    expect(items).toHaveLength(1);

    await caller.checklistItems.delete({ id: item.id });
    const list2 = await caller.checklists.listByCard({ cardId: card.id });
    expect(list2.flatMap((c) => c.items)).toHaveLength(0);
  });

  it("moves an item to start, middle and end yielding correct order", async () => {
    const { caller, card } = await ownerCard(db);
    const cl = await caller.checklists.create({ cardId: card.id, title: "A" });
    const a = await caller.checklistItems.create({ checklistId: cl.id, text: "a" });
    const b = await caller.checklistItems.create({ checklistId: cl.id, text: "b" });
    const c = await caller.checklistItems.create({ checklistId: cl.id, text: "c" });

    // move c to start (before a)
    await caller.checklistItems.move({ id: c.id, beforeId: a.id });
    let list = await caller.checklists.listByCard({ cardId: card.id });
    expect(list[0].items.map((i) => i.text)).toEqual(["c", "a", "b"]);

    // move c to middle (between a and b)
    await caller.checklistItems.move({ id: c.id, afterId: a.id, beforeId: b.id });
    list = await caller.checklists.listByCard({ cardId: card.id });
    expect(list[0].items.map((i) => i.text)).toEqual(["a", "c", "b"]);

    // move a to end (after b)
    await caller.checklistItems.move({ id: a.id, afterId: b.id });
    list = await caller.checklists.listByCard({ cardId: card.id });
    expect(list[0].items.map((i) => i.text)).toEqual(["c", "b", "a"]);
  });

  it("deleting a checklist cascades its items", async () => {
    const { caller, card } = await ownerCard(db);
    const cl = await caller.checklists.create({ cardId: card.id, title: "A" });
    await caller.checklistItems.create({ checklistId: cl.id, text: "x" });
    await caller.checklists.delete({ id: cl.id });
    const list = await caller.checklists.listByCard({ cardId: card.id });
    expect(list).toEqual([]);
    const rows = await db
      .selectFrom("checklist_items")
      .selectAll()
      .where("checklist_id", "=", cl.id)
      .execute();
    expect(rows).toHaveLength(0);
  });

  it("deleting a card cascades its checklists", async () => {
    const { caller, card } = await ownerCard(db);
    const cl = await caller.checklists.create({ cardId: card.id, title: "A" });
    await caller.cards.delete({ id: card.id });
    const rows = await db
      .selectFrom("checklists")
      .selectAll()
      .where("id", "=", cl.id)
      .execute();
    expect(rows).toHaveLength(0);
  });

  it("computes progress as done/total across checklists (batch, no N+1)", async () => {
    const { caller, card } = await ownerCard(db);
    const cl1 = await caller.checklists.create({ cardId: card.id, title: "A" });
    const cl2 = await caller.checklists.create({ cardId: card.id, title: "B" });
    const i1 = await caller.checklistItems.create({ checklistId: cl1.id, text: "1" });
    await caller.checklistItems.create({ checklistId: cl1.id, text: "2" });
    await caller.checklistItems.create({ checklistId: cl2.id, text: "3" });
    await caller.checklistItems.update({ id: i1.id, isDone: true });
    const progress = await repo.progressForCards(db, [card.id]);
    expect(progress.get(card.id)).toEqual({ done: 1, total: 3 });
  });

  it("returns NOT_FOUND for a checklist under an inaccessible board", async () => {
    const { caller, card } = await ownerCard(db);
    const cl = await caller.checklists.create({ cardId: card.id, title: "A" });
    const { caller: stranger } = await seedUserCaller(db, "x@example.com");
    await expect(
      stranger.checklists.update({ id: cl.id, title: "Z" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      stranger.checklists.listByCard({ cardId: card.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
