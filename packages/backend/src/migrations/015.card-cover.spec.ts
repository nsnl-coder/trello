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
import { up as up013 } from "./013.attachment.js";
import { down, up } from "./015.card-cover.js";

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

describe("015 card-cover migration", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = freshDb();
    await up001(db);
    await up003(db);
    await up004(db);
    await up005(db);
    await up006(db);
    await up013(db);
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
    return { card, user };
  }

  it("up adds cover_color and cover_attachment_id (null by default)", async () => {
    const { card } = await seedTree();
    const row = await db
      .selectFrom("cards")
      .select(["cover_color", "cover_attachment_id"])
      .where("id", "=", card.id)
      .executeTakeFirstOrThrow();
    expect(row.cover_color).toBeNull();
    expect(row.cover_attachment_id).toBeNull();
  });

  it("accepts a color cover and an image (attachment) cover", async () => {
    const { card, user } = await seedTree();
    await db
      .updateTable("cards")
      .set({ cover_color: "blue" })
      .where("id", "=", card.id)
      .execute();
    let row = await db
      .selectFrom("cards")
      .select(["cover_color", "cover_attachment_id"])
      .where("id", "=", card.id)
      .executeTakeFirstOrThrow();
    expect(row.cover_color).toBe("blue");

    const att = await db
      .insertInto("attachments")
      .values({
        card_id: card.id,
        uploader_id: user.id,
        filename: "a.png",
        mime_type: "image/png",
        size_bytes: 1,
        storage_key: "cards/x/a.png",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .updateTable("cards")
      .set({ cover_color: null, cover_attachment_id: att.id })
      .where("id", "=", card.id)
      .execute();
    row = await db
      .selectFrom("cards")
      .select(["cover_color", "cover_attachment_id"])
      .where("id", "=", card.id)
      .executeTakeFirstOrThrow();
    expect(row.cover_attachment_id).toBe(att.id);
  });

  // KEY assertion: deleting the referenced attachment must null the FK column
  // (ON DELETE SET NULL). pg-mem's FK-action support is partial; if this fails,
  // the service-level clear (cardRepo.clearCoverForAttachment in
  // deleteAttachment) is the engine-independent safety net.
  it("ON DELETE SET NULL nulls cover_attachment_id when the attachment is deleted", async () => {
    const { card, user } = await seedTree();
    const att = await db
      .insertInto("attachments")
      .values({
        card_id: card.id,
        uploader_id: user.id,
        filename: "a.png",
        mime_type: "image/png",
        size_bytes: 1,
        storage_key: "cards/x/a.png",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .updateTable("cards")
      .set({ cover_attachment_id: att.id })
      .where("id", "=", card.id)
      .execute();

    await db.deleteFrom("attachments").where("id", "=", att.id).execute();

    const row = await db
      .selectFrom("cards")
      .select(["cover_attachment_id"])
      .where("id", "=", card.id)
      .executeTakeFirstOrThrow();
    expect(row.cover_attachment_id).toBeNull();
  });

  it("down drops both cover columns", async () => {
    await down(db);
    await expect(
      sql`select cover_color from ${sql.table("cards")}`.execute(db),
    ).rejects.toThrow();
  });
});
