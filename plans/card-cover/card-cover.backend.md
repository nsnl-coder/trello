# Card Cover + Rich Description — Backend Plan

Two additive card features that share the existing card update path:

1. **Card cover** — a card may have a cover that is EITHER a solid color (from a
   small fixed palette) OR an image. The image case does NOT add a second upload
   path: the cover references an existing **image** attachment on the SAME card
   (reuse `features/attachment`). When that attachment is deleted, the cover must
   clear.
2. **Rich (Markdown) description** — `cards.description` stays a plain `text`
   column storing Markdown source. The backend change is essentially ZERO beyond
   keeping the existing `description` field; all rendering + sanitization is
   frontend (see `card-cover.frontend.md`). The only backend touch is documenting
   that `description` is now Markdown source and confirming `CARD_DESCRIPTION_MAX`
   (5000, `card.schema.ts:7`) still bounds it. No HTML is ever stored or rendered
   server-side.

Both cover fields are set through the EXISTING card update
(`cards.update` -> `card.service.updateCard`, `card.router.ts:34`), NOT a new
endpoint. JUSTIFICATION (decided): the cover is a property of the card edited in
the board editor exactly like `title`/`description`/`dueAt`/`reminderMinutes`,
which already flow through `updateCard`. A dedicated endpoint would duplicate the
card-chain permission load (`loadCardFor`) and the enrichment round-trip for no
benefit. The only extra work is validation (palette membership +
attachment-belongs-to-this-card + image-mime check), which fits cleanly inside
`updateCard`. So: NO new tRPC route; cover is part of `updateCardInput`.

Mirror `features/card` patterns (`*.service.ts` / `*.repo.ts` / `*.router.ts` +
`test/<endpoint>.spec.ts`), Kysely, tRPC `protectedProcedure`, Zod from `shared`,
OpenAPI `.meta`, superjson.

> Reuse `loadCardFor(db, user, id, "edit")` from `card.service.ts:58` (it loads
> card -> column -> board and enforces board `edit`, mapping board
> NOT_FOUND/FORBIDDEN to `CARD_NOT_FOUND` via `enforceBoard`,
> `card.service.ts:42-55`). The cover validation runs AFTER this load so a
> non-editor never learns whether the attachment exists.
> Reuse `attachmentRepo.findById(db, id)` (`attachment.repo.ts:44`) to validate
> the referenced attachment; do NOT reimplement attachment lookup. Cross-feature
> repo import is already accepted (`card.enrich.ts:5` imports `attachmentRepo`).

## Cover color-vs-image rules (DECIDED)

- The cover is modeled as TWO nullable columns: `cover_color text null` and
  `cover_attachment_id uuid null` (FK `attachments.id ON DELETE SET NULL`).
- They are **mutually exclusive**. A single update may set at most ONE of them.
  Setting one implicitly clears the other (server enforces this so the row can
  never hold both): if the patch sets `coverColor` to a non-null value, the
  service also writes `cover_attachment_id = null`; if the patch sets
  `coverAttachmentId` to a non-null value, the service also writes
  `cover_color = null`. If the patch tries to set BOTH to non-null in the same
  call -> `BAD_REQUEST` `COVER_CONFLICT` (no precedence guessing).
- Clearing the cover entirely: send `coverColor: null` (or `coverAttachmentId:
  null`) explicitly; both columns end null. A patch that omits both fields leaves
  the cover untouched (tri-state `undefined` = no change, `null` = clear, value =
  set — mirrors the existing `description`/`dueAt` tri-state in `updateCard`,
  `card.service.ts:108-117`).
- `coverColor` must be a member of the shared palette enum (`COVER_COLORS`) else
  `BAD_REQUEST` `INVALID_COVER_COLOR` (zod `z.enum(COVER_COLORS)` is the gate at
  the router boundary).
- `coverAttachmentId` must reference an attachment that (a) exists, (b) belongs to
  the SAME card being updated (`attachment.card_id === cardId`), and (c) has an
  image MIME type (`mime_type` is in the shared `COVER_IMAGE_MIME` set —
  png/jpeg/gif/webp; SVG is already excluded from `ATTACHMENT_ALLOWED_MIME`
  `attachment.schema.ts:7-8` so it can never be a cover). Failing (a)/(b) ->
  `COVER_ATTACHMENT_NOT_FOUND` (same error for missing and wrong-card, no
  existence leak across cards); failing (c) -> `COVER_NOT_IMAGE`.

## Cover-cleared-on-attachment-delete (DECIDED)

The FK is the prod source of truth; a service-level test asserts the invariant.

