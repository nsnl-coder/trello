import crypto from "node:crypto";
import { Kysely, PostgresDialect } from "kysely";
import { DataType, newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../db/types.js";
import { up as up001 } from "./001.auth.js";
import { up as up003 } from "./003.project.js";
import { up as up004 } from "./004.board.js";
import { up as up005 } from "./005.column.js";
import { up as up006 } from "./006.card.js";
import { down, up } from "./010.card-due-date.js";

function freshDb(): Kysely<Database> {
  const mem = newDb();
  mem.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
    impure: true,
  });
  const { Pool } = mem.adapters.createPg();
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool() }) });
}

async function seedCard(db: Kysely<Database>) {
  const user = await db
    .insertInto("users")
    .values({ email: "u@example.com", password_hash: "x" })
    .returning("id")
    .executeTakeFirstOrThrow();
  const project = await db
    .insertInto("projects")
    .values({ owner_id: user.id, name: "P", color: "#000000" })
    .returning("id")
    .executeTakeFirstOrThrow();
  const board = await db
    .insertInto("boards")
    .values({ project_id: project.id, owner_id: user.id, name: "B", color: "#000000" })
    .returning("id")
    .executeTakeFirstOrThrow();
  const column = await db
    .insertInto("columns")
    .values({ board_id: board.id, name: "C", position: 1 })
    .returning("id")
    .executeTakeFirstOrThrow();
  return db
    .insertInto("cards")
    .values({ column_id: column.id, title: "T", position: 1 })
    .returning("id")
    .executeTakeFirstOrThrow();
}

describe("010 card due-date migration", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = freshDb();
    await up001(db);
    await up003(db);
    await up004(db);
    await up005(db);
    await up006(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("up adds due columns defaulting to null on existing rows", async () => {
    const card = await seedCard(db);
    await up(db);
    const row = await db
      .selectFrom("cards")
      .select(["due_at", "reminder_minutes", "reminder_sent_at"])
      .where("id", "=", card.id)
      .executeTakeFirstOrThrow();
    expect(row.due_at).toBeNull();
    expect(row.reminder_minutes).toBeNull();
    expect(row.reminder_sent_at).toBeNull();
  });

  it("down drops the due columns", async () => {
    await up(db);
    await down(db);
    await expect(
      db.selectFrom("cards").select("due_at" as never).execute(),
    ).rejects.toThrow();
  });
});
