import type { Kysely } from "kysely";
import type { Database } from "../../db/types.js";

export type Db = Kysely<Database>;

export function findCardById(db: Db, id: string) {
  return db.selectFrom("cards").selectAll().where("id", "=", id).executeTakeFirst();
}

export function findColumnById(db: Db, id: string) {
  return db.selectFrom("columns").selectAll().where("id", "=", id).executeTakeFirst();
}

export function createChecklist(
  db: Db,
  input: { cardId: string; title: string; position: number },
) {
  return db
    .insertInto("checklists")
    .values({
      card_id: input.cardId,
      title: input.title,
      position: input.position,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findChecklistById(db: Db, id: string) {
  return db
    .selectFrom("checklists")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export function listByCard(db: Db, cardId: string) {
  return db
    .selectFrom("checklists")
    .selectAll()
    .where("card_id", "=", cardId)
    .orderBy("position", "asc")
    .execute();
}

export function listItemsForChecklists(db: Db, checklistIds: string[]) {
  if (checklistIds.length === 0) return Promise.resolve([]);
  return db
    .selectFrom("checklist_items")
    .selectAll()
    .where("checklist_id", "in", checklistIds)
    .orderBy("position", "asc")
    .execute();
}

export function updateChecklist(db: Db, id: string, patch: { title?: string }) {
  return db
    .updateTable("checklists")
    .set({ ...patch, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export function deleteChecklist(db: Db, id: string) {
  return db.deleteFrom("checklists").where("id", "=", id).execute();
}

export async function maxChecklistPosition(
  db: Db,
  cardId: string,
): Promise<number> {
  const row = await db
    .selectFrom("checklists")
    .select((eb) => eb.fn.max("position").as("m"))
    .where("card_id", "=", cardId)
    .executeTakeFirst();
  return row?.m ?? 0;
}

export function createItem(
  db: Db,
  input: { checklistId: string; text: string; position: number },
) {
  return db
    .insertInto("checklist_items")
    .values({
      checklist_id: input.checklistId,
      text: input.text,
      position: input.position,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findItemById(db: Db, id: string) {
  return db
    .selectFrom("checklist_items")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export function listItemsByChecklist(db: Db, checklistId: string) {
  return db
    .selectFrom("checklist_items")
    .selectAll()
    .where("checklist_id", "=", checklistId)
    .orderBy("position", "asc")
    .execute();
}

export function updateItem(
  db: Db,
  id: string,
  patch: { text?: string; is_done?: boolean },
) {
  return db
    .updateTable("checklist_items")
    .set({ ...patch, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export function setItemPosition(db: Db, id: string, position: number) {
  return db
    .updateTable("checklist_items")
    .set({ position, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export function deleteItem(db: Db, id: string) {
  return db.deleteFrom("checklist_items").where("id", "=", id).execute();
}

export async function maxItemPosition(
  db: Db,
  checklistId: string,
): Promise<number> {
  const row = await db
    .selectFrom("checklist_items")
    .select((eb) => eb.fn.max("position").as("m"))
    .where("checklist_id", "=", checklistId)
    .executeTakeFirst();
  return row?.m ?? 0;
}

// Batch progress (done/total) for a set of cards, for board getData (no N+1).
export async function progressForCards(
  db: Db,
  cardIds: string[],
): Promise<Map<string, { done: number; total: number }>> {
  const out = new Map<string, { done: number; total: number }>();
  if (cardIds.length === 0) return out;
  const rows = await db
    .selectFrom("checklist_items")
    .innerJoin("checklists", "checklists.id", "checklist_items.checklist_id")
    .select(["checklists.card_id as card_id", "checklist_items.is_done as is_done"])
    .where("checklists.card_id", "in", cardIds)
    .execute();
  for (const r of rows as { card_id: string; is_done: boolean }[]) {
    const cur = out.get(r.card_id) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (r.is_done) cur.done += 1;
    out.set(r.card_id, cur);
  }
  return out;
}
