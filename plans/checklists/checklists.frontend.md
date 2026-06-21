# Checklists — Frontend Plan

Depends on backend `checklists` + `checklist-items` routers, card payload
`checklistProgress`. Mirror `features/board` patterns; optimistic updates of
the cached single-card / `boards.getData`.

## 1. Feature scaffold (`features/board`)
- [x] `types.ts` — re-export `Checklist`, `ChecklistItem` from `shared`.
- [x] `errors.ts` — `checklistErrorMessage(code)` mapping `ChecklistError`.
- [x] `utils.ts` — `progressPercent({done, total})`.

## 2. Components (`features/board/components`)
- [x] `ChecklistProgressBadge.tsx` — `done/total` mini bar on `CardTile`
  (hidden when no checklists).
- [x] `ChecklistSection.tsx` — inside `CardEditor`: list checklists, add
  checklist, rename/delete.
- [x] `ChecklistItemRow.tsx` — checkbox + editable text + delete; toggle calls
  `checklist-items.update {isDone}`, optimistic.
- [x] `AddChecklistItem.tsx` — inline input to append an item.
- [x] item reorder via `@dnd-kit/sortable` -> `checklist-items.move`.
- [x] `CardTile.tsx` — render `ChecklistProgressBadge`.
- [x] `CardEditor.tsx` — embed `ChecklistSection`.

## 3. Pages
- [x] `BoardDetailPage.tsx` — cards show progress badge from
  `card.checklistProgress`; opening a card loads full checklists.

## 4. Tests (vitest, mock trpc)
- [x] `ChecklistSection.test.tsx` — add/rename/delete checklist call right
  mutations; hidden for view-only.
- [x] `ChecklistItemRow.test.tsx` — toggle done + edit text + delete call right
  mutations; optimistic progress update.
- [x] item reorder -> `checklist-items.move` with correct args.
- [x] `ChecklistProgressBadge` shows done/total and percent.
- [x] `checklistErrorMessage` covers every code.

## 5. Verify
- [x] `pnpm --filter frontend test` green
- [x] `pnpm --filter frontend build` clean
- [x] manual: add checklist + items, check off, see progress, reorder.
