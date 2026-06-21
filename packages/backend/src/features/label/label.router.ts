import { z } from "zod";
import {
  cardLabelInput,
  createLabelInput,
  labelSchema,
  listLabelsInput,
  okSchema,
  updateLabelInput,
} from "shared";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import * as label from "./label.service.js";

const idInput = z.object({ id: z.string() });

const user = (ctx: { user: { id: string; isSuperuser: boolean } }) => ({
  id: ctx.user.id,
  isSuperuser: ctx.user.isSuperuser,
});

export const labelsRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/labels", tags: ["labels"], protect: true, summary: "List a board's labels" } })
    .input(listLabelsInput)
    .output(z.array(labelSchema))
    .query(({ ctx, input }) => label.listLabels(ctx.db, user(ctx), input.boardId)),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/labels", tags: ["labels"], protect: true, summary: "Create a label" } })
    .input(createLabelInput)
    .output(labelSchema)
    .mutation(({ ctx, input }) => label.createLabel(ctx.db, user(ctx), input)),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/labels/{id}", tags: ["labels"], protect: true, summary: "Update a label" } })
    .input(idInput.merge(updateLabelInput))
    .output(labelSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return label.updateLabel(ctx.db, user(ctx), id, patch);
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/labels/{id}", tags: ["labels"], protect: true, summary: "Delete a label" } })
    .input(idInput)
    .output(okSchema)
    .mutation(({ ctx, input }) => label.deleteLabel(ctx.db, user(ctx), input.id)),

  attach: protectedProcedure
    .meta({ openapi: { method: "PUT", path: "/cards/{cardId}/labels/{labelId}", tags: ["labels"], protect: true, summary: "Attach a label to a card" } })
    .input(cardLabelInput)
    .output(z.array(labelSchema))
    .mutation(({ ctx, input }) => label.attachLabel(ctx.db, user(ctx), input)),

  detach: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/cards/{cardId}/labels/{labelId}", tags: ["labels"], protect: true, summary: "Detach a label from a card" } })
    .input(cardLabelInput)
    .output(z.array(labelSchema))
    .mutation(({ ctx, input }) => label.detachLabel(ctx.db, user(ctx), input)),
});
