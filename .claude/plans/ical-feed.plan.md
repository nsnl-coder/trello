# Plan: Calendar / iCal Feed

**Source**: feature proposal (free-form)
**Complexity**: Small-Medium

## Summary
A read-only, token-authenticated `.ics` feed of the user's due-dated cards, suitable
for subscribing in Google/Apple Calendar. Served as a plain Express route (not tRPC,
not cookie auth) using a revocable per-user token.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Express mount | `packages/backend/src/index.ts` (app + tRPC mount) | add a sibling route |
| Due-card query | `card.service.ts:247` `listDueCards` / `card.reminder.ts` | source of due cards a user can see |
| Token storage | `migrations/030.oauth.ts` (per-user secret precedent) | revocable opaque token |
| Log events | `config/const.config.ts` `LogEvent` | feed served/denied events |

## Files to Change
| File | Action | Why |
|---|---|---|
| `packages/backend/src/migrations/034.ical-token.ts` | CREATE | per-user `ical_token` column/table |
| `packages/backend/src/features/ical/ical.repo.ts` | CREATE | token issue/lookup/revoke; due cards for user |
| `packages/backend/src/features/ical/ical.service.ts` | CREATE | resolve token -> user -> VEVENTs |
| `packages/backend/src/features/ical/ical.route.ts` | CREATE | Express `GET /ical/:token.ics` |
| `packages/backend/src/features/ical/ical.router.ts` | CREATE | tRPC: getFeedUrl, regenerate, revoke |
| `packages/backend/src/features/ical/test/*.spec.ts` | CREATE | ics output + bad/revoked token |
| `packages/backend/src/index.ts` | UPDATE | mount `ical.route` |
| `packages/backend/src/trpc/router.ts` | UPDATE | mount `ical` router |
| `packages/frontend/src/features/ical/SubscribePanel.tsx` | CREATE | show URL, copy, regenerate/revoke |

## Tasks
### Task 1: token model + repo
- Opaque random token per user, revocable (regenerate rotates). Validate: repo spec.

### Task 2: ics builder + route
- Build VCALENDAR/VEVENT from due cards the user can access; `Content-Type: text/calendar`.
- Token auth only (no cookie); invalid/revoked -> 404. Hand-roll ICS or use a tiny lib.
- Validate: route spec asserts ics shape + 404 on bad token.

### Task 3: frontend subscribe panel
- Display feed URL, copy button, regenerate/revoke.
- Validate: `pnpm --filter frontend test`.

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Token leak exposes due dates | High | opaque high-entropy token, revocable, read-only |
| Bypasses cookie auth middleware | High | dedicated token-only handler; never mount under auth-required path |
| ICS format quirks across clients | Med | follow RFC 5545 minimal VEVENT; test against sample |

## Validation
```bash
pnpm --filter backend migrate
pnpm --filter backend test
pnpm --filter frontend test
```

## Acceptance
- [ ] `GET /ical/:token.ics` returns valid calendar of user's due cards
- [ ] Token revocable/regenerable; bad token -> 404
- [ ] No cookie auth on the feed route
- [ ] Patterns mirrored, not reinvented
