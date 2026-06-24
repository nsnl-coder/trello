# Plan: Board Export / Import (CSV + JSON)

**Source**: feature proposal (free-form)
**Complexity**: Medium

## Summary
Export a board to JSON (full: columns, cards, labels, checklists, assignees) or CSV
(flat card rows). Import a JSON board: validate with zod and recreate via existing
services so positions, activity, and ids are correct. Leans on the existing backup
feature's serialization approach.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Serialization/transport | `features/backup/{backup.service,backup.router}.ts` | export/import file handling precedent |
| Board read | `features/board/board.service.ts` `loadBoardFor` | perm gate (owner for import) |
| Recreate via services | `card.service.ts createCard`, `column.service`, `label.service` | id remap + positions + activity |
| Errors | `packages/shared/src/errors/backup.error.ts` | shared error constants |

## Files to Change
| File | Action | Why |
|---|---|---|
| `packages/shared/src/board-transfer.schema.ts` | CREATE | export/import document zod |
| `packages/shared/src/errors/board-transfer.error.ts` | CREATE | shared errors |
| `packages/shared/src/index.ts` | UPDATE | export |
| `packages/backend/src/features/board-transfer/board-transfer.service.ts` | CREATE | export serialize + import recreate |
| `packages/backend/src/features/board-transfer/board-transfer.repo.ts` | CREATE | bulk reads for export |
| `packages/backend/src/features/board-transfer/board-transfer.router.ts` | CREATE | export (json/csv), import |
| `packages/backend/src/features/board-transfer/test/*.spec.ts` | CREATE | round-trip + invalid import |
| `packages/backend/src/trpc/router.ts` | UPDATE | mount `boardTransfer` router |
| `packages/frontend/src/features/board/components/BoardMenu.tsx` | UPDATE | export/import actions |

## Tasks
### Task 1: export
- JSON: nested board doc. CSV: one row per card (column, title, due, assignees, labels).
- `view` perm. Match backup's download/transport mechanism (decision after reading backup.service).
- Validate: export spec on seeded board.

### Task 2: import
- Validate JSON with zod; recreate board -> columns -> cards -> labels/checklists/assignees through services. Remap old ids -> new. Owner perm on target.
- Validate: round-trip spec (export then import yields equivalent board); malformed import rejected.

### Task 3: frontend
- Export (json/csv) + import (file pick) in board menu.
- Validate: `pnpm --filter frontend test`.

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Id remapping errors on import | High | build old->new id map; recreate via services not raw SQL |
| Large board memory/timeout | Med | stream/paginate export; cap import size |
| CSV ambiguity (commas, multi-assignee) | Med | quote fields; JSON is canonical, CSV lossy by design |
| Importing untrusted JSON | Med | strict zod parse before any write |

## Validation
```bash
pnpm --filter backend test
pnpm --filter frontend test
```

## Acceptance
- [ ] JSON + CSV export behind `view`
- [ ] JSON import recreates board via services (owner perm)
- [ ] Round-trip preserves structure; malformed input rejected
- [ ] Patterns mirrored, not reinvented
