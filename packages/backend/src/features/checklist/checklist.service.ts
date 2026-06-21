import { TRPCError } from "@trpc/server";
import {
  type Checklist,
  ChecklistError,
  type ChecklistItem,
  type CreateChecklistInput,
  type CreateChecklistItemInput,
  type MoveChecklistItemInput,
  type UpdateChecklistInput,
  type UpdateChecklistItemInput,
} from "shared";
import type { CtxUser } from "../board/board.service.js";
import { loadBoardFor } from "../board/board.service.js";
import { computePosition } from "../column/column.service.js";
import * as repo from "./checklist.repo.js";
import type { Db } from "./checklist.repo.js";

type ChecklistRow = {
  id: string;
  card_id: string;
  title: string;
  position: number;
  created_at: Date;
  updated_at: Date;
};

type ItemRow = {
  id: string;
  checklist_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
};

type CardRow = { id: string; column_id: string };
type ColumnRow = { id: string; board_id: string };

function checklistNotFound() {
  return new TRPCError({
    code: "NOT_FOUND",
    message: ChecklistError.CHECKLIST_NOT_FOUND,
  });
}

function itemNotFound() {
  return new TRPCError({
    code: "NOT_FOUND",
    message: ChecklistError.ITEM_NOT_FOUND,
  });
}

function cardNotFound() {
  return new TRPCError({
    code: "NOT_FOUND",
    message: ChecklistError.CARD_NOT_FOUND,
  });
}

function toItem(row: ItemRow): ChecklistItem {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    text: row.text,
    isDone: row.is_done,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toChecklist(row: ChecklistRow, items: ItemRow[]): Checklist {
  return {
    id: row.id,
    cardId: row.card_id,
    title: row.title,
    position: row.position,
    items: items.map(toItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Resolve the board for a card and enforce permission. NOT_FOUND on an
// inaccessible board so existence does not leak.
async function enforceCard(
  db: Db,
  user: CtxUser,
  cardId: string,
  min: "view" | "edit",
): Promise<void> {
  const card = (await repo.findCardById(db, cardId)) as CardRow | undefined;
  if (!card) throw cardNotFound();
  const column = (await repo.findColumnById(db, card.column_id)) as
    | ColumnRow
    | undefined;
  if (!column) throw cardNotFound();
  try {
    await loadBoardFor(db, user, column.board_id, min);
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") throw cardNotFound();
    throw err;
  }
}

async function loadChecklistFor(
  db: Db,
  user: CtxUser,
  id: string,
  min: "view" | "edit",
): Promise<ChecklistRow> {
  const checklist = (await repo.findChecklistById(db, id)) as
    | ChecklistRow
    | undefined;
  if (!checklist) throw checklistNotFound();
  try {
    await enforceCard(db, user, checklist.card_id, min);
  } catch (err) {
    // Hide the checklist when its card/board is inaccessible.
    if (
      err instanceof TRPCError &&
      err.message === ChecklistError.CARD_NOT_FOUND
    ) {
      throw checklistNotFound();
    }
    throw err;
  }
  return checklist;
}

async function loadItemFor(
  db: Db,
  user: CtxUser,
  id: string,
  min: "view" | "edit",
): Promise<ItemRow> {
  const item = (await repo.findItemById(db, id)) as ItemRow | undefined;
  if (!item) throw itemNotFound();
  try {
    await loadChecklistFor(db, user, item.checklist_id, min);
  } catch (err) {
    if (
      err instanceof TRPCError &&
      err.message === ChecklistError.CHECKLIST_NOT_FOUND
    ) {
      throw itemNotFound();
    }
    throw err;
  }
  return item;
}

export async function listByCard(
  db: Db,
  user: CtxUser,
  cardId: string,
): Promise<Checklist[]> {
  await enforceCard(db, user, cardId, "view");
  const checklists = (await repo.listByCard(db, cardId)) as ChecklistRow[];
  if (checklists.length === 0) return [];
  const items = (await repo.listItemsForChecklists(
    db,
    checklists.map((c) => c.id),
  )) as ItemRow[];
  const byChecklist = new Map<string, ItemRow[]>();
  for (const c of checklists) byChecklist.set(c.id, []);
  for (const it of items) byChecklist.get(it.checklist_id)?.push(it);
  return checklists.map((c) => toChecklist(c, byChecklist.get(c.id) ?? []));
}

export async function createChecklist(
  db: Db,
  user: CtxUser,
  input: CreateChecklistInput,
): Promise<Checklist> {
  await enforceCard(db, user, input.cardId, "edit");
  const max = await repo.maxChecklistPosition(db, input.cardId);
  const row = await repo.createChecklist(db, {
    cardId: input.cardId,
    title: input.title,
    position: max + 1,
  });
  return toChecklist(row as ChecklistRow, []);
}

export async function updateChecklist(
  db: Db,
  user: CtxUser,
  id: string,
  patch: UpdateChecklistInput,
): Promise<Checklist> {
  await loadChecklistFor(db, user, id, "edit");
  const updated = await repo.updateChecklist(db, id, patch);
  if (!updated) throw checklistNotFound();
  const items = (await repo.listItemsByChecklist(db, id)) as ItemRow[];
  return toChecklist(updated as ChecklistRow, items);
}

export async function deleteChecklist(
  db: Db,
  user: CtxUser,
  id: string,
): Promise<{ ok: true }> {
  await loadChecklistFor(db, user, id, "edit");
  await repo.deleteChecklist(db, id);
  return { ok: true };
}

export async function createItem(
  db: Db,
  user: CtxUser,
  input: CreateChecklistItemInput,
): Promise<ChecklistItem> {
  await loadChecklistFor(db, user, input.checklistId, "edit");
  const max = await repo.maxItemPosition(db, input.checklistId);
  const row = await repo.createItem(db, {
    checklistId: input.checklistId,
    text: input.text,
    position: max + 1,
  });
  return toItem(row as ItemRow);
}

export async function updateItem(
  db: Db,
  user: CtxUser,
  id: string,
  patch: UpdateChecklistItemInput,
): Promise<ChecklistItem> {
  await loadItemFor(db, user, id, "edit");
  const updated = await repo.updateItem(db, id, {
    text: patch.text,
    is_done: patch.isDone,
  });
  if (!updated) throw itemNotFound();
  return toItem(updated as ItemRow);
}

export async function deleteItem(
  db: Db,
  user: CtxUser,
  id: string,
): Promise<{ ok: true }> {
  await loadItemFor(db, user, id, "edit");
  await repo.deleteItem(db, id);
  return { ok: true };
}

export async function moveItem(
  db: Db,
  user: CtxUser,
  id: string,
  input: MoveChecklistItemInput,
): Promise<ChecklistItem> {
  const item = await loadItemFor(db, user, id, "edit");
  const siblings = (await repo.listItemsByChecklist(
    db,
    item.checklist_id,
  )) as ItemRow[];
  const position = computePosition(
    siblings.filter((s) => s.id !== id),
    input.beforeId,
    input.afterId,
  );
  const updated = await repo.setItemPosition(db, id, position);
  if (!updated) throw itemNotFound();
  return toItem(updated as ItemRow);
}
