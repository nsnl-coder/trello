# Card Cover + Rich Description — Frontend Plan

Two additive card-editor features. Depends on backend: extended `cards.update`
input (`coverColor?`, `coverAttachmentId?`), card payload `cover`
(`{ type: "color", color } | { type: "image", attachmentId, downloadUrl } | null`),
and `description` now holding Markdown source. Mirror `features/board` patterns:
components in `features/board/components`, call tRPC with `useTRPC()` +
`queryOptions`/`mutationOptions` directly (no custom api hooks — see
`AttachmentList.tsx` / `DueDatePicker.tsx`). Cover edits go through the existing
`cards.update` mutation; NO new endpoint, NO new upload path (image covers pick
from existing attachments).

Integration points: `CardTile.tsx` (cover strip at the top of the tile) and
`CardEditor.tsx` (cover banner + cover picker + Markdown description
edit/preview toggle).

> Permission note: cover edits require board `edit` (server enforces via
> `loadCardFor "edit"`). Gate the cover picker + the description editor by the
> existing `editable` prop CardEditor receives (destructured at
> `CardEditor.tsx:35`). Read-only viewers see the rendered cover + rendered
> Markdown but no controls.

## Markdown library + sanitization (DECIDED — security-critical)

- Frontend `package.json` has NO existing markdown lib (verified) and uses
  `react@^18.3.1`. Render with **`react-markdown` (>= 9, React 18 compatible)** +
  **`remark-gfm`** (tables, strikethrough, task lists, autolinks) and sanitize
  with **`rehype-sanitize`** using its `defaultSchema` (GitHub-like safe
  allowlist). Add to `packages/frontend/package.json` dependencies:
  `react-markdown`, `remark-gfm`, `rehype-sanitize`. `pnpm install`.
- Safety config (NON-NEGOTIABLE):
  - Do NOT enable `rehype-raw` and DO pass `skipHtml` — `react-markdown` does not
    render raw HTML by default; keep it that way so embedded `<script>` /
    `<img onerror>` / `<iframe>` in the Markdown source are treated as literal
    text, not HTML.
  - Pass `rehypePlugins={[rehypeSanitize]}` (default schema) as a second line of
    defense; it strips dangerous nodes/attributes if a future plugin
    re-introduces HTML.
  - Link protocols: `defaultSchema` allows http/https/mailto and blocks
    `javascript:`. Render links via a custom `a` component that adds
    `target="_blank" rel="noopener noreferrer nofollow"` and uses the (already
    sanitized) href as-is — the custom component must NOT re-introduce an
    unsanitized href.
  - Images: `defaultSchema` permits `img` with http(s) `src`. DECIDED: keep
    images allowed but lazy (`loading="lazy"`) via a custom `img` component; no
    `srcset`/dimension inference. One-line toggle: to block remote images
    entirely (tracking-pixel/exfil concern), drop `img` from the schema —
    document this toggle in `MarkdownView.tsx`.
  - Wrap rendered output in a `.prose`-style container (hand-rolled Tailwind
    class set) scoped so Markdown styles do not leak.
- Card-tile preview does NOT render Markdown — the tile shows only cover + title +
  existing badges. No markdown parsing on the hot kanban render path.

## Cover palette mapping (DECIDED)

- Backend stores palette KEYS (`COVER_COLORS` from `shared`). Frontend owns the
  key -> visual mapping in `coverColors.ts`:
  `COVER_COLOR_CLASS: Record<CoverColor, string>` (a Tailwind bg class per key,
  e.g. `slate -> "bg-slate-400"`, `red -> "bg-red-500"`, ...). One source of
  truth for picker swatches + rendered banners/strips.

## 1. Feature scaffold (`features/board`)
- [x] `types.ts` — re-export from `shared` following the file's split style
  (`types.ts:1-21`): add `CoverColor` and `CardCover` to the `export type { ... }`
  block (lines 1-14); add `COVER_COLORS` to the `export { ... }` value block
  (lines 16-20).
- [x] `coverColors.ts` — `COVER_COLOR_CLASS` map (key -> Tailwind class) and
  `coverColorList = COVER_COLORS` for iterating swatches. Single source for swatch
  + banner + strip colors.
