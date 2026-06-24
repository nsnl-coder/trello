# Plan: Saved Filters / Named Board Views

**Source**: feature proposal (free-form)
**Complexity**: Small-Medium

## Summary
Extend the current single per-user board view (mode + config) to many named, saved
views per user per board, optionally shareable. Reuses the existing filter config
shape (label/assignee filters already exist).

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Existing view | `features/board-view/board-view.service.ts` | per-user upsert, defensive re-parse, perm gate |
| View schema | `packages/shared/src/board-view.schema.ts` | mode + config zod |
| Filter UI | `features/board/components/{ViewSwitcher,LabelFilterBar,AssigneeFilterBar}.tsx` | config source |
| Migration | `migrations/board-view` table precedent | per-user board rows |

## Files to Change
| File | Action | Why |
|---|---|---|
| `packages/backend/src/migrations/033.saved-views.ts` | CREATE | `saved_views` table |
| `packages/shared/src/saved-view.schema.ts` | CREATE | CRUD IO; reuse board-view config shape |
| `packages/shared/src/index.ts` | UPDATE | export |
| `packages/backend/src/features/board-view/board-view.repo.ts` | UPDATE | saved-view CRUD (extend feature) |
| `packages/backend/src/features/board-view/board-view.service.ts` | UPDATE | list/create/update/delete/apply, perm gate |
| `packages/backend/src/features/board-view/board-view.router.ts` | UPDATE | new procedures |
| `packages/backend/src/features/board-view/test/*.spec.ts` | UPDATE | CRUD + shared visibility |
| `packages/frontend/src/features/board/components/ViewSwitcher.tsx` | UPDATE | save/select/delete views dropdown |

## Data Model
- `saved_views`: id, board_id (fk), user_id (fk), name, config jsonb, is_shared bool, created_at, updated_at.
- Shared views visible to all board members (read); editable only by owner.

## Tasks
### Task 1: schema + migration + repo
- Reuse `boardViewSchema.config` shape for `config`. Validate: repo spec.

### Task 2: service + router
- `view` perm to read/list; create/update/delete own; shared views readable by members.
- Defensive re-parse of config (mirror existing getBoardView fallback).
- Validate: router spec incl. shared visibility.

### Task 3: frontend dropdown
- "Save current view" (name prompt), select to apply, delete own, share toggle.
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
| Config drift vs current board-view shape | Med | reuse same zod config; re-parse with fallback |
| Shared-view edit by non-owner | Med | owner-only mutation guard |

## Acceptance
- [ ] Many named views per user per board
- [ ] Shared views readable by members, editable by owner only
- [ ] Reuses existing filter config shape
- [ ] Patterns mirrored, not reinvented
