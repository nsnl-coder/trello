# Plan: Daily Digest (in-app notification, not email)

**Source**: feature proposal (free-form) — user chose in-app over email
**Complexity**: Small

## Summary
A daily cron emits ONE in-app notification per user summarizing their assigned /
overdue / due-today cards. No email. Fully reuses the notification recorder, prefs
gate, realtime bus, and the existing scheduler pattern.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Scheduler | `features/card/card.reminder.scheduler.ts` | `croner` job wired at startup |
| Scan logic | `features/card/card.reminder.ts` | iterate users/cards, idempotent guard |
| Notify | `notification/notification.recorder.ts:50` (`create`) | best-effort, prefs-gated, bus nudge |
| Notif taxonomy | `packages/shared/src/notification.schema.ts:5` | add `DIGEST_DAILY` type |
| Log events | `config/const.config.ts` `LogEvent` | `DigestSent` |

## Files to Change
| File | Action | Why |
|---|---|---|
| `packages/shared/src/notification.schema.ts` | UPDATE | add `DIGEST_DAILY` type + payload (counts) |
| `packages/backend/src/features/digest/digest.ts` | CREATE | compute per-user counts, emit one notification |
| `packages/backend/src/features/digest/digest.scheduler.ts` | CREATE | daily `croner` job |
| `packages/backend/src/features/digest/test/*.spec.ts` | CREATE | counts + once-per-day + prefs gate |
| `packages/backend/src/config/const.config.ts` | UPDATE | `LogEvent.DigestSent` |
| `packages/backend/src/index.ts` | UPDATE | start `digest.scheduler` |
| `packages/frontend/src/features/notification/components/NotificationBell.tsx` | UPDATE | render DIGEST_DAILY row + link |

## Data Model
- No new table. Payload carries counts: `{ assigned, overdue, dueToday, actorHandle: null, title }`.
- Idempotency: skip users already sent a digest today (query last DIGEST_DAILY notification createdAt).

## Tasks
### Task 1: schema + compute
- Add `DIGEST_DAILY`; `computeDigest(db, userId)` returns counts. Skip users with no relevant cards.
- Validate: digest spec on seeded data.

### Task 2: scheduler + emit
- Daily cron; for each eligible user emit one notification via recorder (prefs gate, `in_app`). Idempotent per day.
- Validate: once-per-day + zero-count skip specs.

### Task 3: frontend render
- DIGEST_DAILY row in bell ("3 overdue, 5 due today"); click -> filtered my-cards view.
- Validate: `pnpm --filter frontend test`.

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Duplicate digest on cron retry/restart | Med | idempotency: check last digest createdAt for today |
| Empty digests as noise | Med | skip users with zero relevant cards |
| Per-user scan cost at scale | Low | single grouped query; daily cadence |

## Validation
```bash
pnpm --filter backend test
pnpm --filter frontend test
```

## Acceptance
- [ ] One in-app digest/user/day, no email
- [ ] Skips users with nothing to report
- [ ] Idempotent across restarts/retries
- [ ] Renders + links in NotificationBell
- [ ] Patterns mirrored, not reinvented
