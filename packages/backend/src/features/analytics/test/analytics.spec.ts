import { ActivityType, BoardError } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authedCaller,
  newTestDb,
  seedBoard,
  seedCard,
  seedColumn,
  seedProject,
  seedUserCaller,
  type TestDb,
} from "../../board/test/helpers.js";

const DAY = 24 * 60 * 60 * 1000;

async function setup(db: TestDb) {
  const { user, caller } = await seedUserCaller(db, "owner@example.com");
  const project = await seedProject(db, { ownerId: user.id });
  const board = await seedBoard(db, { projectId: project.id, ownerId: user.id });
  const todo = await seedColumn(db, { boardId: board.id, name: "Todo", position: 1 });
  const done = await seedColumn(db, { boardId: board.id, name: "Done", position: 2 });
  return { user, caller, board, todo, done };
}

async function setCreatedAt(db: TestDb, cardId: string, at: Date) {
  await db.updateTable("cards").set({ created_at: at }).where("id", "=", cardId).execute();
}

async function recordMove(
  db: TestDb,
  boardId: string,
  cardId: string,
  toColumn: string,
  at: Date,
) {
  await db
    .insertInto("activities")
    .values({
      board_id: boardId,
      card_id: cardId,
      actor_id: null,
      type: ActivityType.CARD_MOVED,
      meta: JSON.stringify({ fromColumn: "Todo", toColumn }),
      created_at: at,
    })
    .execute();
}

describe("analytics", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await newTestDb();
  });
  afterEach(async () => {
    await db.destroy();
  });

  it("cardsPerColumn + totalCards", async () => {
    const { caller, board, todo, done } = await setup(db);
    await seedCard(db, { columnId: todo.id, position: 1 });
    await seedCard(db, { columnId: todo.id, position: 2 });
    await seedCard(db, { columnId: done.id, position: 1 });
    const s = await caller.analytics.boardSummary({ boardId: board.id });
    expect(s.totalCards).toBe(3);
    expect(s.cardsPerColumn).toEqual([
      { columnId: todo.id, columnName: "Todo", count: 2 },
      { columnId: done.id, columnName: "Done", count: 1 },
    ]);
  });

  it("overdueCount excludes future due, archived, and the Done column", async () => {
    const { caller, board, todo, done } = await setup(db);
    const past = new Date(Date.now() - DAY);
    const future = new Date(Date.now() + DAY);
    await seedCard(db, { columnId: todo.id, position: 1, dueAt: past }); // overdue
    await seedCard(db, { columnId: todo.id, position: 2, dueAt: future }); // not
    await seedCard(db, { columnId: done.id, position: 1, dueAt: past }); // done, not
    await seedCard(db, { columnId: todo.id, position: 3, dueAt: past, archivedAt: new Date() });
    const s = await caller.analytics.boardSummary({ boardId: board.id });
    expect(s.overdueCount).toBe(1);
  });

  it("completed windows + avg cycle time from CARD_MOVED activity", async () => {
    const { caller, board, done } = await setup(db);
    const base = Date.now();
    const recent = await seedCard(db, { columnId: done.id, position: 1 });
    const old = await seedCard(db, { columnId: done.id, position: 2 });
    await setCreatedAt(db, recent.id, new Date(base - 10 * DAY));
    await setCreatedAt(db, old.id, new Date(base - 25 * DAY));
    await recordMove(db, board.id, recent.id, "Done", new Date(base - 2 * DAY));
    await recordMove(db, board.id, old.id, "Done", new Date(base - 20 * DAY));

    const s = await caller.analytics.boardSummary({ boardId: board.id });
    expect(s.completedLast7).toBe(1); // only the recent one
    expect(s.completedLast30).toBe(2);
    // recent cycle 8d, old cycle 5d -> avg 6.5d
    expect(s.avgCycleTimeDays).toBeCloseTo(6.5, 1);

    const ct = await caller.analytics.cycleTime({ boardId: board.id });
    expect(ct.sampleSize).toBe(2);
    expect(ct.avgDays).toBeCloseTo(6.5, 1);
  });

  it("avg cycle time is null when no card entered Done", async () => {
    const { caller, board, todo } = await setup(db);
    await seedCard(db, { columnId: todo.id, position: 1 });
    const s = await caller.analytics.boardSummary({ boardId: board.id });
    expect(s.avgCycleTimeMs).toBeNull();
    expect(s.avgCycleTimeDays).toBeNull();
  });

  it("non-viewer -> BOARD_NOT_FOUND (no existence leak)", async () => {
    const { board } = await setup(db);
    const { user: stranger } = await seedUserCaller(db, "x@example.com");
    await expect(
      authedCaller(db, stranger.id).analytics.boardSummary({ boardId: board.id }),
    ).rejects.toMatchObject({ message: BoardError.BOARD_NOT_FOUND });
  });
});
