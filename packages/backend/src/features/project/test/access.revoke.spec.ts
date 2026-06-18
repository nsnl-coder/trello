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

describe("projects.accessRevoke", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("lets the owner revoke a grant and the user loses access", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: user.id });
    await seedAccess(db, p.id, member.id, ProjectPermission.View);

    const res = await caller.projects.accessRevoke({ id: p.id, userId: member.id });
    expect(res).toEqual([]);

    await expect(
      authedCaller(db, member.id).projects.get({ id: p.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is idempotent when no grant exists", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const member = await seedUser(db, { email: "m@example.com", verified: true });
    const p = await seedProject(db, { ownerId: user.id });
    const res = await caller.projects.accessRevoke({ id: p.id, userId: member.id });
    expect(res).toEqual([]);
  });

  it("forbids a non-owner from revoking", async () => {
    const owner = await seedUser(db, { email: "owner@example.com", verified: true });
    const editor = await seedUser(db, { email: "e@example.com", verified: true });
    const viewer = await seedUser(db, { email: "v@example.com", verified: true });
    const p = await seedProject(db, { ownerId: owner.id });
    await seedAccess(db, p.id, editor.id, ProjectPermission.Edit);
    await seedAccess(db, p.id, viewer.id, ProjectPermission.View);
    await expect(
      authedCaller(db, editor.id).projects.accessRevoke({
        id: p.id,
        userId: viewer.id,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
