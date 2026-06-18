# Project — Backend Plan

CRUD for projects + per-project access control (view / edit).

## Decisions (locked)

- Access = **permissions only, no roles**. Two grants: `view`, `edit`.
- **Owner = creator** (`owner_id`). Owner is implicit, never stored as a grant.
  Owner has full rights: read, edit, manage access, delete.
- **Any authenticated (verified) user can create** a project. No global permission gate.
- Project fields: `name`, `description`, `color`, `visibility`.
- This is project-**scoped** access, independent of the global RBAC catalog.
  Existing `globalProcedure` does NOT apply; authz is resolved per project in the service.

## Effective permission resolution

For a `(userId, project)` pair resolve one of: `owner | edit | view | null`.

1. `superuser` -> `owner`-level (global override, matches app's all-powerful superuser).
2. `userId === project.owner_id` -> `owner`.
3. `project_access` row exists -> its permission (`edit` or `view`).
4. `project.visibility === 'public'` -> `view`.
5. else -> `null`.

Authz rules per action:
- read (get/list): needs `view+`. Private project with `null` -> `PROJECT_NOT_FOUND` (no existence leak).
- update content: needs `edit+`.
- change `visibility` / transfer-like owner-only fields: `owner` only.
- delete: `owner` only.
- manage access (grant/revoke/list members): `owner` only.

## Data model

### migrations/003.project.ts

`projects`:
- `id` uuid pk default `gen_random_uuid()`
- `owner_id` uuid not null, references `users.id` on delete cascade
- `name` text not null
- `description` text null
- `color` text not null (hex, validated in zod)
- `visibility` text not null default `'private'`
- `created_at` / `updated_at` timestamptz not null default now()
- index on `owner_id`

`project_access`:
- `project_id` uuid not null, references `projects.id` on delete cascade
- `user_id` uuid not null, references `users.id` on delete cascade
- `permission` text not null  (`'view' | 'edit'`)
- primary key (`project_id`, `user_id`)  — one grant per user per project
- index on `user_id` (for "projects shared with me" lookup)

`down`: drop `project_access` then `projects`.

### db/types.ts

Add:
```ts
export interface ProjectsTable {
  id: Generated<string>;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  visibility: Generated<ProjectVisibility>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}
export interface ProjectAccessTable {
  project_id: string;
  user_id: string;
  permission: ProjectPermission;
}
```
Register `projects` and `project_access` in `Database`. Import `ProjectVisibility`,
`ProjectPermission` types from `shared`.

## Shared package

### shared/src/project.schema.ts
- `ProjectPermission = { View: 'view', Edit: 'edit' } as const` + type + `projectPermissionSchema = z.enum([...])`.
- `ProjectVisibility = { Private: 'private', Public: 'public' } as const` + type + `projectVisibilitySchema`.
- name limits: `PROJECT_NAME_MIN=1`, `PROJECT_NAME_MAX=100`; description max 2000.
- `projectColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)`.
- `createProjectInput`: `{ name, description?, color (default e.g. '#4f46e5'), visibility? default private }`.
- `updateProjectInput`: all optional (`name?`, `description? nullable`, `color?`, `visibility?`).
- `grantAccessInput`: `{ userId: string, permission: projectPermissionSchema }`.
- `revokeAccessInput`: `{ userId: string }`.
- `listProjectsInput`: `{ filter?: 'all'|'owned'|'shared' default 'all', search?, limit (1..100 default 20), offset }`.
- Output schemas:
  - `projectSchema`: `id, ownerId, name, description, color, visibility, myPermission ('owner'|'edit'|'view'), createdAt, updatedAt`.
  - `projectAccessEntrySchema`: `{ userId, email, permission }`.
- Export inferred types.

### shared/src/errors/project.error.ts
```ts
export const ProjectError = {
  FORBIDDEN: "FORBIDDEN",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  CANNOT_GRANT_OWNER: "CANNOT_GRANT_OWNER",
  CANNOT_GRANT_SELF: "CANNOT_GRANT_SELF",
} as const;
```

### shared/src/index.ts
Export `./project.schema.js` and `./errors/project.error.js`.

## Backend feature: features/project/

### project.repo.ts
- `createProject(db, { ownerId, name, description, color, visibility })`
- `findProjectById(db, id)`
- `listProjectsForUser(db, userId, opts)` — owned UNION shared, plus filter/search/paginate.
  (public-but-not-shared projects are NOT auto-listed; reachable by direct get.)
- `updateProject(db, id, patch)` (sets `updated_at`)
- `deleteProject(db, id)`
- `findAccess(db, projectId, userId)` -> permission | undefined
- `listAccess(db, projectId)` -> join users for email
- `upsertAccess(db, projectId, userId, permission)` (insert ... on conflict update)
- `deleteAccess(db, projectId, userId)`

### project.service.ts
- `resolvePermission(db, project, ctxUser)` -> `'owner'|'edit'|'view'|null` (rules above).
- `toProject(row, myPermission)` -> output shape.
- `getProject(db, user, id)`: load row or `PROJECT_NOT_FOUND`; resolve; `view+` else NOT_FOUND.
- `listProjects(db, user, input)`: repo list; attach `myPermission` (owner/edit/view) per row.
- `createProject(db, user, input)`: insert with `owner_id=user.id`; return with `myPermission='owner'`.
- `updateProject(db, user, id, patch)`: require `edit+`; if patch changes `visibility` require `owner`.
- `deleteProject(db, user, id)`: require `owner`; return `{ ok: true }`.
- `listAccess(db, user, id)`: require `owner`.
- `grantAccess(db, user, id, { userId, permission })`: require `owner`;
  reject `userId === owner_id` (CANNOT_GRANT_OWNER), `userId === user.id` (CANNOT_GRANT_SELF),
  unknown user (USER_NOT_FOUND); upsert.
- `revokeAccess(db, user, id, { userId })`: require `owner`; delete grant (idempotent ok).

Map domain errors to `TRPCError`: NOT_FOUND, FORBIDDEN, BAD_REQUEST (grant rules), like rbac.service.

### project.router.ts (`projectsRouter`, all `protectedProcedure`)
| proc | method/path | input | output | authz |
|---|---|---|---|---|
| list | GET /projects | listProjectsInput | Project[] | view-of-each |
| get | GET /projects/{id} | {id} | Project | view+ |
| create | POST /projects | createProjectInput | Project | authed |
| update | PATCH /projects/{id} | {id}+updateProjectInput | Project | edit+ (owner for visibility) |
| delete | DELETE /projects/{id} | {id} | ok | owner |
| accessList | GET /projects/{id}/access | {id} | AccessEntry[] | owner |
| accessGrant | PUT /projects/{id}/access | {id}+grantAccessInput | AccessEntry[] | owner |
| accessRevoke | DELETE /projects/{id}/access/{userId} | {id,userId} | AccessEntry[] | owner |

All `.meta({ openapi: { ..., tags: ["projects"], protect: true } })` like rbac router.
Use `protectedProcedure` (not `globalProcedure`) so `ctx.user` is available for per-project checks.

### trpc/router.ts
Add `projects: projectsRouter`.

## Tests (features/project/test/, in-memory pg)

Reuse `seedUser`, `authedCaller`, `superuserCaller`, `noPermsCaller` from rbac/auth test helpers.
Add `project/test/helpers.ts` with `seedProject(db, {ownerId,...})` and `seedAccess(db, projectId, userId, perm)`.

- [x] create.spec: authed user creates, becomes owner, myPermission=owner; color/visibility defaults apply; invalid name/color rejected (BAD_REQUEST).
- [x] get.spec: owner/edit/view can read; non-member private -> NOT_FOUND; public -> view; myPermission reflects grant.
- [x] list.spec: returns owned + shared; filter owned/shared; search; pagination (limit/offset); excludes others' private; empty when none.
- [x] update.spec: edit can update content; viewer FORBIDDEN; non-member private -> NOT_FOUND; non-owner cannot change visibility (FORBIDDEN); owner changes visibility; updated_at bumps.
- [x] delete.spec: owner deletes; editor/viewer FORBIDDEN; non-member private -> NOT_FOUND; cascade removes project_access rows.
- [x] access.grant.spec: owner grants view/edit; upsert changes existing permission; CANNOT_GRANT_OWNER; CANNOT_GRANT_SELF; USER_NOT_FOUND; non-owner (edit/view) FORBIDDEN; returns updated entry list.
- [x] access.revoke.spec: owner revokes; revoked user loses access (subsequent get NOT_FOUND for private); idempotent on missing grant; non-owner FORBIDDEN.
- [x] access.list.spec: owner sees entries with email; non-owner (edit/view) FORBIDDEN; non-member NOT_FOUND.
- [x] superuser.spec: superuser has owner-level access (read/update/delete/manage) to any project including private it does not own.
- [x] auth.spec: unauthenticated caller -> UNAUTHORIZED (SESSION_EXPIRED) on each procedure.

## Implementation order
- [x] 1. shared: project.schema.ts + project.error.ts + index exports.
- [x] 2. db/types.ts tables + Database registration.
- [x] 3. migrations/003.project.ts.
- [x] 4. project.repo.ts -> project.service.ts -> project.router.ts.
- [x] 5. Wire into trpc/router.ts.
- [x] 6. test/helpers.ts + spec files; run migrate + tests until green.
