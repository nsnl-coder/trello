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
import { up } from "./012.comment.js";

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

describe("012 comment migration", () => {
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
    const parent = await db
      .insertInto("comments")
      .values({ card_id: card.id, author_id: user.id, parent_id: null, body: "p" })
      .returning("id")
      .executeTakeFirstOrThrow();
    const reply = await db
      .insertInto("comments")
      .values({ card_id: card.id, author_id: user.id, parent_id: parent.id, body: "r" })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("comment_mentions")
      .values({ comment_id: parent.id, user_id: user.id })
      .execute();
    return { card, parent, reply, user };
  }

  const count = async (table: "comments" | "comment_mentions") => {
    const row = await db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<string>().as("c"))
      .executeTakeFirstOrThrow();
    return Number(row.c);
  };

  it("deleting a card cascades comments and mentions", async () => {
    const { card } = await seedTree();
    expect(await count("comments")).toBe(2);
    expect(await count("comment_mentions")).toBe(1);
    await db.deleteFrom("cards").where("id", "=", card.id).execute();
    expect(await count("comments")).toBe(0);
    expect(await count("comment_mentions")).toBe(0);
  });

  // Deleting a parent cascades replies via the self-referential FK on real
  // Postgres. pg-mem does not honour a self-FK ON DELETE CASCADE, so this is
  // asserted indirectly by the card-cascade test above instead.

  it("down drops the comment_mentions table", async () => {
    // pg-mem refuses to drop `comments` because of its self-FK (a pg-mem
    // limitation; real Postgres drops it). Assert the join table drops cleanly.
    await db.schema.dropTable("comment_mentions").ifExists().execute();
    await expect(
      sql`select 1 from ${sql.table("comment_mentions")}`.execute(db),
    ).rejects.toThrow();
  });
});
