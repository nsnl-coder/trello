# Card Cover + Rich Description — Production-Readiness Audit

Audited both plan files against the actual codebase. Verdict: plans are
fundamentally sound and the architecture is correct. A set of concrete
inaccuracies and production risks were found and fixed in the rewritten plans.
Severity: BLOCKER = will fail build/tests; HIGH = correctness/security; MED =
accuracy; LOW = polish.

## Verified-correct claims (no change needed)

- `loadCardFor(db, user, id, "edit")` exists at `card.service.ts:58` and maps
  board NOT_FOUND/FORBIDDEN -> `CARD_NOT_FOUND` via `enforceBoard`. Cover
  validation after this load = no existence leak. CORRECT.
- `attachmentRepo.findById` exists at `attachment.repo.ts:44`. CORRECT.
- `AttachmentRow` exposes `card_id` and `mime_type` (`attachment.repo.ts:6-15`);
  no MinIO read needed for cover validation. CORRECT.
- `downloadUrl` shape `/api/attachments/{id}/download` matches
  `attachment.service.toAttachment` (`attachment.service.ts:65`). CORRECT.
- `updateCard` already uses tri-state `undefined`/`null`/value for
  `description`/`dueAt`/`reminderMinutes` (`card.service.ts:108-117`,
  `card.repo.ts:52-69`). Extending it is clean. CORRECT.
- `updateCard` repo does `.set({ ...patch, updated_at })` so new snake_case
  keys forward automatically (`card.repo.ts:65`). CORRECT.
- Migration ALTER style matches `010.card-due-date.ts`; FK style
  (`.references("attachments.id").onDelete(...)`) matches `013.attachment.ts:7-9`.
  CORRECT.
- `newTestDb` hardcodes `up001..up014` (`helpers.ts:10-23, 41-54`); needs
  `up015` registered. CORRECT — this is a BLOCKER if skipped (see I1).
- Live migrate runner auto-discovers by globbing `migrations/` and skipping
  `.spec.` (`scripts/migrate.script.ts:13-26`). CORRECT — no runner edit needed.
- shared `index.ts` is an explicit barrel, no auto-discovery
  (`index.ts:1-25`); new error file must be added. CORRECT.
- `card.router.ts:36` merges `updateCardInput`; no route wiring change. CORRECT.
- Frontend `package.json` has NO existing markdown lib; `react@^18.3.1`. No
  conflict. CORRECT.
- `DueDatePicker.tsx` is the exact precedent for an instant-apply picker that
  optimistically patches `boards.getData` and rolls back on error. The cover
  picker plan mirrors it faithfully. CORRECT.
- `enrichCards` batch pattern (`card.enrich.ts:26-72`) — cover resolution slots
  in with one extra batched query. CORRECT (with fix I3).

## Issues found + fixes applied

