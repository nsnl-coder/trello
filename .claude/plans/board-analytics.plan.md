# Plan: Board Analytics

**Source**: feature proposal (free-form)
**Complexity**: Medium

## Summary
Read-only analytics for a board: cards per column, overdue count, completed in last
7/30 days, and average cycle time. Derived from existing `cards` + `activity` rows
(CARD_MOVED activity already carries from/to columns + timestamp), cached in Redis
with a short TTL. No new tables.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Read router | `features/search/search.router.ts` | query-only tRPC procedures |
| Board perm | `card.service.ts:59` (`enforceBoard`/`loadBoardFor`) | `view` permission gate |
| Cache | `notification.recorder.ts:8,64` (`cache`, `cacheKeys`) | TTL get/set + key helper |
| Activity source | `card.service.ts:371` `ActivityType.CARD_MOVED` meta | cycle-time data source |
| Shared schema | `packages/shared/src/activity.schema.ts` | zod + types |

## Files to Change
| File | Action | Why |
|---|---|---|
| `packages/shared/src/analytics.schema.ts` | CREATE | summary + cycle-time output types |
| `packages/shared/src/index.ts` | UPDATE | export schema |
| `packages/backend/src/features/analytics/analytics.repo.ts` | CREATE | aggregate Kysely queries |
| `packages/backend/src/features/analytics/analytics.service.ts` | CREATE | perm gate + cache wrap |
| `packages/backend/src/features/analytics/analytics.router.ts` | CREATE | `boardSummary`, `cycleTime` |
| `packages/backend/src/features/analytics/test/*.spec.ts` | CREATE | integration tests |
| `packages/backend/src/cache/cache.ts` | UPDATE | `cacheKeys.analytics(boardId)` |
| `packages/backend/src/trpc/router.ts` | UPDATE | mount `analytics` router |
| `packages/frontend/src/features/analytics/*` | CREATE | panel: stat cards + simple bars |

## Tasks
### Task 1: aggregate queries
- `cardsPerColumn`, `overdueCount`, `completedSince(date)` via Kysely group-by.
- Cycle time: per card, first move time -> move into a Done-like column, averaged. Confirm "done" definition (last column vs name match) before coding.
- Validate: repo spec on seeded board.

### Task 2: service + cache + router
- `view` perm via `loadBoardFor`; cache result under `cacheKeys.analytics(boardId)` short TTL; gate on Redis ready flag (existing pattern).
- Validate: router spec green.

### Task 3: frontend panel
- Analytics tab on board; stat cards + minimal bar chart (avoid new dep if feasible).
- Validate: `pnpm --filter frontend test`.

## Validation
```bash
pnpm --filter backend test
pnpm --filter frontend test
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Cycle time undefined for never-moved cards | High | exclude from avg; document definition |
| "Done column" ambiguous | Med | decide rule (last column / name) before impl |
| Aggregate cost on large boards | Med | Redis cache + indexed group-by |

## Acceptance
- [x] Summary + cycle time behind `view` perm
- [x] Cached with TTL, Redis-ready gated
- [x] No new table; activity-derived
- [x] Patterns mirrored, not reinvented

## Decision
- "Done" column = rightmost (highest-position) non-archived column. Cycle time =
  card.created_at -> first CARD_MOVED into that column (name match). Cards never
  moved into Done / created directly there are excluded from the average.
