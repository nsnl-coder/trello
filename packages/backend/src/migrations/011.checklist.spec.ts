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
import { down, up } from "./011.checklist.js";

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

describe("011 checklist migration", () => {
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
    const checklist = await db
      .insertInto("checklists")
      .values({ card_id: card.id, title: "CL", position: 1 })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("checklist_items")
      .values({ checklist_id: checklist.id, text: "I", position: 1 })
      .execute();
    return { card, checklist };
  }

  const count = async (table: "checklists" | "checklist_items") => {
    const row = await db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<string>().as("c"))
      .executeTakeFirstOrThrow();
    return Number(row.c);
  };

  it("deleting a card cascades checklists and items", async () => {
    const { card } = await seedTree();
    expect(await count("checklists")).toBe(1);
    expect(await count("checklist_items")).toBe(1);
    await db.deleteFrom("cards").where("id", "=", card.id).execute();
    expect(await count("checklists")).toBe(0);
    expect(await count("checklist_items")).toBe(0);
  });

  it("deleting a checklist cascades its items", async () => {
    const { checklist } = await seedTree();
    await db.deleteFrom("checklists").where("id", "=", checklist.id).execute();
    expect(await count("checklist_items")).toBe(0);
  });

  it("down drops checklist tables", async () => {
    await down(db);
    for (const table of ["checklists", "checklist_items"]) {
      await expect(
        sql`select 1 from ${sql.table(table)}`.execute(db),
      ).rejects.toThrow();
    }
  });
});
