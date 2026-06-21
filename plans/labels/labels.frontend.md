# Labels / Tags — Frontend Plan

Depends on backend `labels` router + card payload `labels[]`. Mirror
`features/board` patterns; `useTRPC()` `queryOptions`/`mutationOptions`
directly. Filter board cards by label client-side from `boards.getData`.

## 1. Feature scaffold (`features/board`)
- [x] `types.ts` — re-export `Label` from `shared`.
- [x] `errors.ts` — `labelErrorMessage(code)` mapping `LabelError`.
- [x] `utils.ts` — `LABEL_COLORS` palette; `cardMatchesLabels(card, ids)`.

## 2. Components (`features/board/components`)
- [x] `LabelBadge.tsx` — colored chip (name optional, dot when compact);
  shown on `CardTile`.
- [x] `LabelManager.tsx` — board labels CRUD panel: list, create
  (name+color), edit, delete; gated behind `canEdit`.
- [x] `LabelPicker.tsx` — inside `CardEditor`: toggle board labels on/off for
  the card (attach/detach mutations, optimistic).
- [x] `LabelFilterBar.tsx` — board header control: multi-select labels to
  filter visible cards.
- [x] `CardTile.tsx` — render `LabelBadge` row from `card.labels`.
- [x] `CardEditor.tsx` — embed `LabelPicker`.

## 3. Board page wiring (`pages/user/projects/BoardDetailPage.tsx`)
- [x] add `LabelFilterBar` to board header; keep selected label ids in state.
- [x] filter columns' cards through `cardMatchesLabels` before render.
- [x] "Manage labels" entry (owner/editor) opens `LabelManager`.
- [x] attach/detach + label CRUD optimistic update of cached `boards.getData`,
  rollback on error.

## 4. Tests (vitest, mock trpc — mirror `BoardDetailPage.test.tsx`)
- [x] `LabelManager.test.tsx` — create/edit/delete call right mutations;
  hidden for view-only.
- [x] `LabelPicker.test.tsx` — toggling calls attach/detach with correct args.
- [x] `LabelFilterBar` — selecting labels filters visible cards; clear resets.
- [x] `CardTile` renders a badge per card label.
- [x] `labelErrorMessage` covers every `LabelError` code.

## 5. Verify
- [x] `pnpm --filter frontend test` green
- [x] `pnpm --filter frontend build` clean
- [x] manual: create labels, tag cards, filter board, view-only is read-only.
