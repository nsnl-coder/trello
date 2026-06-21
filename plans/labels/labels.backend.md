# Labels / Tags — Backend Plan

Colored labels defined per **board**, attached to many cards (many-to-many).
Board view can filter cards by label. Permission is inherited through the card
chain: label belongs to a board -> reuse board effective permission
(`view` to read, `edit` to mutate, see `plans/boards/boards.backend.md`).

Mirror `features/card` patterns: `*.router.ts` / `*.service.ts` / `*.repo.ts`
+ `test/<endpoint>.spec.ts`, Kysely, tRPC `protectedProcedure`, Zod from
`shared`, OpenAPI `.meta`.

## API endpoints
- [x] `GET /labels?boardId=` — list a board's labels (board `view`)
- [x] `POST /labels` — create label `{boardId, name, color}` (board `edit`)
- [x] `PATCH /labels/{id}` — update name/color (board `edit`)
- [x] `DELETE /labels/{id}` — delete label, cascade card links (board `edit`)
- [x] `PUT /cards/{cardId}/labels/{labelId}` — attach label to card (board `edit`)
- [x] `DELETE /cards/{cardId}/labels/{labelId}` — detach label (board `edit`)

## 1. Database (migrations + db types)
- [x] `migrations/009.label.ts` — `labels` table: `id uuid pk`,
  `board_id uuid fk boards.id cascade`, `name text notnull`,
  `color text notnull`, `created_at/updated_at timestamptz default now()`.
  Index on `board_id`.
- [x] same migration — `card_labels` join: `card_id uuid fk cards.id cascade`,
  `label_id uuid fk labels.id cascade`, pk `(card_id, label_id)`,
  index on `label_id`.
- [x] `db/types.ts` — add `LabelsTable`, `CardLabelsTable`; register in
  `Database` interface.
- [x] migration spec — up creates tables+indexes; down drops them; deleting a
  board cascades labels + card_labels; deleting a label removes its card links.

## 2. Shared schemas + errors (`packages/shared`)
- [x] `src/label.schema.ts` — constants (`LABEL_NAME_MAX`, allowed color set);
  `createLabelInput` (boardId, name, color), `updateLabelInput`
  (name?/color?), `listLabelsInput` (boardId), `labelSchema`
  (id, boardId, name, color, timestamps), `cardLabelInput` (cardId, labelId).
- [x] `src/card.schema.ts` — extend `cardSchema` / `boardDataSchema` card
  payload with `labels: labelSchema[]`.
- [x] `src/errors/label.error.ts` — `LabelError`: `FORBIDDEN`,
  `LABEL_NOT_FOUND`, `CARD_NOT_FOUND`, `BOARD_NOT_FOUND`,
  `LABEL_BOARD_MISMATCH` (card + label on different boards).
- [x] `src/index.ts` — export new schema + error modules.
- [x] add board filter input: `listBoardsData`/`getBoardData` accept optional
  `labelIds[]` to filter cards (or filter client-side; see frontend plan).

## 3. Label feature (`features/label`)
- [x] `label.repo.ts` — `createLabel`, `findLabelById`, `listByBoard`,
  `updateLabel`, `deleteLabel`; `attachLabel`, `detachLabel`,
  `listLabelsForCard`, `listLabelsForBoardCards` (batch for getData).
- [x] `label.service.ts` — resolve board via `label.board_id` (and via
  `card.column_id -> column.board_id` for attach/detach); enforce
  `edit`/`view`; validate label + card share a board on attach.
- [x] `label.router.ts` — `list`, `create`, `update`, `delete`, `attach`,
  `detach` with OpenAPI meta; register `labelsRouter` as `labels` in
  `trpc/router.ts`.
- [x] `features/board` getData — include each card's labels (batch query, no
  N+1).

## 4. Tests (pg-mem, mirror `features/card/test`)
- [x] create label on board (edit); view-only -> FORBIDDEN.
- [x] list labels for a board ordered; board not viewable -> NOT_FOUND.
- [x] update/delete label require edit; delete cascades card_labels.
- [x] attach label to card -> appears in card payload; detach removes it.
- [x] attach label from a different board -> LABEL_BOARD_MISMATCH.
- [x] attach to card on inaccessible board -> NOT_FOUND.
- [x] getData returns each card's labels (no N+1; assert one batch query).
- [x] migration up/down + cascade specs.

## 5. Verify
- [x] `pnpm --filter shared build`
- [x] `pnpm --filter backend test` green
- [x] Swagger shows new `/labels` + card label routes.
