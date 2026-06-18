import { ProjectError, ProjectPermission, ProjectVisibility } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  newTestDb,
  seedProject,
  seedUser,
  superuserCaller,
  type TestDb,
} from "./helpers.js";

describe("projects superuser override", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("grants owner-level access to a private project it does not own", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const p = await seedProject(db, {
      ownerId: owner.id,
      visibility: ProjectVisibility.Private,
    });
    const { caller } = await superuserCaller(db);

    const got = await caller.projects.get({ id: p.id });
    expect(got.myPermission).toBe("owner");

    const updated = await caller.projects.update({ id: p.id, name: "Renamed" });
    expect(updated.name).toBe("Renamed");

    await seedUser(db, { email: "m@example.com", verified: true });
    const grants = await caller.projects.accessGrant({
      id: p.id,
      email: "m@example.com",
      permission: ProjectPermission.View,
    });
    expect(grants).toHaveLength(1);

    const del = await caller.projects.delete({ id: p.id });
    expect(del).toEqual({ ok: true });
  });

  it("rejects a superuser granting access to itself with CANNOT_GRANT_SELF", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    const { caller } = await superuserCaller(db, "root@example.com");
    await expect(
      caller.projects.accessGrant({
        id: p.id,
        email: "root@example.com",
        permission: ProjectPermission.Edit,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: ProjectError.CANNOT_GRANT_SELF,
    });
  });
});