- **DB**: `cards.cover_attachment_id` FK -> `attachments.id` `ON DELETE SET
  NULL`. When an attachment row is deleted (directly via `attachments.delete`),
  Postgres auto-nulls any `cover_attachment_id` pointing at it. This makes the
  invariant hold even for paths that bypass the service.
- **Cascade-ordering check (VERIFIED, no conflict)**: deleting a CARD cascades
  its attachment rows (013 `attachments.card_id ON DELETE cascade`,
  `013.attachment.ts:7-9`). The deleted card's own `cover_attachment_id` column
  disappears with the row, so the SET NULL on it is moot — there is NO ordering
  conflict between the cascade and the SET NULL. The only live SET NULL path is a
  DIRECT attachment delete while the card survives.
- **Service note**: `attachment.service.deleteAttachment` (`attachment.service.ts:155`)
  needs NO code change for the clear itself IF the FK action is honored by the
  engine. Add a doc comment that deleting a cover attachment auto-clears the
  cover via the FK.
- **pg-mem caveat + safety net (see migration task)**: pg-mem's FK-action
  support is partial. The migration spec must verify pg-mem honors SET NULL. IF
  it does NOT, add an explicit service-layer clear as a belt-and-suspenders so
  the invariant is testable and engine-independent: a
  `cardRepo.clearCoverForAttachment(db, attachmentId)` (`update cards set
  cover_attachment_id = null where cover_attachment_id = ?`) called inside
  `deleteAttachment` right before `repo.deleteById`. This is CONDITIONAL on the
  pg-mem finding — do not add the coupling if SET NULL is honored.

## API endpoints
- [x] `PATCH /cards/{id}` — EXISTING `cards.update`; extended input now also accepts `coverColor?: string|null` and `coverAttachmentId?: string|null` (mutually exclusive, validated); returns the enriched `cardSchema` incl. `cover` (board `edit`). NO new endpoint.

## 1. Database (migration + db types)
- [x] `migrations/015.card-cover.ts` (next free number is 015; highest existing is
  014.assignee) — mirror `010.card-due-date.ts` ALTER style. `ALTER TABLE cards`:
  add `cover_color` `text` (nullable); add `cover_attachment_id` `uuid` (nullable)
  with `(c) => c.references("attachments.id").onDelete("set null")` (matching the
  013 FK style). NO data backfill. `down` drops both columns
  (`alterTable("cards").dropColumn("cover_attachment_id").dropColumn("cover_color")`
  — drop the FK column first). Use `Kysely<any>` signature like every other
  migration; `sql` import only if needed (not needed here).
- [x] `db/types.ts` — extend `CardsTable` (`db/types.ts:120-131`) with
  `cover_color: string | null` and `cover_attachment_id: string | null`. PLAIN
  nullable strings (text + uuid), NO `Generated`, NO `Timestamp` — mirror
  `description: string | null` at line 124.
- [x] migration spec `migrations/015.card-cover.spec.ts` (LIVES IN
  `src/migrations/`, mirror `014.assignee.spec.ts`): pg-mem + register
  `gen_random_uuid`; run the prior `up`s the FK chain needs — `up001` (auth),
  `up003` (project), `up004` (board), `up005` (column), `up006` (card), `up013`
  (attachment), then `up` (015). NOTE: `up002` (rbac) is NOT required — the
  established `014.assignee.spec.ts:6-11` skips it. Assert: up adds both columns;
  a card row inserts with both null and with each set; setting
  `cover_attachment_id` to a real attachment id works; DELETING that attachment
  sets the card's `cover_attachment_id` back to NULL (the ON DELETE SET NULL
  behavior — THE key assertion); `down` drops both columns. NOTE pg-mem caveat:
  if pg-mem does NOT honor `ON DELETE SET NULL`, mark the SET-NULL assertion as
  covered by the service test instead (see task 4 / the attachment-delete test)
  AND adopt the conditional service-layer clear (see
  "Cover-cleared-on-attachment-delete"). State the deviation in the spec comment.

## 2. Test-harness wiring (REQUIRED — do not skip; BLOCKER)
- [x] `features/auth/test/helpers.ts` — `newTestDb` hardcodes `up001..up014`
  (`helpers.ts:10-23` imports, `41-54` calls). Import `up as up015` from
  `../../../migrations/015.card-cover.js` and call `await up015(db)` after
  `up014` (line 54). WITHOUT this the test DB has no cover columns and every
  cover test fails. (No `EmailPort`/`SentEmail` change — covers send no email.)

