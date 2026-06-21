import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("cards")
    .addColumn("due_at", "timestamptz")
    .addColumn("reminder_minutes", "integer")
    .addColumn("reminder_sent_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("cards_due_at_idx")
    .on("cards")
    .column("due_at")
    .where(sql.ref("due_at"), "is not", null)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("cards_due_at_idx").ifExists().execute();
  await db.schema
    .alterTable("cards")
    .dropColumn("due_at")
    .dropColumn("reminder_minutes")
    .dropColumn("reminder_sent_at")
    .execute();
}
