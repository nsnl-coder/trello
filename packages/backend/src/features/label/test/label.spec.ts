import { LabelError, ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

async function ownerBoardCol(db: TestDb, email = "owner@example.com") {
  const { user, caller } = await seedUserCaller(db, email);
  const project = await seedProject(db, { ownerId: user.id });
  const board = await seedBoard(db, { projectId: project.id, ownerId: user.id });
  const column = await seedColumn(db, { boardId: board.id, position: 1 });
  return { user, caller, project, board, column };
}

describe("labels", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await newTestDb();
  });
  afterEach(async () => {
    await db.destroy();
  });

  it("creates a label on a board (edit)", async () => {
    const { caller, board } = await ownerBoardCol(db);
    const label = await caller.labels.create({
      boardId: board.id,
      name: "Bug",
      color: "#eb5a46",
    });
    expect(label.name).toBe("Bug");
    const list = await caller.labels.list({ boardId: board.id });
    expect(list).toHaveLength(1);
  });

  it("forbids a view-only grantee from creating a label", async () => {
    const owner = await seedUser(db, { email: "o@example.com", verified: true });
    const viewer = await seedUser(db, { email: "v@example.com", verified: true });
    const project = await seedProject(db, { ownerId: owner.id });
    const board = await seedBoard(db, { projectId: project.id, ownerId: owner.id });
    await seedBoardAccess(db, board.id, viewer.id, ProjectPermission.View);
    await expect(
      authedCaller(db, viewer.id).labels.create({
        boardId: board.id,
        name: "X",
        color: "#0079bf",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("listing labels on an inaccessible board -> NOT_FOUND", async () => {
    const { board } = await ownerBoardCol(db);
    const { caller: stranger } = await seedUserCaller(db, "x@example.com");
    await expect(
      stranger.labels.list({ boardId: board.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("update and delete require edit; delete cascades card_labels", async () => {
    const { caller, board, column } = await ownerBoardCol(db);
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    const label = await caller.labels.create({
      boardId: board.id,
      name: "L",
      color: "#61bd4f",
    });
    await caller.labels.attach({ cardId: card.id, labelId: label.id });
    const updated = await caller.labels.update({ id: label.id, name: "L2" });
    expect(updated.name).toBe("L2");
    await caller.labels.delete({ id: label.id });
    const data = await caller.boards.getData({ id: board.id });
    expect(data.columns[0].cards[0].labels).toHaveLength(0);
  });

  it("attach and detach a label; reflected in card payload", async () => {
    const { caller, board, column } = await ownerBoardCol(db);
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    const label = await caller.labels.create({
      boardId: board.id,
      name: "L",
      color: "#61bd4f",
    });
    const after = await caller.labels.attach({ cardId: card.id, labelId: label.id });
    expect(after).toHaveLength(1);
    const data = await caller.boards.getData({ id: board.id });
    expect(data.columns[0].cards[0].labels[0].id).toBe(label.id);
    await caller.labels.detach({ cardId: card.id, labelId: label.id });
    const data2 = await caller.boards.getData({ id: board.id });
    expect(data2.columns[0].cards[0].labels).toHaveLength(0);
  });

  it("attach a label from a different board -> LABEL_BOARD_MISMATCH", async () => {
    const { user, caller, column } = await ownerBoardCol(db);
    const project2 = await seedProject(db, { ownerId: user.id, name: "P2" });
    const board2 = await seedBoard(db, { projectId: project2.id, ownerId: user.id });
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    const otherLabel = await caller.labels.create({
      boardId: board2.id,
      name: "X",
      color: "#0079bf",
    });
    await expect(
      caller.labels.attach({ cardId: card.id, labelId: otherLabel.id }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: LabelError.LABEL_BOARD_MISMATCH,
    });
  });

  it("attach on a card under an inaccessible board -> NOT_FOUND", async () => {
    const { caller, board, column } = await ownerBoardCol(db);
    const card = await caller.cards.create({ columnId: column.id, title: "A" });
    const label = await caller.labels.create({
      boardId: board.id,
      name: "L",
      color: "#61bd4f",
    });
    const { caller: stranger } = await seedUserCaller(db, "x@example.com");
    await expect(
      stranger.labels.attach({ cardId: card.id, labelId: label.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
