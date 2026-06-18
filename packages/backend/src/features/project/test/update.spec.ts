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

describe("projects.update", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("lets the owner update content and bumps updated_at", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const p = await seedProject(db, { ownerId: user.id, name: "Old" });
    const res = await caller.projects.update({ id: p.id, name: "New" });
    expect(res.name).toBe("New");
    expect(res.updatedAt.getTime()).toBeGreaterThanOrEqual(p.updated_at.getTime());
  });

  it("lets an edit-grantee update content", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    await seedAccess(db, p.id, member.id, ProjectPermission.Edit);
    const res = await authedCaller(db, member.id).projects.update({
      id: p.id,
      name: "Edited",
    });
    expect(res.name).toBe("Edited");
  });

  it("forbids a viewer from updating", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    await seedAccess(db, p.id, member.id, ProjectPermission.View);
    await expect(
      authedCaller(db, member.id).projects.update({ id: p.id, name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: ProjectError.FORBIDDEN });
  });

  it("hides a private project from a non-member with NOT_FOUND", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const { caller } = await seedUserCaller(db, "stranger@example.com");
    const p = await seedProject(db, { ownerId: owner.id });
    await expect(
      caller.projects.update({ id: p.id, name: "Nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("forbids a non-owner from changing visibility", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    await seedAccess(db, p.id, member.id, ProjectPermission.Edit);
    await expect(
      authedCaller(db, member.id).projects.update({
        id: p.id,
        visibility: ProjectVisibility.Public,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets the owner change visibility", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const p = await seedProject(db, { ownerId: user.id });
    const res = await caller.projects.update({
      id: p.id,
      visibility: ProjectVisibility.Public,
    });
    expect(res.visibility).toBe(ProjectVisibility.Public);
  });
});