- [x] `cardCoverErrors.ts` — `cardCoverErrorMessage(err: unknown)` mapping every
  `CardCoverError` code (`INVALID_COVER_COLOR`, `COVER_ATTACHMENT_NOT_FOUND`,
  `COVER_NOT_IMAGE`, `COVER_CONFLICT`, `CARD_NOT_FOUND`, `FORBIDDEN`) to a
  user-facing string + a default fallback. Mirror `attachmentErrors.ts` EXACTLY
  (`attachmentErrors.ts:1-24`): `Record<CardCoverError, string>`, accept a
  `TRPCClientError` (read `.message`) OR a raw string code, fallback
  "Something went wrong. Please try again." (`CardCoverError` already includes
  `CARD_NOT_FOUND`/`FORBIDDEN` so one record covers everything.)

## 2. Components — cover (`features/board/components`)
- [x] `CardCoverStrip.tsx` — props `{ cover: CardCover | null }`. Renders nothing
  when null. `type === "color"`: a short rounded bar using
  `COVER_COLOR_CLASS[cover.color]` (e.g. `h-8` full-width strip at the tile top).
  `type === "image"`: `<img src={cover.downloadUrl}>` strip
  (`h-20 w-full object-cover rounded-t-lg`, `loading="lazy"`, `alt="Card cover"`).
  Used by `CardTile`.
- [x] `CardCoverBanner.tsx` — props `{ cover: CardCover | null }`. Larger version
  for the editor header (color: `h-12`; image: `h-32 object-cover`). Renders
  nothing when null.
- [x] `CardCoverPicker.tsx` — props `{ boardId, cardId, cover, attachments,
  editable }` where `attachments` is the card's image attachments
  (`Attachment[]` filtered to image mime). Rendered only when `editable`. UI:
  - a row of color swatches from `coverColorList` (each a button with
    `COVER_COLOR_CLASS`); clicking one calls `cards.update` with
    `{ id: cardId, coverColor: key }` (server clears any image cover).
  - a row of the card's image-attachment thumbnails; clicking one calls
    `cards.update` with `{ id: cardId, coverAttachmentId: att.id }` (server clears
    any color cover). Each thumb `src={att.downloadUrl}`.
  - a "Remove cover" button (shown when `cover != null`) calling `cards.update`
    with `{ id: cardId, coverColor: null }` (explicit null clears both columns).
  - currently-active swatch/thumb gets a selected ring.
  - empty-image state: if the card has no image attachments, show hint
    "Upload an image attachment to use it as a cover" (do NOT build upload here —
    the existing Attachments section / `AttachmentUpload` handles upload).
  - mutation pattern — mirror `DueDatePicker.tsx` EXACTLY (the precedent
    instant-apply picker): `useMutation(trpc.cards.update.mutationOptions())`;
    build `dataKey = trpc.boards.getData.queryKey({ id: boardId })`; a `patchCard`
    helper that `setQueryData<BoardData>` mapping columns->cards and patching the
    matching card's `cover`; snapshot before mutate; resolve image `downloadUrl`
    from the chosen attachment locally so the banner updates instantly;
    `onError` restore snapshot. Optionally `onSuccess` invalidate
    `boards.getData` (DueDatePicker does not invalidate; the optimistic value is
    already correct — keep it simple, no invalidate needed). Show
    `cardCoverErrorMessage(updateMutation.error)` on error.
- [x] `CardTile.tsx` — add `<CardCoverStrip cover={card.cover} />` as the FIRST
  child inside the tile container (above the labels row, before
  `CardTile.tsx:43`). Adjust container padding so the strip sits flush at the top
  (wrap textual content in a padded inner div; keep the strip edge-to-edge with
  `rounded-t-lg` matching the tile radius `rounded-lg` at `CardTile.tsx:39`).
  Additive only.

## 3. Components — Markdown description (`features/board/components`)
- [x] `MarkdownView.tsx` — props `{ source: string }`. Renders
  `<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}
  components={{ a: SafeLink, img: LazyImg }} skipHtml>` inside a scoped
  `.prose`-style wrapper. `SafeLink` adds `target="_blank" rel="noopener
  noreferrer nofollow"`; `LazyImg` adds `loading="lazy"` + a max-width class.
  This is the ONLY place markdown is rendered. Empty/whitespace source -> render
  a muted "No description" placeholder.
