import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("projects")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("owner_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("description", "text")
    .addColumn("color", "text", (c) => c.notNull())
    .addColumn("visibility", "text", (c) => c.notNull().defaultTo("private"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("projects_owner_idx")
    .on("projects")
    .column("owner_id")
    .execute();

  await db.schema
    .createTable("project_access")
    .addColumn("project_id", "uuid", (c) =>
      c.notNull().references("projects.id").onDelete("cascade"),
    )
    .addColumn("user_id", "uuid", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("permission", "text", (c) => c.notNull())
    .addPrimaryKeyConstraint("project_access_pkey", ["project_id", "user_id"])
    .execute();

  await db.schema
    .createIndex("project_access_user_idx")
    .on("project_access")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("project_access").ifExists().execute();
  await db.schema.dropTable("projects").ifExists().execute();
}
