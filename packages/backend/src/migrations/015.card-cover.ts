import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("cards")
    .addColumn("cover_color", "text")
    .addColumn("cover_attachment_id", "uuid", (c) =>
      c.references("attachments.id").onDelete("set null"),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("cards")
    .dropColumn("cover_attachment_id")
    .dropColumn("cover_color")
    .execute();
}
