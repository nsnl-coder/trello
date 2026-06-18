import { ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  newTestDb,
  seedAccess,
  seedProject,
  seedUser,
  seedUserCaller,
  type TestDb,
} from "./helpers.js";

describe("projects.list", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("returns owned and shared projects, excluding others' private ones", async () => {
    const { user, caller } = await seedUserCaller(db, "me@example.com");
    const other = await seedUser(db, { email: "other@example.com", verified: true });
    const owned = await seedProject(db, { ownerId: user.id, name: "Owned" });
    const shared = await seedProject(db, { ownerId: other.id, name: "Shared" });
    await seedAccess(db, shared.id, user.id, ProjectPermission.View);
    await seedProject(db, { ownerId: other.id, name: "Hidden" });

    const res = await caller.projects.list({ filter: "all", limit: 20, offset: 0 });
    const ids = res.map((p) => p.id).sort();
    expect(ids).toEqual([owned.id, shared.id].sort());
    expect(res.find((p) => p.id === owned.id)?.myPermission).toBe("owner");
    expect(res.find((p) => p.id === shared.id)?.myPermission).toBe("view");
  });

  it("filter=owned returns only owned projects", async () => {
    const { user, caller } = await seedUserCaller(db, "me@example.com");
    const other = await seedUser(db, { email: "other@example.com", verified: true });
    const owned = await seedProject(db, { ownerId: user.id });
    const shared = await seedProject(db, { ownerId: other.id });
    await seedAccess(db, shared.id, user.id, ProjectPermission.Edit);

    const res = await caller.projects.list({ filter: "owned", limit: 20, offset: 0 });
    expect(res.map((p) => p.id)).toEqual([owned.id]);
  });

  it("filter=shared returns only projects shared with the caller", async () => {
    const { user, caller } = await seedUserCaller(db, "me@example.com");
    const other = await seedUser(db, { email: "other@example.com", verified: true });
    await seedProject(db, { ownerId: user.id });
    const shared = await seedProject(db, { ownerId: other.id });
    await seedAccess(db, shared.id, user.id, ProjectPermission.Edit);

    const res = await caller.projects.list({ filter: "shared", limit: 20, offset: 0 });
    expect(res.map((p) => p.id)).toEqual([shared.id]);
  });

  it("filters by search on name", async () => {
    const { user, caller } = await seedUserCaller(db, "me@example.com");
    await seedProject(db, { ownerId: user.id, name: "Alpha" });
    await seedProject(db, { ownerId: user.id, name: "Beta" });

    const res = await caller.projects.list({
      filter: "all",
      search: "alph",
      limit: 20,
      offset: 0,
    });
    expect(res.map((p) => p.name)).toEqual(["Alpha"]);
  });

  it("honors limit and offset", async () => {
    const { user, caller } = await seedUserCaller(db, "me@example.com");
    for (let i = 0; i < 3; i++) {
      await seedProject(db, { ownerId: user.id, name: `P${i}` });
    }
    const page = await caller.projects.list({ filter: "all", limit: 2, offset: 0 });
    expect(page).toHaveLength(2);
    const rest = await caller.projects.list({ filter: "all", limit: 2, offset: 2 });
    expect(rest).toHaveLength(1);
  });

  it("returns an empty array when the caller has no projects", async () => {
    const { caller } = await seedUserCaller(db, "me@example.com");
    const res = await caller.projects.list({ filter: "all", limit: 20, offset: 0 });
    expect(res).toEqual([]);
  });
});
