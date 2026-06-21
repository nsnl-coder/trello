import crypto from "node:crypto";
import { Kysely, PostgresDialect, sql } from "kysely";
import { DataType, newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../db/types.js";
import { up as up001 } from "./001.auth.js";
import { up as up003 } from "./003.project.js";
import { up as up004 } from "./004.board.js";
import { up as up005 } from "./005.column.js";
import { up as up006 } from "./006.card.js";
import { down, up } from "./009.label.js";

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

describe("009 label migration", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = freshDb();
    await up001(db);
    await up003(db);
    await up004(db);
    await up005(db);
    await up006(db);
    await up(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  async function seedTree() {
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
    const card = await db
      .insertInto("cards")
      .values({ column_id: column.id, title: "T", position: 1 })
      .returning("id")
      .executeTakeFirstOrThrow();
    const label = await db
      .insertInto("labels")
      .values({ board_id: board.id, name: "L", color: "#61bd4f" })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("card_labels")
      .values({ card_id: card.id, label_id: label.id })
      .execute();
    return { board, card, label };
  }

  const count = async (table: "labels" | "card_labels") => {
    const row = await db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<string>().as("c"))
      .executeTakeFirstOrThrow();
    return Number(row.c);
  };

  it("deleting a board cascades labels and card_labels", async () => {
    const { board } = await seedTree();
    expect(await count("labels")).toBe(1);
    expect(await count("card_labels")).toBe(1);
    await db.deleteFrom("boards").where("id", "=", board.id).execute();
    expect(await count("labels")).toBe(0);
    expect(await count("card_labels")).toBe(0);
  });

  it("deleting a label removes its card links", async () => {
    const { label } = await seedTree();
    await db.deleteFrom("labels").where("id", "=", label.id).execute();
    expect(await count("card_labels")).toBe(0);
  });

  it("down drops labels and card_labels tables", async () => {
    await down(db);
    for (const table of ["labels", "card_labels"]) {
      await expect(
        sql`select 1 from ${sql.table(table)}`.execute(db),
      ).rejects.toThrow();
    }
  });
});
