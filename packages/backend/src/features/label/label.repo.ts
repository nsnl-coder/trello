import type { Kysely } from "kysely";
import type { Database } from "../../db/types.js";

export type Db = Kysely<Database>;

export function createLabel(
  db: Db,
  input: { boardId: string; name: string; color: string },
) {
  return db
    .insertInto("labels")
    .values({
      board_id: input.boardId,
      name: input.name,
      color: input.color,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findLabelById(db: Db, id: string) {
  return db
    .selectFrom("labels")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export function listByBoard(db: Db, boardId: string) {
  return db
    .selectFrom("labels")
    .selectAll()
    .where("board_id", "=", boardId)
    .orderBy("created_at", "asc")
    .execute();
}

export function updateLabel(
  db: Db,
  id: string,
  patch: { name?: string; color?: string },
) {
  return db
    .updateTable("labels")
    .set({ ...patch, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export function deleteLabel(db: Db, id: string) {
  return db.deleteFrom("labels").where("id", "=", id).execute();
}

export function findCardById(db: Db, id: string) {
  return db
    .selectFrom("cards")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export function findColumnById(db: Db, id: string) {
  return db
    .selectFrom("columns")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function attachLabel(
  db: Db,
  cardId: string,
  labelId: string,
): Promise<void> {
  await db
    .insertInto("card_labels")
    .values({ card_id: cardId, label_id: labelId })
    .onConflict((oc) => oc.columns(["card_id", "label_id"]).doNothing())
    .execute();
}

export async function detachLabel(
  db: Db,
  cardId: string,
  labelId: string,
): Promise<void> {
  await db
    .deleteFrom("card_labels")
    .where("card_id", "=", cardId)
    .where("label_id", "=", labelId)
    .execute();
}

export function listLabelsForCard(db: Db, cardId: string) {
  return db
    .selectFrom("card_labels")
    .innerJoin("labels", "labels.id", "card_labels.label_id")
    .selectAll("labels")
    .where("card_labels.card_id", "=", cardId)
    .orderBy("labels.created_at", "asc")
    .execute();
}

// Batch: all label links for a set of cards (avoids N+1 in board getData).
export function listLabelsForCards(db: Db, cardIds: string[]) {
  if (cardIds.length === 0) return Promise.resolve([]);
  return db
    .selectFrom("card_labels")
    .innerJoin("labels", "labels.id", "card_labels.label_id")
    .select([
      "card_labels.card_id as card_id",
      "labels.id as id",
      "labels.board_id as board_id",
      "labels.name as name",
      "labels.color as color",
      "labels.created_at as created_at",
      "labels.updated_at as updated_at",
    ])
    .where("card_labels.card_id", "in", cardIds)
    .orderBy("labels.created_at", "asc")
    .execute();
}
