import { z } from "zod";
import {
  commentSchema,
  commentThreadSchema,
  createCommentInput,
  listCommentsInput,
  okSchema,
  updateCommentInput,
} from "shared";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import * as comment from "./comment.service.js";

const idInput = z.object({ id: z.string() });

const user = (ctx: { user: { id: string; isSuperuser: boolean } }) => ({
  id: ctx.user.id,
  isSuperuser: ctx.user.isSuperuser,
});

export const commentsRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/comments", tags: ["comments"], protect: true, summary: "List a card's comments (threaded)" } })
    .input(listCommentsInput)
    .output(z.array(commentThreadSchema))
    .query(({ ctx, input }) => comment.listComments(ctx.db, user(ctx), input.cardId)),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/comments", tags: ["comments"], protect: true, summary: "Create a comment" } })
    .input(createCommentInput)
    .output(commentSchema)
    .mutation(({ ctx, input }) =>
      comment.createComment(ctx.db, user(ctx), ctx.email, input),
    ),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/comments/{id}", tags: ["comments"], protect: true, summary: "Edit own comment" } })
    .input(idInput.merge(updateCommentInput))
    .output(commentSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return comment.updateComment(ctx.db, user(ctx), id, patch);
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/comments/{id}", tags: ["comments"], protect: true, summary: "Delete a comment" } })
    .input(idInput)
    .output(okSchema)
    .mutation(({ ctx, input }) => comment.deleteComment(ctx.db, user(ctx), input.id)),
});
