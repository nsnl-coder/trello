import { DEFAULT_PROJECT_COLOR, ProjectVisibility } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newTestDb, seedUserCaller, type TestDb } from "./helpers.js";

describe("projects.create", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("creates a project owned by the caller", async () => {
    const { user, caller } = await seedUserCaller(db, "owner@example.com");
    const res = await caller.projects.create({
      name: "Roadmap",
      description: "Q3",
      color: "#ff0000",
      visibility: ProjectVisibility.Public,
    });
    expect(res.ownerId).toBe(user.id);
    expect(res.name).toBe("Roadmap");
    expect(res.myPermission).toBe("owner");
    expect(res.visibility).toBe(ProjectVisibility.Public);

    const row = await db
      .selectFrom("projects")
      .selectAll()
      .where("id", "=", res.id)
      .executeTakeFirstOrThrow();
    expect(row.owner_id).toBe(user.id);
  });

  it("applies color and visibility defaults", async () => {
    const { caller } = await seedUserCaller(db, "owner@example.com");
    const res = await caller.projects.create({ name: "Minimal" });
    expect(res.color).toBe(DEFAULT_PROJECT_COLOR);
    expect(res.visibility).toBe(ProjectVisibility.Private);
    expect(res.description).toBeNull();
  });

  it("rejects an empty name with BAD_REQUEST", async () => {
    const { caller } = await seedUserCaller(db, "owner@example.com");
    await expect(caller.projects.create({ name: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects an invalid color with BAD_REQUEST", async () => {
    const { caller } = await seedUserCaller(db, "owner@example.com");
    await expect(
      caller.projects.create({ name: "Bad", color: "red" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
