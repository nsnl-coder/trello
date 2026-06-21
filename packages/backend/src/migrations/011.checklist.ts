import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("checklists")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("card_id", "uuid", (c) =>
      c.notNull().references("cards.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("position", "double precision", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("checklists_card_idx")
    .on("checklists")
    .column("card_id")
    .execute();

  await db.schema
    .createTable("checklist_items")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("checklist_id", "uuid", (c) =>
      c.notNull().references("checklists.id").onDelete("cascade"),
    )
    .addColumn("text", "text", (c) => c.notNull())
    .addColumn("is_done", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("position", "double precision", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("checklist_items_checklist_idx")
    .on("checklist_items")
    .column("checklist_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("checklist_items").ifExists().execute();
  await db.schema.dropTable("checklists").ifExists().execute();
}
