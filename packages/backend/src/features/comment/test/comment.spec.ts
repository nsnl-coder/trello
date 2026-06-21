import { CommentError, ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeEmail } from "../../auth/test/helpers.js";
import {
  authedCaller,
  createCaller,
  makeContext,
  newTestDb,
  seedBoard,
  seedBoardAccess,
  seedCard,
  seedColumn,
  seedProject,
  seedUser,
  seedUserCaller,
  type TestDb,
} from "./helpers.js";

async function ownerCard(db: TestDb) {
  const { user, caller } = await seedUserCaller(db, "owner@example.com");
  const project = await seedProject(db, { ownerId: user.id });
  const board = await seedBoard(db, { projectId: project.id, ownerId: user.id });
  const column = await seedColumn(db, { boardId: board.id, position: 1 });
  const card = await seedCard(db, { columnId: column.id, position: 1 });
  return { user, caller, project, board, column, card };
}

describe("comments", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await newTestDb();
  });
  afterEach(async () => {
    await db.destroy();
  });

  it("creates a top-level comment; no access -> NOT_FOUND", async () => {
    const { caller, card } = await ownerCard(db);
    const c = await caller.comments.create({ cardId: card.id, body: "hi" });
    expect(c.parentId).toBeNull();
    const { caller: stranger } = await seedUserCaller(db, "x@example.com");
    await expect(
      stranger.comments.create({ cardId: card.id, body: "no" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("replies with parentId; reply-to-reply -> PARENT_NOT_TOP_LEVEL", async () => {
    const { caller, card } = await ownerCard(db);
    const top = await caller.comments.create({ cardId: card.id, body: "top" });
    const reply = await caller.comments.create({
      cardId: card.id,
      body: "reply",
      parentId: top.id,
    });
    expect(reply.parentId).toBe(top.id);
    await expect(
      caller.comments.create({ cardId: card.id, body: "x", parentId: reply.id }),
    ).rejects.toMatchObject({ message: CommentError.PARENT_NOT_TOP_LEVEL });
  });

  it("parent on a different card -> PARENT_NOT_FOUND", async () => {
    const { caller, column, card } = await ownerCard(db);
    const card2 = await seedCard(db, { columnId: column.id, position: 2 });
    const top = await caller.comments.create({ cardId: card2.id, body: "top" });
    await expect(
      caller.comments.create({ cardId: card.id, body: "x", parentId: top.id }),
    ).rejects.toMatchObject({ message: CommentError.PARENT_NOT_FOUND });
  });

  it("edit own ok; editing another's -> NOT_AUTHOR", async () => {
    const { caller, board, card } = await ownerCard(db);
    const editor = await seedUser(db, { email: "e@example.com", verified: true });
    await seedBoardAccess(db, board.id, editor.id, ProjectPermission.Edit);
    const c = await caller.comments.create({ cardId: card.id, body: "mine" });
    const upd = await caller.comments.update({ id: c.id, body: "edited" });
    expect(upd.body).toBe("edited");
    await expect(
      authedCaller(db, editor.id).comments.update({ id: c.id, body: "hack" }),
    ).rejects.toMatchObject({ message: CommentError.NOT_AUTHOR });
  });

  it("delete: author ok; owner ok; other member -> FORBIDDEN", async () => {
    const { caller, board, card } = await ownerCard(db);
    const editor = await seedUser(db, { email: "e@example.com", verified: true });
    await seedBoardAccess(db, board.id, editor.id, ProjectPermission.Edit);

    const a = await authedCaller(db, editor.id).comments.create({
      cardId: card.id,
      body: "by editor",
    });
    // Another non-owner member cannot delete it.
    const other = await seedUser(db, { email: "m@example.com", verified: true });
    await seedBoardAccess(db, board.id, other.id, ProjectPermission.Edit);
    await expect(
      authedCaller(db, other.id).comments.delete({ id: a.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Board owner can delete it.
    await caller.comments.delete({ id: a.id });
    // Author can delete their own.
    const b = await caller.comments.create({ cardId: card.id, body: "mine" });
    await caller.comments.delete({ id: b.id });
  });

  it("lists threaded with author + mentions", async () => {
    const { caller, board, card } = await ownerCard(db);
    const bob = await seedUser(db, { email: "bob@example.com", verified: true });
    await seedBoardAccess(db, board.id, bob.id, ProjectPermission.Edit);
    const top = await caller.comments.create({
      cardId: card.id,
      body: "hey @bob look",
    });
    await caller.comments.create({ cardId: card.id, body: "re", parentId: top.id });
    const threads = await caller.comments.list({ cardId: card.id });
    expect(threads).toHaveLength(1);
    expect(threads[0].replies).toHaveLength(1);
    expect(threads[0].author.name).toBe("owner");
    expect(threads[0].mentions.map((m) => m.name)).toContain("bob");
  });

  it("mentions resolve only to board members; non-members ignored", async () => {
    const { caller, card } = await ownerCard(db);
    await seedUser(db, { email: "ghost@example.com", verified: true });
    const c = await caller.comments.create({
      cardId: card.id,
      body: "hi @ghost",
    });
    expect(c.mentions).toHaveLength(0);
  });

  it("mention email sent to member, not the author (mocked)", async () => {
    const { user, board, card } = await ownerCard(db);
    const bob = await seedUser(db, { email: "bob@example.com", verified: true });
    await seedBoardAccess(db, board.id, bob.id, ProjectPermission.Edit);
    const email = fakeEmail();
    const caller = createCaller(makeContext({ db, userId: user.id, email }));
    await caller.comments.create({ cardId: card.id, body: "ping @bob and @owner" });
    const mentionMails = email.sent.filter((e) => e.type === "mention");
    expect(mentionMails).toHaveLength(1);
    expect(mentionMails[0].to).toBe("bob@example.com");
  });
});
