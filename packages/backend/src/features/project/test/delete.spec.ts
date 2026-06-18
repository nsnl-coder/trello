import { ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authedCaller,
  newTestDb,
  seedAccess,
  seedProject,
  seedUser,
  seedUserCaller,
  type TestDb,
} from "./helpers.js";

describe("projects.delete", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("lets the owner delete and cascades access rows", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: user.id });
    await seedAccess(db, p.id, member.id, ProjectPermission.Edit);

    const res = await caller.projects.delete({ id: p.id });
    expect(res).toEqual({ ok: true });

    const rows = await db
      .selectFrom("projects")
      .select("id")
      .where("id", "=", p.id)
      .execute();
    expect(rows).toHaveLength(0);
    const access = await db
      .selectFrom("project_access")
      .select("user_id")
      .where("project_id", "=", p.id)
      .execute();
    expect(access).toHaveLength(0);
  });

  it("forbids an editor from deleting", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    await seedAccess(db, p.id, member.id, ProjectPermission.Edit);
    await expect(
      authedCaller(db, member.id).projects.delete({ id: p.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("hides a private project from a non-member with NOT_FOUND", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const { caller } = await seedUserCaller(db, "stranger@example.com");
    const p = await seedProject(db, { ownerId: owner.id });
    await expect(caller.projects.delete({ id: p.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
