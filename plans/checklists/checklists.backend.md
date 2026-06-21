# Checklists — Backend Plan

A card has many **checklists**; each checklist has many ordered **items** that
can be checked off. Card payload exposes a progress count (done/total).
Permission via the card chain (`card.column_id -> column.board_id`): `view` to
read, `edit` to mutate. Ordering uses `double precision position` like
columns/cards (new = max+1, move = midpoint).

Mirror `features/card` patterns.

## API endpoints
- [x] `POST /checklists` — create `{cardId, title}` (board `edit`)
- [x] `PATCH /checklists/{id}` — rename checklist (board `edit`)
- [x] `DELETE /checklists/{id}` — delete checklist + items (board `edit`)
- [x] `POST /checklist-items` — create `{checklistId, text}` (board `edit`)
- [x] `PATCH /checklist-items/{id}` — update text/done (board `edit`)
- [x] `DELETE /checklist-items/{id}` — delete item (board `edit`)
- [x] `POST /checklist-items/{id}/move` — reorder via beforeId/afterId (board `edit`)

## 1. Database (migrations + db types)
- [x] `migrations/011.checklist.ts` — `checklists` table: `id uuid pk`,
  `card_id uuid fk cards.id cascade`, `title text notnull`,
  `position double precision notnull`, timestamps. Index on `card_id`.
- [x] same migration — `checklist_items` table: `id uuid pk`,
  `checklist_id uuid fk checklists.id cascade`, `text text notnull`,
  `is_done boolean notnull default false`, `position double precision notnull`,
  timestamps. Index on `checklist_id`.
- [x] `db/types.ts` — add `ChecklistsTable`, `ChecklistItemsTable`; register in
  `Database`.
- [x] migration spec — up creates tables+indexes; down drops; deleting a card
  cascades checklists -> items; deleting a checklist cascades items.

## 2. Shared schemas + errors (`packages/shared`)
- [x] `src/checklist.schema.ts` — constants (`CHECKLIST_TITLE_MAX`,
  `CHECKLIST_ITEM_TEXT_MAX`); inputs `createChecklistInput` (cardId, title),
  `updateChecklistInput` (title), `createChecklistItemInput`
  (checklistId, text), `updateChecklistItemInput` (text?/isDone?),
  `moveChecklistItemInput` (id, beforeId?/afterId?); outputs `checklistSchema`
  (id, cardId, title, position, items[], timestamps), `checklistItemSchema`.
- [x] `src/card.schema.ts` — extend card payload with
  `checklistProgress: {done, total}` (computed in service).
- [x] `src/errors/checklist.error.ts` — `ChecklistError`: `FORBIDDEN`,
  `CHECKLIST_NOT_FOUND`, `ITEM_NOT_FOUND`, `CARD_NOT_FOUND`.
- [x] `src/index.ts` — export new schema + error modules.

## 3. Checklist feature (`features/checklist`)
- [x] `checklist.repo.ts` — `createChecklist`, `findChecklistById`,
  `listByCard` (with items), `updateChecklist`, `deleteChecklist`,
  `maxChecklistPosition(cardId)`; item ops `createItem`, `findItemById`,
  `updateItem`, `deleteItem`, `maxItemPosition(checklistId)`, neighbour
  lookups; `progressForCards(cardIds[])` batch for getData.
- [x] `checklist.service.ts` — resolve board via card chain; enforce
  `edit`/`view`; CRUD + `moveItem` (recompute position); compute progress.
- [x] `checklist.router.ts` — checklist + item endpoints with OpenAPI meta;
  register `checklistsRouter` (and item routes) in `trpc/router.ts`.
- [x] `features/board` getData — include card `checklistProgress` (batch, no
  N+1); single card fetch includes full checklists+items.

## 4. Tests (pg-mem, mirror `features/card/test`)
- [x] create checklist on card (edit); view-only -> FORBIDDEN.
- [x] list checklists with items ordered by position.
- [x] add/update/delete item; toggle `isDone` updates progress.
- [x] move item to start/middle/end yields correct order.
- [x] delete checklist cascades items; delete card cascades checklists.
- [x] progress = done/total; card payload reflects it (batch, no N+1).
- [x] ops on card under inaccessible board -> NOT_FOUND.
- [x] migration up/down + cascade specs.

## 5. Verify
- [x] `pnpm --filter shared build`
- [x] `pnpm --filter backend test` green
- [x] Swagger shows `/checklists` + `/checklist-items` routes.
