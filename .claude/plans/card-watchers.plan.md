# Plan: Card Watchers

**Source**: feature proposal (free-form)
**Complexity**: Medium

## Summary
Users can watch a card to receive notifications on its activity (move, comment, due,
checklist) even when not assigned. Auto-watch on assign/comment. Recipients deduped
against assignees to avoid double notifications.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Feature layout | `features/assignee/{assignee.repo,assignee.service,assignee.router}.ts` | join-table CRUD on a card |
| Notify | `notification/notification.recorder.ts:50` (`create`) + `bus.publishUser` | best-effort fan-out |
| Activity events | `card.service.ts` `record(...)` sites | where to fan out to watchers |
| Notif taxonomy | `packages/shared/src/notification.schema.ts:5` (`NotificationType`) | add `CARD_ACTIVITY` |
| Migration | `migrations/029.project-user-order.ts` (join table) | table shape precedent |

## Files to Change
| File | Action | Why |
|---|---|---|
| `packages/backend/src/migrations/032.card-watchers.ts` | CREATE | `card_watchers` join table |
| `packages/shared/src/watcher.schema.ts` | CREATE | watch/unwatch/list IO |
| `packages/shared/src/notification.schema.ts` | UPDATE | add `CARD_ACTIVITY` type + payload note |
| `packages/shared/src/index.ts` | UPDATE | export watcher schema |
| `packages/backend/src/features/watcher/watcher.repo.ts` | CREATE | upsert/delete/list watchers |
| `packages/backend/src/features/watcher/watcher.service.ts` | CREATE | toggle + `notifyWatchers(cardId, payload, excludeUserIds)` |
| `packages/backend/src/features/watcher/watcher.router.ts` | CREATE | watch/unwatch/isWatching |
| `packages/backend/src/features/watcher/test/*.spec.ts` | CREATE | toggle + dedupe fan-out |
| `packages/backend/src/features/card/card.service.ts` | UPDATE | call `notifyWatchers` on move/due |
| `packages/backend/src/features/comment/comment.service.ts` | UPDATE | call `notifyWatchers` on new comment; auto-watch author |
| `packages/backend/src/features/assignee/assignee.service.ts` | UPDATE | auto-watch on assign |
| `packages/backend/src/trpc/router.ts` | UPDATE | mount `watchers` router |
| `packages/frontend/src/features/board/components/WatchToggle.tsx` | CREATE | eye toggle on card detail |

## Data Model
- `card_watchers`: card_id (fk), user_id (fk), created_at. Unique (card_id, user_id).

## Tasks
### Task 1: schema + migration + repo
- Join table + upsert/delete/list. Validate: repo spec.

### Task 2: service with dedupe fan-out
- `notifyWatchers` loads watcher ids, removes `excludeUserIds` (actor + already-notified assignees/mentions), calls recorder per user. Never throws.
- Validate: dedupe spec (watcher who is also assignee notified once).

### Task 3: wire events + auto-watch
- Hook card move/due, new comment, assign. Auto-watch on assign/comment.
- Validate: backend test.

### Task 4: frontend toggle
- Watch/unwatch button + watched indicator; optional "watching" filter later.
- Validate: `pnpm --filter frontend test`.

## Validation
```bash
pnpm --filter backend migrate
pnpm --filter backend test
pnpm --filter frontend test
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Double notification (watcher+assignee+mention) | High | merge recipient set, exclude already-notified |
| Notification spam on busy cards | Med | reuse prefs gate; consider per-type opt-out later |
| Fan-out failure blocks mutation | Med | best-effort try/catch like recorder |

## Acceptance
- [ ] Watch/unwatch + isWatching
- [ ] Auto-watch on assign/comment
- [ ] Recipients deduped (one notification per user per event)
- [ ] Patterns mirrored, not reinvented
