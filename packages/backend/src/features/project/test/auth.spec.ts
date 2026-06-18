import { AuthError, ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCaller, makeContext, newTestDb, type TestDb } from "./helpers.js";

describe("projects auth guard", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  // Unauthenticated caller (no userId in context).
  const anon = () => createCaller(makeContext({ db }));
  const id = "00000000-0000-0000-0000-000000000000";

  const cases: [string, () => Promise<unknown>][] = [
    ["list", () => anon().projects.list({ filter: "all", limit: 20, offset: 0 })],
    ["get", () => anon().projects.get({ id })],
    ["create", () => anon().projects.create({ name: "X" })],
    ["update", () => anon().projects.update({ id, name: "X" })],
    ["delete", () => anon().projects.delete({ id })],
    ["accessList", () => anon().projects.accessList({ id })],
    [
      "accessGrant",
      () =>
        anon().projects.accessGrant({
          id,
          email: "x@example.com",
          permission: ProjectPermission.View,
        }),
    ],
    ["accessRevoke", () => anon().projects.accessRevoke({ id, userId: id })],
  ];

  for (const [name, call] of cases) {
    it(`${name} rejects an unauthenticated caller`, async () => {
      await expect(call()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: AuthError.SESSION_EXPIRED,
      });
    });
  }
});
