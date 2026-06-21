import type { Kysely } from "kysely";
import type { Database } from "../../db/types.js";

export type Db = Kysely<Database>;

export function findCardById(db: Db, id: string) {
  return db.selectFrom("cards").selectAll().where("id", "=", id).executeTakeFirst();
}

export function findColumnById(db: Db, id: string) {
  return db.selectFrom("columns").selectAll().where("id", "=", id).executeTakeFirst();
}

export function createComment(
  db: Db,
  input: {
    cardId: string;
    authorId: string;
    parentId: string | null;
    body: string;
  },
) {
  return db
    .insertInto("comments")
    .values({
      card_id: input.cardId,
      author_id: input.authorId,
      parent_id: input.parentId,
      body: input.body,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findCommentById(db: Db, id: string) {
  return db
    .selectFrom("comments")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export function listByCard(db: Db, cardId: string) {
  return db
    .selectFrom("comments")
    .innerJoin("users", "users.id", "comments.author_id")
    .select([
      "comments.id as id",
      "comments.card_id as card_id",
      "comments.author_id as author_id",
      "comments.parent_id as parent_id",
      "comments.body as body",
      "comments.created_at as created_at",
      "comments.updated_at as updated_at",
      "users.email as author_email",
    ])
    .where("comments.card_id", "=", cardId)
    .orderBy("comments.created_at", "asc")
    .execute();
}

export function updateComment(db: Db, id: string, body: string) {
  return db
    .updateTable("comments")
    .set({ body, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export function deleteComment(db: Db, id: string) {
  return db.deleteFrom("comments").where("id", "=", id).execute();
}

export async function insertMentions(
  db: Db,
  commentId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;
  await db
    .insertInto("comment_mentions")
    .values(userIds.map((user_id) => ({ comment_id: commentId, user_id })))
    .onConflict((oc) => oc.columns(["comment_id", "user_id"]).doNothing())
    .execute();
}

export function listMentionsForComments(db: Db, commentIds: string[]) {
  if (commentIds.length === 0) return Promise.resolve([]);
  return db
    .selectFrom("comment_mentions")
    .innerJoin("users", "users.id", "comment_mentions.user_id")
    .select([
      "comment_mentions.comment_id as comment_id",
      "users.id as user_id",
      "users.email as email",
    ])
    .where("comment_mentions.comment_id", "in", commentIds)
    .execute();
}

// Resolve board members (board grants + owner + project inheritance) by the
// local-part token of their email (used for @mentions and reminders).
export async function listBoardMembers(db: Db, boardId: string) {
  const board = await db
    .selectFrom("boards")
    .select(["owner_id", "project_id"])
    .where("id", "=", boardId)
    .executeTakeFirst();
  if (!board) return [];
  const ids = new Set<string>([board.owner_id]);

  const project = await db
    .selectFrom("projects")
    .select(["owner_id"])
    .where("id", "=", board.project_id)
    .executeTakeFirst();
  if (project) ids.add(project.owner_id);

  const boardGrants = await db
    .selectFrom("board_access")
    .select(["user_id"])
    .where("board_id", "=", boardId)
    .execute();
  for (const g of boardGrants) ids.add(g.user_id);

  const projectGrants = await db
    .selectFrom("project_access")
    .select(["user_id"])
    .where("project_id", "=", board.project_id)
    .execute();
  for (const g of projectGrants) ids.add(g.user_id);

  return db
    .selectFrom("users")
    .select(["id", "email"])
    .where("id", "in", [...ids])
    .execute();
}

// Batch comment counts for a set of cards, for board getData (no N+1).
export async function countByCards(
  db: Db,
  cardIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (cardIds.length === 0) return out;
  const rows = await db
    .selectFrom("comments")
    .select((eb) => ["card_id", eb.fn.countAll<string>().as("c")])
    .where("card_id", "in", cardIds)
    .groupBy("card_id")
    .execute();
  for (const r of rows as { card_id: string; c: string }[]) {
    out.set(r.card_id, Number(r.c));
  }
  return out;
}