## 3. Shared schemas + errors (`packages/shared`)
- [x] `src/card.schema.ts`:
  - add palette constant `COVER_COLORS` — a fixed `as const` string tuple, e.g.
    `["slate","red","orange","amber","green","teal","blue","indigo","violet","pink"]`
    (10 swatches; values are palette KEYS, the frontend maps key -> Tailwind class
    so the stored value is stable). Export `type CoverColor =
    (typeof COVER_COLORS)[number]`. Add `coverColorSchema = z.enum(COVER_COLORS)`.
  - add `COVER_IMAGE_MIME` `as const` = `["image/png","image/jpeg","image/gif",
    "image/webp"]`. DECIDED: DUPLICATE the 4 literals here (do NOT import from
    `attachment.schema.js`) to keep `card.schema` self-contained and avoid a
    cross-schema coupling — add a comment pointing at `ATTACHMENT_ALLOWED_MIME`
    (`attachment.schema.ts:9-22`) as the source of truth and noting SVG is
    intentionally excluded there.
  - extend `updateCardInput` (`card.schema.ts:19-24`): add
    `coverColor: coverColorSchema.nullable().optional()` and
    `coverAttachmentId: z.string().nullable().optional()` (tri-state, matching the
    existing `description`/`dueAt` nullable-optional pattern, lines 21-22). Do NOT
    add cover to `createCardInput` (cover is set after creation).
  - add `cardCoverSchema` to represent the resolved cover in the card payload — a
    discriminated union:
    `z.discriminatedUnion("type", [ z.object({ type: z.literal("color"), color: coverColorSchema }), z.object({ type: z.literal("image"), attachmentId: z.string(), downloadUrl: z.string() }) ])`.
    Export `type CardCover = z.infer<typeof cardCoverSchema>`. (DECIDED: tagged
    union not loose nullable fields, so the frontend renders without re-deriving
    the case and the image `downloadUrl` is resolved server-side.)
  - extend `cardSchema` (`card.schema.ts:47-63`) with
    `cover: cardCoverSchema.nullable()` (place alongside `labels`/`assignees`,
    lines 56-57). `cardSchema` is the single card shape `boardDataSchema` reuses,
    so the kanban payload picks it up automatically.
  - add one comment on `descriptionSchema` (`card.schema.ts:10`) noting the value
    is now Markdown SOURCE (still bounded by `CARD_DESCRIPTION_MAX`); no schema
    change — it stays a plain trimmed string. Sanitization is a frontend render
    concern; raw Markdown text in the DB is harmless (never executed server-side).
- [x] `src/errors/card-cover.error.ts` — `CardCoverError` const object (mirror
  `errors/assignee.error.ts` `as const` + type export) with all 6 codes:
  `INVALID_COVER_COLOR`, `COVER_ATTACHMENT_NOT_FOUND`, `COVER_NOT_IMAGE`,
  `COVER_CONFLICT`, `CARD_NOT_FOUND`, `FORBIDDEN`. DECIDED: include
  `CARD_NOT_FOUND`/`FORBIDDEN` here (string values identical to
  `BoardError.CARD_NOT_FOUND`/`FORBIDDEN`) so the frontend error map is
  self-contained, mirroring `AssigneeError` (`errors/assignee.error.ts:1-7`). The
  service still THROWS `BoardError.CARD_NOT_FOUND` via `loadCardFor`; the string
  matches so the frontend map keyed on the string still resolves.
- [x] `src/index.ts` — add `export * from "./errors/card-cover.error.js";`
  (the barrel exports each file explicitly; it does NOT auto-discover,
  `index.ts:1-25`). `card.schema.js` is already exported (line 5), so the new
  `COVER_COLORS`/`cardCoverSchema`/`CardCover` ride along.
- [x] `pnpm --filter shared build` so backend + frontend pick up the new types.

## 4. Card feature (`features/card`)
- [x] `attachment.repo.ts` — ADD `findByIds` (REQUIRED; it does NOT exist today).
  Signature: `findByIds(db: Db, ids: string[]): Promise<Map<string, AttachmentRow>>`.
  Mirror `countByCards` (`attachment.repo.ts:71-84`): empty-input guard
  (`if (ids.length === 0) return new Map()`), `selectAll().where("id", "in", ids)`,
  build the `Map` keyed by `id`. This is the batch helper the enrichment depends
  on; without it the no-N+1 test (`findByIds` spy) cannot pass.
