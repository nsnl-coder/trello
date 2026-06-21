import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("comments")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("card_id", "uuid", (c) =>
      c.notNull().references("cards.id").onDelete("cascade"),
    )
    .addColumn("author_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("parent_id", "uuid", (c) =>
      c.references("comments.id").onDelete("cascade"),
    )
    .addColumn("body", "text", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("comments_card_idx")
    .on("comments")
    .column("card_id")
    .execute();

  await db.schema
    .createIndex("comments_parent_idx")
    .on("comments")
    .column("parent_id")
    .execute();

  await db.schema
    .createTable("comment_mentions")
    .addColumn("comment_id", "uuid", (c) =>
      c.notNull().references("comments.id").onDelete("cascade"),
    )
    .addColumn("user_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("comment_mentions_pkey", ["comment_id", "user_id"])
    .execute();

  await db.schema
    .createIndex("comment_mentions_user_idx")
    .on("comment_mentions")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("comment_mentions").ifExists().execute();
  await db.schema.dropTable("comments").ifExists().execute();
}