- [x] `DescriptionEditor.tsx` — props `{ value, onChange, editable }`. When
  `editable`, a tab/toggle "Write | Preview":
  - Write: a `<textarea>` (Markdown source, `maxLength={CARD_DESCRIPTION_MAX}`,
    same styling as the current textarea `CardEditor.tsx:84-92`).
  - Preview: `<MarkdownView source={value} />`.
  Local `mode` state (`"write" | "preview"`, default write). When NOT `editable`,
  render `<MarkdownView source={value} />` only (no toggle, no textarea).
  Optional tiny "Markdown supported" hint.
- [x] `CardEditor.tsx` — integration (additive):
  - Replace the description `<textarea>` block (`CardEditor.tsx:80-93`) with
    `<DescriptionEditor value={description} onChange={setDescription}
    editable={editable} />`. The existing `description` state
    (`CardEditor.tsx:45`) + `onSave` (`description.trim() || null`,
    `CardEditor.tsx:57`) are unchanged — the saved value is Markdown source.
  - Add `<CardCoverBanner cover={card.cover} />` at the very top of the modal body
    (above the Title field, before `CardEditor.tsx:63`).
  - Add `<CardCoverPicker boardId={boardId} cardId={card.id} cover={card.cover}
    attachments={imageAttachments} editable={editable} />` near the banner or just
    below the Attachments section. Source `imageAttachments` by reusing the
    existing `attachments.list` query (same key `AttachmentList` uses,
    `AttachmentList.tsx:22`, TanStack dedupes) and filter client-side to
    `mimeType.startsWith("image/")`. No new query/endpoint.
  - cover edits use their own `cards.update` mutation inside `CardCoverPicker`;
    they do NOT go through the editor's Save button (instant apply, like the
    Label/Assignee/DueDate pickers).

## 4. Tests (vitest, mock trpc)
- [x] `MarkdownView.test.tsx` — renders `**bold**` as `<strong>`, a gfm table, a
  task list; `[x](javascript:alert(1))` does NOT produce a `javascript:` href
  (sanitized/dropped); raw `<script>alert(1)</script>` in the source renders as
  literal text, NOT a `<script>` element (assert none in the DOM); external links
  get `rel="noopener noreferrer nofollow"` + `target="_blank"`.
- [x] `DescriptionEditor.test.tsx` — Write/Preview toggle swaps textarea <->
  rendered markdown; typing in Write updates the preview; read-only mode shows
  rendered markdown and NO textarea/toggle; `maxLength` enforced.
- [x] `CardCoverPicker.test.tsx` — clicking a color swatch calls `cards.update`
  with `{ coverColor }` and optimistically updates the cached card cover; clicking
  an image thumb calls update with `{ coverAttachmentId }`; "Remove cover" sends
  `coverColor: null`; server `COVER_NOT_IMAGE`/`COVER_CONFLICT` shows the mapped
  message and rolls back the optimistic cover; picker hidden when `editable`
  false; empty-image hint when the card has no image attachments.
- [x] `CardCoverStrip.test.tsx` — null cover renders nothing; color cover renders
  the mapped class; image cover renders an `<img>` with the `downloadUrl` src.
- [x] `cardCoverErrorMessage` covers every code + unknown fallback + accepts a
  `TRPCClientError` object.

## 5. Verify
- [x] `pnpm --filter frontend test` green
- [x] `pnpm --filter frontend build` clean
- [ ] manual: set a color cover (tile strip + editor banner update instantly);
  upload an image attachment then pick it as the cover (image strip/banner show);
  switching color<->image clears the other; remove cover clears it; delete the
  cover image attachment in the Attachments section -> cover disappears (FK SET
  NULL, after `boards.getData` refetch); description Write/Preview toggle renders
  sanitized Markdown; a `<script>` / `javascript:` link in the description does
  not execute; view-only member sees rendered cover + markdown but no controls.
