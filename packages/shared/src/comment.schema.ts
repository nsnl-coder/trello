import { z } from "zod";

export const COMMENT_BODY_MAX = 5000;

const bodySchema = z.string().trim().min(1).max(COMMENT_BODY_MAX);

export const createCommentInput = z.object({
  cardId: z.string(),
  body: bodySchema,
  parentId: z.string().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentInput>;

export const updateCommentInput = z.object({ body: bodySchema });
export type UpdateCommentInput = z.infer<typeof updateCommentInput>;

export const listCommentsInput = z.object({ cardId: z.string() });
export type ListCommentsInput = z.infer<typeof listCommentsInput>;

export const commentAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
});

export const commentMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const commentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  authorId: z.string(),
  parentId: z.string().nullable(),
  body: z.string(),
  author: commentAuthorSchema,
  mentions: z.array(commentMentionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Comment = z.infer<typeof commentSchema>;

export const commentThreadSchema = commentSchema.extend({
  replies: z.array(commentSchema),
});
export type CommentThread = z.infer<typeof commentThreadSchema>;

// Extract unique @mention tokens from a comment body. Shared by FE/BE.
// A token is the run of word chars/dots/hyphens after an @ at a word boundary.
export function parseMentions(body: string): string[] {
  const out = new Set<string>();
  const re = /(?:^|\s)@([\w.-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.add(m[1]);
  return [...out];
}
