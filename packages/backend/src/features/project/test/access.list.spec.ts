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

describe("projects.accessList", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("lets the owner list grants with emails", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const a = await seedUser(db, { email: "a@example.com", verified: true });
    const b = await seedUser(db, { email: "b@example.com", verified: true });
    const p = await seedProject(db, { ownerId: user.id });
    await seedAccess(db, p.id, a.id, ProjectPermission.Edit);
    await seedAccess(db, p.id, b.id, ProjectPermission.View);

    const res = await caller.projects.accessList({ id: p.id });
    expect(res).toEqual([
      { userId: a.id, email: "a@example.com", permission: ProjectPermission.Edit },
      { userId: b.id, email: "b@example.com", permission: ProjectPermission.View },
    ]);
  });

  it("forbids a non-owner (viewer) from listing", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const viewer = await seedUser(db, { email: "v@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    await seedAccess(db, p.id, viewer.id, ProjectPermission.View);
    await expect(
      authedCaller(db, viewer.id).projects.accessList({ id: p.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("hides a private project from a non-member with NOT_FOUND", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const { caller } = await seedUserCaller(db, "stranger@example.com");
    const p = await seedProject(db, { ownerId: owner.id });
    await expect(caller.projects.accessList({ id: p.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
