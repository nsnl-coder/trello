import type { Kysely } from "kysely";
import { ActivityType } from "shared";
import type { Database } from "../../db/types.js";

export type Db = Kysely<Database>;

// Non-archived columns of a board, left-to-right.
export function listColumns(db: Db, boardId: string) {
  return db
    .selectFrom("columns")
    .select(["id", "name", "position"])
    .where("board_id", "=", boardId)
    .where("archived_at", "is", null)
    .orderBy("position", "asc")
    .execute();
}

// Non-archived cards in non-archived columns of a board.
export function listCards(db: Db, boardId: string) {
  return db
    .selectFrom("cards")
    .innerJoin("columns", "columns.id", "cards.column_id")
    .select([
      "cards.id as id",
      "cards.column_id as column_id",
      "cards.due_at as due_at",
      "cards.created_at as created_at",
    ])
    .where("columns.board_id", "=", boardId)
    .where("cards.archived_at", "is", null)
    .where("columns.archived_at", "is", null)
    .execute();
}

// CARD_MOVED audit rows for a board; toColumn name lives in meta (jsonb).
export function listCardMoved(db: Db, boardId: string) {
  return db
    .selectFrom("activities")
    .select(["card_id", "meta", "created_at"])
    .where("board_id", "=", boardId)
    .where("type", "=", ActivityType.CARD_MOVED)
    .execute();
}
