import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("labels")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("board_id", "uuid", (c) =>
      c.notNull().references("boards.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("color", "text", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("labels_board_idx")
    .on("labels")
    .column("board_id")
    .execute();

  await db.schema
    .createTable("card_labels")
    .addColumn("card_id", "uuid", (c) =>
      c.notNull().references("cards.id").onDelete("cascade"),
    )
    .addColumn("label_id", "uuid", (c) =>
      c.notNull().references("labels.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("card_labels_pkey", ["card_id", "label_id"])
    .execute();

  await db.schema
    .createIndex("card_labels_label_idx")
    .on("card_labels")
    .column("label_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("card_labels").ifExists().execute();
  await db.schema.dropTable("labels").ifExists().execute();
}
