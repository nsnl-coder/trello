# Project — Frontend Plan

UI for project CRUD + per-project access (view / edit) management.
Stack: React + Vite, tRPC client (`useTRPC` + TanStack Query), react-hook-form +
zodResolver, Tailwind, react-table. Feature-based layout per `.claude/rules/frontend.md`.

## Decisions (locked, from backend)

- Projects are user-facing. Any authenticated user reaches them (no global permission gate).
  Route under `ProtectedRoute`, NOT `PermissionRoute`.
- Per-project capability comes from `project.myPermission` (`owner | edit | view`)
  returned by every `projects.*` read. UI gates off that field, not global RBAC.
- Owner = creator. Only owner sees/uses access management and delete.

## Backend dependency (must resolve before access UI)

- [x] `projects.accessGrant` currently takes `userId`. The sharing UI only knows an
  **email**. Pick one and implement before the access panel:
  - **(Recommended)** extend grant input to `{ email, permission }`; backend resolves
    email -> user (returns `USER_NOT_FOUND` if absent). Smallest UI surface, no user enumeration endpoint.
  - OR add a `users.lookupByEmail` query (leaks existence; avoid).
  Until resolved, build the access panel against email and stub the call.

## Files

### features/project/
- [x] `errors.ts` — `projectErrorMessage(err)` mapping `ProjectError.*` -> copy,
  mirroring `features/rbac/errors.ts`. Cases: FORBIDDEN, PROJECT_NOT_FOUND,
  USER_NOT_FOUND, CANNOT_GRANT_OWNER, CANNOT_GRANT_SELF.
- [x] `utils.ts` — `canEdit(p)` = `myPermission !== "view"`, `isOwner(p)` =
  `myPermission === "owner"`. Plus `VISIBILITY_LABELS` and a small color palette
  constant for the picker.
- [x] `components/ProjectCard.tsx` — card showing color swatch, name, description,
  visibility badge, and a `myPermission` chip. Links to detail.
- [x] `components/AccessPanel.tsx` — owner-only. Lists grants
  (`projects.accessList`), add-by-email form (`projects.accessGrant`),
  per-row permission select + revoke (`projects.accessRevoke`). Invalidates
  `accessList` + project `get` on success.
- [x] `components/ProjectFormFields.tsx` — shared name/description/color/visibility
  fields (used by create + edit), wired to react-hook-form.

### pages/user/
- [x] `projects/ProjectsListPage.tsx` (`/projects`) — filter tabs (all/owned/shared),
  search input, "New project" button, grid of `ProjectCard`. Uses
  `trpc.projects.list.queryOptions({ filter, search, limit, offset })`.
- [x] `projects/ProjectFormPage.tsx` (`/projects/new`, `/projects/:id/edit`) —
  create + edit via `createProjectInput` / `updateProjectInput`. On edit, load via
  `projects.get`; disable all fields if `!canEdit`; disable visibility if `!isOwner`.
  Create -> navigate to new project detail. Reuse `ProjectFormFields`.
- [x] `projects/ProjectDetailPage.tsx` (`/projects/:id`) — header (name, color,
  visibility, `myPermission`), Edit link (if `canEdit`), Delete button + confirm
  modal (if `isOwner`, `projects.delete`), and `<AccessPanel>` (if `isOwner`).
  Board/list/card content is a later feature — placeholder section for now.

### routing + nav
- [x] `App.tsx` — add under the existing `ProtectedRoute` block:
  `/projects`, `/projects/new`, `/projects/:id`, `/projects/:id/edit`.
- [x] `pages/user/HomePage.tsx` — make `/` redirect to `/projects` (or render the
  list directly). "Your boards" placeholder becomes the projects list.
- [x] `components/Nav.tsx` — add a "Projects" link to `/projects`.

## Data flow notes

- Reads return `myPermission`; never call admin endpoints. All gating is client-side
  off that field, with the backend as the real authority (FORBIDDEN/NOT_FOUND surfaced
  via `projectErrorMessage`).
- After mutations invalidate: `projects.list.queryKey()`, and for a single project
  `projects.get.queryKey({ id })`; access mutations also invalidate
  `projects.accessList.queryKey({ id })`.
- NOT_FOUND on detail/edit (private project the user lost access to) -> render a
  "Project not found or no access" state with a link back to `/projects`.

## Testing cases (vitest + @testing-library, mock trpc + react-query like RoleFormPage.test.tsx)

- [x] ProjectsListPage:
  - renders owned + shared cards from query data.
  - filter tabs pass the right `filter` arg; search input passes `search`.
  - "New project" shown for any authed user; navigates to `/projects/new`.
  - empty state when list is `[]`.
- [x] ProjectFormPage (create):
  - submits `createProjectInput` shape (name/description/color/visibility) with defaults.
  - zod errors render (empty name, bad color).
  - navigates to detail on success.
- [x] ProjectFormPage (edit):
  - prefills from `projects.get`.
  - fields disabled when `myPermission==='view'`.
  - visibility disabled when `myPermission==='edit'` (non-owner).
  - submits `updateProjectInput` patch on save.
- [x] ProjectDetailPage:
  - owner sees Edit + Delete + AccessPanel.
  - editor sees Edit, no Delete, no AccessPanel.
  - viewer sees neither Edit nor Delete.
  - delete confirm calls `projects.delete` and redirects to `/projects`.
  - NOT_FOUND query error renders the no-access state.
- [x] AccessPanel:
  - lists grants with email + permission.
  - add-by-email calls grant with `{ email|userId, permission }`.
  - CANNOT_GRANT_OWNER / CANNOT_GRANT_SELF / USER_NOT_FOUND surfaced via `projectErrorMessage`.
  - permission select change re-grants; revoke calls `projects.accessRevoke`.
- [x] errors.ts: `projectErrorMessage` maps each `ProjectError` and falls back to generic copy.
- [x] routing: `/projects/*` requires auth (redirects to `/login` when unauthenticated).

## Implementation order
- [x] 1. Resolve backend grant-by-email dependency.
- [x] 2. features/project: errors.ts, utils.ts.
- [x] 3. Shared components: ProjectFormFields, ProjectCard.
- [x] 4. Pages: ProjectsListPage -> ProjectFormPage -> ProjectDetailPage.
- [x] 5. AccessPanel.
- [x] 6. Wire routes (App.tsx), Nav link, HomePage redirect.
- [x] 7. Tests; run `pnpm --filter frontend test` until green.
