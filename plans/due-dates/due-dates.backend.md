# Due Dates + Reminders — Backend Plan

Add an optional `due_at` to cards, plus overdue derivation and a reminder that
emails the card's board members before the due time. Reminder delivery reuses
`features/email`; scheduling reuses the existing cron/scheduler in
`packages/infra` (a periodic worker scans due cards). Permission via the card
chain (`card.column_id -> column.board_id`): `view` to read, `edit` to set.

Mirror `features/card` patterns. In-app notifications are out of scope here
(future; see comments plan mentions for the same need).

## API endpoints
- [x] `PATCH /cards/{id}` — extend existing update to accept `dueAt` (set/clear)
  and `reminderMinutes` (board `edit`)
- [x] `GET /cards/due?boardId=&from=&to=` — list cards with a due date in a
  window, for calendar/agenda views (board `view`)

## 1. Database (migrations + db types)
- [x] `migrations/009.card-due-date.ts` — alter `cards`: add
  `due_at timestamptz null`, `reminder_minutes int null`,
  `reminder_sent_at timestamptz null`. Index on `due_at` (partial
  `where due_at is not null`) for the reminder scan.
- [x] `db/types.ts` — extend `CardsTable` with the three columns.
- [x] migration spec — up adds columns + index; down drops them; existing rows
  default to null.

## 2. Shared schemas + errors (`packages/shared`)
- [x] `src/card.schema.ts` — extend `updateCardInput` with
  `dueAt: z.date().nullable().optional()`,
  `reminderMinutes: z.number().int().min(0).nullable().optional()`;
  extend `cardSchema` with `dueAt`, `reminderMinutes`, derived `isOverdue`
  (computed in service, not stored). Add `listDueCardsInput`
  (boardId, from, to).
- [x] `src/errors/card.error.ts` — add `INVALID_DUE_RANGE` if `from > to`.
- [x] `src/index.ts` — export updated card schema.

## 3. Card feature (`features/card`)
- [x] `card.repo.ts` — `updateCard` writes `due_at`/`reminder_minutes`
  (clear `reminder_sent_at` when `due_at` changes); `listDueCards(boardId,
  from, to)`; `findDueForReminder(now)` for the worker.
- [x] `card.service.ts` — `updateCard` accepts due fields (edit); compute
  `isOverdue = due_at != null && due_at < now`; `listDueCards` (view).
- [x] `card.router.ts` — extend `update`; add `due` query under `/cards/due`.

## 4. Reminder worker (`features/card` + `packages/infra`)
- [x] `card.reminder.ts` — `runDueReminders(now)`: select cards where
  `due_at - reminder_minutes <= now`, `reminder_sent_at is null`,
  `due_at >= now`; for each, resolve board members (board access +
  project inheritance) and send via `features/email`; stamp
  `reminder_sent_at`.
- [x] register a scheduled job (cron entry in `packages/infra`) calling
  `runDueReminders`, e.g. every 5 min; idempotent via `reminder_sent_at`.
- [x] email template for "card due soon" (subject, board+card link).

## 5. Tests (pg-mem, mirror `features/card/test`)
- [x] set `dueAt` on update (edit); view-only -> FORBIDDEN.
- [x] clearing `dueAt` (null) resets `reminder_sent_at`.
- [x] `isOverdue` true when due in the past, false otherwise/null.
- [x] `listDueCards` returns cards in window ordered by `due_at`;
  `from > to` -> INVALID_DUE_RANGE; inaccessible board -> NOT_FOUND.
- [x] `runDueReminders` sends once per card within the reminder window and
  stamps `reminder_sent_at` (second run sends nothing).
- [x] worker skips cards already past due with no reminder window left.
- [x] migration up/down spec.

## 6. Verify
- [x] `pnpm --filter shared build`
- [x] `pnpm --filter backend test` green (email send mocked)
- [x] Swagger shows `/cards/due` + new fields on `PATCH /cards/{id}`.