### I1 (BLOCKER) — `attachmentRepo.findByIds` does NOT exist
The backend plan's enrichment depends on `attachmentRepo.findByIds(db, ids) ->
Map`. Only `findById`, `listByCard`, `countByCards`, `listKeysByCard`,
`deleteById`, `create` exist (`attachment.repo.ts`). The plan DID flag it as
"add this helper", but it was phrased ambiguously and the no-N+1 test spies on
it. FIX: rewritten plan makes adding `findByIds` an explicit, first-class task
with the empty-input guard + `where id in (...)` mirroring `countByCards`
(`attachment.repo.ts:71-84`), and a concrete signature.

### I2 (BLOCKER) — `db/types.ts` `CardsTable` uses `Timestamp`, not raw types
`CardsTable` (`db/types.ts:120-131`) uses `Generated<string>` /
`Timestamp | null` aliases. Plan said add `cover_color: string | null` and
`cover_attachment_id: string | null` — both plain nullable strings, which is
correct for text/uuid columns (matches `description: string | null`). VERIFIED
correct; clarified in plan to use plain `string | null` (no `Generated`, no
`Timestamp`).

### I3 (HIGH) — `CardRow` in `card.enrich.ts` AND `card.service.ts` both need the new fields
The plan only mentions widening `CardRow` in `card.enrich.ts:9`. But
`card.service.ts:19` ALSO defines a local `ColumnRow` and uses `CardRow` from
enrich (imported, `card.service.ts:15`) — so widening the single exported
`CardRow` in `card.enrich.ts` is sufficient. VERIFIED: there is ONE `CardRow`
(exported from enrich, line 9), reused by the service. No duplicate type.
Clarified in plan. The `selectAll()` in `findCardById`/`updateCard` returns the
new columns once they exist — no repo select change. CORRECT.

### I4 (HIGH, security) — Markdown XSS path
Frontend plan's `react-markdown` + `rehype-sanitize(defaultSchema)` + NO
`rehype-raw` + `skipHtml` is the correct hardening. Confirmed react-markdown v9
does not render raw HTML by default. ADDED to plan: pin to react-markdown >= 9
(React 18 compatible), and an explicit test asserting `javascript:` href is
dropped and raw `<script>` is rendered as text. Also tightened: the custom `a`
component must NOT blindly trust href — sanitize already strips `javascript:`,
but the plan now states the SafeLink must still apply `rel`/`target` and not
re-introduce an unsanitized href. Images: kept allowed + lazy; documented the
one-line toggle to drop `img` if remote-image exfiltration (tracking pixels) is
a concern.

### I5 (MED) — `COVER_IMAGE_MIME` duplication-vs-import decision
`ATTACHMENT_ALLOWED_MIME` (`attachment.schema.ts:9-22`) already lists the 4
image MIMEs and explicitly excludes SVG (comment lines 7-8). DECISION (stated
in rewritten plan): IMPORT the image subset is cleaner, but to avoid a
cross-schema import cycle and keep card.schema self-contained, DUPLICATE the 4
literals as `COVER_IMAGE_MIME` with a comment pointing at the attachment
allowlist as source of truth. Either is fine; plan now commits to duplication.

### I6 (MED) — FK cascade ordering on card delete
Concern: card deleted -> `attachments` cascade-delete (013 `card_id ON DELETE
cascade`) AND the card's own `cover_attachment_id` FK SET NULL pointing at one
of those same attachments. Analysis: when the CARD row is deleted, its own
`cover_attachment_id` column vanishes with the row, so SET NULL on it is moot —
no ordering conflict. The only live SET NULL path is a DIRECT
`attachments.delete` while the card survives. VERIFIED no conflict. Documented
in plan.

### I7 (MED) — pg-mem `ON DELETE SET NULL` support is unverified
The migration spec's KEY assertion (deleting the attachment nulls
`cover_attachment_id`) depends on pg-mem honoring SET NULL. pg-mem's FK action
support is partial. FIX: plan now instructs to keep the assertion but wrap it so
that if pg-mem throws/no-ops, the spec falls back to asserting via the
service-level test (`deleteAttachment` then re-read the card) and documents the
deviation. The service test runs against the same pg-mem DB, so if SET NULL is
unsupported there too, the rewritten plan adds a SERVICE-LAYER defensive clear
as a safety net (see I8).

### I8 (HIGH) — defense-in-depth: service-layer cover clear on attachment delete
The plan relied SOLELY on the FK for the clear and explicitly said
`deleteAttachment` needs no code change. Risk: if pg-mem does not honor SET NULL
(I7), every cover-clear-on-delete test fails AND, more importantly, the test
suite gives false confidence about prod. FIX: rewritten backend plan adds an
OPTIONAL but recommended belt-and-suspenders note: the FK remains the prod
source of truth, but if the pg-mem spec proves SET NULL is not honored, add a
tiny explicit `cardRepo.clearCoverForAttachment(db, attachmentId)` call inside
`deleteAttachment` before `repo.deleteById`, so the invariant is testable and
holds even on engines without FK actions. Stated as conditional on the I7
finding to avoid unnecessary cross-feature coupling.

### I9 (LOW) — `CardEditor` prop line references were stale
Frontend plan cited `CardEditor.tsx:35` for `editable` and "lines ~80-93" for
the textarea. Actual: `editable` is destructured at `CardEditor.tsx:35`
(correct), description textarea block is `CardEditor.tsx:80-93` (correct),
`onSave` signature is `{ title, description }` at line 26/57. VERIFIED accurate;
plan kept but pinned exact current lines.

### I10 (LOW) — frontend `types.ts` re-export style
Plan says re-export `COVER_COLORS`/`CoverColor`/`CardCover`. The file mixes
`export type { ... }` (types) and `export { ... }` (values) blocks
(`types.ts:1-21`). FIX: plan now specifies `COVER_COLORS` goes in the value
block, `CoverColor`/`CardCover` in the type block.

### I11 (MED) — migration spec prior-`up` chain
Plan listed up001/003/004/005/006/013. The existing `014.assignee.spec.ts`
proves the minimal chain works WITHOUT up002 (rbac). For the FK to attachments,
013 is required, which needs 006 (card) -> 005 -> 004 -> 003 -> 001. VERIFIED
the listed chain is sufficient and matches the established spec pattern. No
up002 needed. Confirmed in plan.

### I12 (LOW) — error file: reuse vs new codes
Plan waffled on whether to put `CARD_NOT_FOUND`/`FORBIDDEN` in the new error
file. `loadCardFor` already throws `BoardError.CARD_NOT_FOUND`, and the existing
`AssigneeError` pattern (`errors/assignee.error.ts`) DOES re-declare
`FORBIDDEN`/`CARD_NOT_FOUND` for frontend mapping convenience. DECISION (stated
in plan): the new `CardCoverError` includes all 6 codes (the 4 cover-specific +
`CARD_NOT_FOUND` + `FORBIDDEN`) so the frontend error-message map is
self-contained, mirroring `AssigneeError`. The service still THROWS
`BoardError.CARD_NOT_FOUND` via `loadCardFor` (same string value), so the
frontend map keyed on the string still matches.

## No code written. Both plan files rewritten in place; this audit added.
