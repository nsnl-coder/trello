import type { Kysely } from "kysely";
import type { Database } from "../../db/types.js";

export type Db = Kysely<Database>;

export function createCard(
  db: Db,
  input: {
    columnId: string;
    title: string;
    description: string | null;
    position: number;
  },
) {
  return db
    .insertInto("cards")
    .values({
      column_id: input.columnId,
      title: input.title,
      description: input.description,
      position: input.position,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
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

export function listByColumn(db: Db, columnId: string) {
  return db
    .selectFrom("cards")
    .selectAll()
    .where("column_id", "=", columnId)
    .orderBy("position", "asc")
    .execute();
}

export function updateCard(
  db: Db,
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    due_at?: Date | null;
    reminder_minutes?: number | null;
    reminder_sent_at?: Date | null;
  },
) {
  return db
    .updateTable("cards")
    .set({ ...patch, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export function listDueCards(db: Db, boardId: string, from: Date, to: Date) {
  return db
    .selectFrom("cards")
    .innerJoin("columns", "columns.id", "cards.column_id")
    .selectAll("cards")
    .where("columns.board_id", "=", boardId)
    // due_at >= from already excludes nulls; an explicit IS NOT NULL with a
    // range on the same column trips a pg-mem planner bug, so omit it.
    .where("cards.due_at", ">=", from)
    .where("cards.due_at", "<=", to)
    .orderBy("cards.due_at", "asc")
    .execute();
}

// Cards whose reminder is due now and not yet sent (worker scan).
export function findDueForReminder(db: Db, now: Date) {
  return db
    .selectFrom("cards")
    .selectAll()
    // due_at >= now already excludes nulls (see listDueCards note).
    .where("reminder_minutes", "is not", null)
    .where("reminder_sent_at", "is", null)
    .where("due_at", ">=", now)
    .execute();
}

export function stampReminderSent(db: Db, id: string, at: Date) {
  return db
    .updateTable("cards")
    .set({ reminder_sent_at: at })
    .where("id", "=", id)
    .execute();
}

export function setPosition(
  db: Db,
  id: string,
  columnId: string,
  position: number,
) {
  return db
    .updateTable("cards")
    .set({ column_id: columnId, position, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export function deleteCard(db: Db, id: string) {
  return db.deleteFrom("cards").where("id", "=", id).execute();
}

export async function maxPosition(db: Db, columnId: string): Promise<number> {
  const row = await db
    .selectFrom("cards")
    .select((eb) => eb.fn.max("position").as("m"))
    .where("column_id", "=", columnId)
    .executeTakeFirst();
  return row?.m ?? 0;
}
