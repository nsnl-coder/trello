import {
  authedCaller,
  newTestDb,
  seedBoard,
  seedBoardAccess,
  seedCard,
  seedColumn,
  seedProject,
  seedUser,
  seedUserCaller,
  superuserCaller,
  type TestDb,
} from "../../board/test/helpers.js";

export {
  authedCaller,
  newTestDb,
  seedBoard,
  seedBoardAccess,
  seedCard,
  seedColumn,
  seedProject,
  seedUser,
  seedUserCaller,
  superuserCaller,
  type TestDb,
};

export async function seedChecklist(
  db: TestDb,
  opts: { cardId: string; title?: string; position: number },
) {
  return db
    .insertInto("checklists")
    .values({
      card_id: opts.cardId,
      title: opts.title ?? "Checklist",
      position: opts.position,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function seedChecklistItem(
  db: TestDb,
  opts: {
    checklistId: string;
    text?: string;
    isDone?: boolean;
    position: number;
  },
) {
  return db
    .insertInto("checklist_items")
    .values({
      checklist_id: opts.checklistId,
      text: opts.text ?? "Item",
      is_done: opts.isDone ?? false,
      position: opts.position,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

// owner + project + board + column + card in one call.
export async function ownerCard(db: TestDb, email = "owner@example.com") {
  const { user, caller } = await seedUserCaller(db, email);
  const project = await seedProject(db, { ownerId: user.id });
  const board = await seedBoard(db, { projectId: project.id, ownerId: user.id });
  const column = await seedColumn(db, { boardId: board.id, position: 1 });
  const card = await seedCard(db, { columnId: column.id, position: 1 });
  return { user, caller, project, board, column, card };
}
