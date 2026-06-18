import { ProjectError, ProjectPermission, ProjectVisibility } from "shared";
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

describe("projects.get", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("returns the project for the owner with myPermission=owner", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const p = await seedProject(db, { ownerId: user.id });
    const res = await caller.projects.get({ id: p.id });
    expect(res.id).toBe(p.id);
    expect(res.myPermission).toBe("owner");
  });

  it("reflects an edit grant in myPermission", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    await seedAccess(db, p.id, member.id, ProjectPermission.Edit);
    const res = await authedCaller(db, member.id).projects.get({ id: p.id });
    expect(res.myPermission).toBe("edit");
  });

  it("lets any user view a public project", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const { caller } = await seedUserCaller(db, "stranger@example.com");
    const p = await seedProject(db, {
      ownerId: owner.id,
      visibility: ProjectVisibility.Public,
    });
    const res = await caller.projects.get({ id: p.id });
    expect(res.myPermission).toBe("view");
  });

  it("hides a private project from a non-member with NOT_FOUND", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const { caller } = await seedUserCaller(db, "stranger@example.com");
    const p = await seedProject(db, { ownerId: owner.id });
    await expect(caller.projects.get({ id: p.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: ProjectError.PROJECT_NOT_FOUND,
    });
  });

  it("returns NOT_FOUND for an unknown id", async () => {
    const { caller } = await seedUserCaller(db, "owner@example.com");
    await expect(
      caller.projects.get({ id: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