- [x] `card.enrich.ts` — resolve the cover with NO N+1:
  - `CardRow` (`card.enrich.ts:9-19`) gains `cover_color: string | null` and
    `cover_attachment_id: string | null` (this single exported type is reused by
    `card.service.ts` via the import at line 15; widening it covers both;
    `selectAll` returns the columns once they exist).
  - In `enrichCards` (`card.enrich.ts:26`), AFTER computing `ids`, collect the
    unique non-null `cover_attachment_id`s across the batch and fetch them in ONE
    query via `attachmentRepo.findByIds(db, attachmentIds)`. Do NOT call
    `findById` per card. If the unique list is empty, the empty-input guard
    short-circuits (zero queries for color-only / no-cover boards).
  - build `cover` per row in the `rows.map` (`card.enrich.ts:55`):
    - if `r.cover_color != null` -> `{ type: "color", color: r.cover_color }`.
    - else if `r.cover_attachment_id != null` -> look up in the Map; if present
      AND `mime_type` is in `COVER_IMAGE_MIME` (or `startsWith("image/")`) ->
      `{ type: "image", attachmentId: att.id, downloadUrl: '/api/attachments/' + att.id + '/download' }`
      (same URL shape as `attachment.service.toAttachment`, `attachment.service.ts:65`);
      if missing from the Map (raced delete) or not an image -> `cover: null`
      (defensive; FK SET NULL normally prevents the missing case).
    - else -> `cover: null`.
  - include `cover` in the mapped `Card` object. Color covers add ZERO queries;
    image covers add exactly ONE batched query for the whole board.
- [x] `card.repo.ts` — `updateCard` (`card.repo.ts:52-69`) patch type gains
  `cover_color?: string | null` and `cover_attachment_id?: string | null`; the
  existing `.set({ ...patch, updated_at })` (line 65) already forwards them.
  `returningAll` returns the new columns. No other repo change.
  - IF the I7 pg-mem finding requires it: ADD
    `clearCoverForAttachment(db, attachmentId)` (`updateTable("cards").set({
    cover_attachment_id: null }).where("cover_attachment_id", "=", attachmentId)`).
- [x] `card.service.ts` `updateCard` (`card.service.ts:94-121`):
  - keep the existing `loadCardFor(db, user, id, "edit")` first (line 100).
  - widen the local `dbPatch` type (lines 101-107) to add
    `cover_color?: string | null` and `cover_attachment_id?: string | null`.
  - after the existing title/description/due/reminder mapping (lines 108-117), add
    cover handling (inline or a small `applyCoverPatch(cardId, patch, dbPatch)`
    helper — note it must be `async` because it queries the attachment):
    - `hasColor = patch.coverColor != null` (non-null).
    - `hasImage = patch.coverAttachmentId != null` (non-null).
    - if `hasColor && hasImage` -> throw `COVER_CONFLICT` (`BAD_REQUEST`).
    - if `patch.coverColor !== undefined`: on a non-null color set
      `dbPatch.cover_color = value` AND `dbPatch.cover_attachment_id = null`
      (clear the other side). On `null`: set `dbPatch.cover_color = null`. (zod
      already guarantees membership; re-assert only as documentation.)
    - if `patch.coverAttachmentId !== undefined`: on a non-null id, fetch
      `attachmentRepo.findById(db, id)`; if missing OR `att.card_id !== cardId`
      -> `COVER_ATTACHMENT_NOT_FOUND` (`NOT_FOUND`); if `mime_type` not in
      `COVER_IMAGE_MIME` -> `COVER_NOT_IMAGE` (`BAD_REQUEST`); then set
      `dbPatch.cover_attachment_id = id` AND `dbPatch.cover_color = null`. On
      `null`: set `dbPatch.cover_attachment_id = null`.
  - throw cover errors as `TRPCError` using a small local `err(code, status)`
    helper mirroring `attachment.service.err` (`attachment.service.ts:25-27`):
    `BAD_REQUEST` for color/conflict/not-image, `NOT_FOUND` for
    `COVER_ATTACHMENT_NOT_FOUND`. Use the `CardCoverError` constants for messages.
  - the existing `repo.updateCard(db, id, dbPatch)` + `enrichCard` tail
    (lines 118-120) is reused unchanged; the enriched result now carries `cover`.
- [x] `card.router.ts` — NO change to route wiring: `update` already merges
  `updateCardInput` (`card.router.ts:36`), so the new cover fields flow through
  once the shared schema is extended. Optionally append "(cover, markdown desc)"
  to the OpenAPI summary (`card.router.ts:35`).
- [x] `attachment.service.deleteAttachment` — NO functional change required (FK
  ON DELETE SET NULL clears the cover) UNLESS the I7 pg-mem finding forces the
  service-layer clear. Add a doc comment that deleting a cover attachment
  auto-clears the cover via the FK.

