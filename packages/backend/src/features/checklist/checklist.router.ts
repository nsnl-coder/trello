import { z } from "zod";
import {
  checklistItemSchema,
  checklistSchema,
  createChecklistInput,
  createChecklistItemInput,
  moveChecklistItemInput,
  okSchema,
  updateChecklistInput,
  updateChecklistItemInput,
} from "shared";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import * as checklist from "./checklist.service.js";

const idInput = z.object({ id: z.string() });
const cardIdInput = z.object({ cardId: z.string() });

const user = (ctx: { user: { id: string; isSuperuser: boolean } }) => ({
  id: ctx.user.id,
  isSuperuser: ctx.user.isSuperuser,
});

export const checklistsRouter = router({
  listByCard: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/checklists", tags: ["checklists"], protect: true, summary: "List checklists for a card" } })
    .input(cardIdInput)
    .output(z.array(checklistSchema))
    .query(({ ctx, input }) =>
      checklist.listByCard(ctx.db, user(ctx), input.cardId),
    ),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/checklists", tags: ["checklists"], protect: true, summary: "Create a checklist" } })
    .input(createChecklistInput)
    .output(checklistSchema)
    .mutation(({ ctx, input }) =>
      checklist.createChecklist(ctx.db, user(ctx), input),
    ),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/checklists/{id}", tags: ["checklists"], protect: true, summary: "Rename a checklist" } })
    .input(idInput.merge(updateChecklistInput))
    .output(checklistSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return checklist.updateChecklist(ctx.db, user(ctx), id, patch);
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/checklists/{id}", tags: ["checklists"], protect: true, summary: "Delete a checklist and its items" } })
    .input(idInput)
    .output(okSchema)
    .mutation(({ ctx, input }) =>
      checklist.deleteChecklist(ctx.db, user(ctx), input.id),
    ),
});

export const checklistItemsRouter = router({
  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/checklist-items", tags: ["checklist-items"], protect: true, summary: "Create a checklist item" } })
    .input(createChecklistItemInput)
    .output(checklistItemSchema)
    .mutation(({ ctx, input }) =>
      checklist.createItem(ctx.db, user(ctx), input),
    ),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/checklist-items/{id}", tags: ["checklist-items"], protect: true, summary: "Update a checklist item" } })
    .input(idInput.merge(updateChecklistItemInput))
    .output(checklistItemSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return checklist.updateItem(ctx.db, user(ctx), id, patch);
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/checklist-items/{id}", tags: ["checklist-items"], protect: true, summary: "Delete a checklist item" } })
    .input(idInput)
    .output(okSchema)
    .mutation(({ ctx, input }) =>
      checklist.deleteItem(ctx.db, user(ctx), input.id),
    ),

  move: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/checklist-items/{id}/move", tags: ["checklist-items"], protect: true, summary: "Reorder a checklist item" } })
    .input(idInput.merge(moveChecklistItemInput))
    .output(checklistItemSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...move } = input;
      return checklist.moveItem(ctx.db, user(ctx), id, move);
    }),
});
