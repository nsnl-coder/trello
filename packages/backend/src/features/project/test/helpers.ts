import {
  DEFAULT_PROJECT_COLOR,
  ProjectVisibility,
  type ProjectPermission,
  type ProjectVisibility as Visibility,
} from "shared";
import {
  createCaller,
  makeContext,
  newTestDb,
  seedUser,
  type TestDb,
} from "../../auth/test/helpers.js";

export {
  createCaller,
  makeContext,
  newTestDb,
  seedUser,
  type TestDb,
} from "../../auth/test/helpers.js";

export type AppCaller = ReturnType<typeof createCaller>;

/** Authenticated caller for a given user id (auth via ctx.userId). */
export function authedCaller(db: TestDb, userId: string) {
  return createCaller(makeContext({ db, userId }));
}

/** Seed a verified user and return its authed caller. */
export async function seedUserCaller(db: TestDb, email: string) {
  const user = await seedUser(db, { email, verified: true });
  return { user, caller: authedCaller(db, user.id) };
}

/** Seed the single allowed superuser and return its authed caller. */
export async function superuserCaller(db: TestDb, email = "root@example.com") {
  const su = await seedUser(db, { email, isSuperuser: true, verified: true });
  return { user: su, caller: authedCaller(db, su.id) };
}

export interface SeedProjectOpts {
  ownerId: string;
  name?: string;
  description?: string | null;
  color?: string;
  visibility?: Visibility;
}

export async function seedProject(db: TestDb, opts: SeedProjectOpts) {
  return db
    .insertInto("projects")
    .values({
      owner_id: opts.ownerId,
      name: opts.name ?? "My Project",
      description: opts.description ?? null,
      color: opts.color ?? DEFAULT_PROJECT_COLOR,
      visibility: opts.visibility ?? ProjectVisibility.Private,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function seedAccess(
  db: TestDb,
  projectId: string,
  userId: string,
  permission: ProjectPermission,
) {
  await db
    .insertInto("project_access")
    .values({ project_id: projectId, user_id: userId, permission })
    .execute();
}