## 5. Tests (pg-mem, mirror `features/card/test` + `features/attachment/test`)
Reuse `seedBoard`/`seedColumn`/`seedCard`/`seedUser`/`seedUserCaller`/
`seedProject`/`fakeStorage` from `features/attachment/test/helpers`
(`enrich.spec.ts:6-16` shows the exact set). Cover tests need a seeded attachment
ROW on the card — create it via `createAttachment` with `fakeStorage` (mirror
`enrich.spec.ts:39-50`) or insert the row directly; the cover validation only
reads `card_id` + `mime_type`, no live MinIO needed.

### set cover color
- [x] editor sets `coverColor` to a valid palette key -> card payload `cover` is
  `{ type: "color", color }`; `cover_attachment_id` stays null.
- [x] setting `coverColor` to an invalid value -> zod rejects at the router
  (assert the error surfaces; `INVALID_COVER_COLOR` is the user-facing code).
- [x] setting a color when an image cover already exists CLEARS the image:
  `cover_attachment_id` becomes null, `cover` is `{ type: "color", ... }`.

### set cover image
- [x] editor sets `coverAttachmentId` to an IMAGE attachment ON THIS card ->
  `cover` is `{ type: "image", attachmentId, downloadUrl: "/api/attachments/{id}/download" }`;
  `cover_color` is null.
- [x] `coverAttachmentId` on a DIFFERENT card -> `COVER_ATTACHMENT_NOT_FOUND`
  (no row written).
- [x] `coverAttachmentId` non-existent id -> `COVER_ATTACHMENT_NOT_FOUND`.
- [x] `coverAttachmentId` to a NON-image attachment on this card (e.g.
  `application/pdf`) -> `COVER_NOT_IMAGE` (no row written).
- [x] setting an image when a color cover already exists CLEARS the color:
  `cover_color` becomes null, `cover` is `{ type: "image", ... }`.

### conflict + clear
- [x] setting BOTH `coverColor` (non-null) AND `coverAttachmentId` (non-null) in
  one call -> `COVER_CONFLICT` (no row written; cover unchanged).
- [x] `coverColor: null` clears a color cover -> `cover` is null.
- [x] `coverAttachmentId: null` clears an image cover -> `cover` is null.
- [x] a patch omitting both cover fields (e.g. only `title`) leaves the existing
  cover untouched.

### permission
- [x] view-only member tries to set a cover -> FORBIDDEN (board `edit` via
  `loadCardFor`).
- [x] setting a cover on a card whose board the caller cannot view ->
  CARD_NOT_FOUND (no existence leak; the attachment is never checked).

### cover-cleared-on-attachment-delete
- [x] set an image cover, then `attachment.deleteAttachment` (fakeStorage) on
  that attachment -> the card's `cover_attachment_id` is NULL and the enriched
  card payload `cover` is null. (If pg-mem honors FK SET NULL this passes via the
  FK; if not, the conditional service-layer clear makes it pass — see I7/I8.)
- [x] delete the CARD (`card.deleteCard` with fakeStorage) -> attachment rows
  cascade-deleted; no dangling cover; assert no error (mirror
  `enrich.spec.ts:61-78`).

### enrichment / no N+1
- [x] getData returns each card's `cover` (color + image cases) correctly.
- [x] seed N cards each with an IMAGE cover, `vi.spyOn(attachmentRepo,
  "findByIds")`, call `boards.getData`, assert `toHaveBeenCalledTimes(1)` (mirror
  the `countByCards` spy in `enrich.spec.ts:52-58`).
- [x] color-only covers add ZERO attachment queries (assert `findByIds` not
  called, or short-circuited by the empty-input guard).

### migration
- [x] `migrations/015.card-cover.spec.ts`: up adds both columns; image cover FK
  + ON DELETE SET NULL clears `cover_attachment_id` when the attachment row is
  deleted; down drops both columns. (If pg-mem does not honor SET NULL, note the
  deviation and rely on the service test + conditional clear.)

### description-is-markdown (backend no-op confirmation)
- [x] updating `description` with Markdown text (e.g. `# Title\n**bold**`) stores
  and returns the raw text verbatim, still bounded by `CARD_DESCRIPTION_MAX`
  (over-length -> zod rejects). Confirms no server-side transformation.

## 6. Verify
- [x] `pnpm --filter shared build`
- [x] `pnpm --filter backend test` green (storage faked for the attachment-delete
  test)
- [x] `pnpm --filter backend migrate` auto-discovers `015.card-cover` (the live
  runner globs `migrations/` and skips `.spec.`, `scripts/migrate.script.ts:13-26`;
  verified via the pg-mem migration spec; live Postgres not run locally).
- [x] Swagger still shows `PATCH /cards/{id}` with the extended input (cover
  fields appear in the `updateCardInput` schema). No new route.
