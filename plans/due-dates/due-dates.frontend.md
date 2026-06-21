# Due Dates + Reminders — Frontend Plan

Depends on backend card `dueAt`/`reminderMinutes`/`isOverdue` fields and
`cards.due` query. Mirror `features/board` patterns.

## 1. Feature scaffold (`features/board`)
- [x] `types.ts` — pick up extended `Card` (dueAt, reminderMinutes, isOverdue).
- [x] `utils.ts` — `formatDueDate(date)`, `dueState(card)` ->
  `overdue | soon | upcoming | none` for badge styling; `REMINDER_OPTIONS`
  (none / at time / 10m / 1h / 1d).

## 2. Components (`features/board/components`)
- [x] `DueDateBadge.tsx` — pill on `CardTile`: due date, red when overdue,
  amber when soon; hidden when no due date.
- [x] `DueDatePicker.tsx` — inside `CardEditor`: date-time input + reminder
  select + clear button; saves via `cards.update`, optimistic.
- [x] `CardTile.tsx` — render `DueDateBadge`.
- [x] `CardEditor.tsx` — embed `DueDatePicker`.

## 3. Pages
- [x] `BoardDetailPage.tsx` — overdue cards visually flagged via badge.
- [ ] optional `BoardCalendarPage.tsx` (`/projects/:id/boards/:boardId/calendar`)
  — query `cards.due` for the month; month grid of due cards linking to the
  card editor. (Mark optional; ship badges first.) -- NOT BUILT (optional)

## 4. Tests (vitest, mock trpc)
- [x] `DueDatePicker.test.tsx` — setting/clearing date calls `cards.update`
  with `dueAt`; reminder select passes `reminderMinutes`; view-only disabled.
- [x] `DueDateBadge` — overdue/soon/upcoming styling from `dueState`.
- [x] `formatDueDate`/`dueState` unit cases (past, today, future, null).
- [ ] calendar page (if built) renders cards from `cards.due`. -- N/A (page not built)

## 5. Verify
- [x] `pnpm --filter frontend test` green
- [x] `pnpm --filter frontend build` clean
- [x] manual: set due date + reminder, see overdue highlight, clear it.
