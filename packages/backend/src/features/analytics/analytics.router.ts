import { analyticsInput, boardSummarySchema, cycleTimeSchema } from "shared";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import * as analytics from "./analytics.service.js";

const user = (ctx: { user: { id: string; isSuperuser: boolean } }) => ({
  id: ctx.user.id,
  isSuperuser: ctx.user.isSuperuser,
});

export const analyticsRouter = router({
  boardSummary: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/boards/{boardId}/analytics/summary", tags: ["analytics"], protect: true, summary: "Board analytics: cards per column, overdue, completed, avg cycle time" } })
    .input(analyticsInput)
    .output(boardSummarySchema)
    .query(({ ctx, input }) => analytics.boardSummary(ctx.db, user(ctx), input)),

  cycleTime: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/boards/{boardId}/analytics/cycle-time", tags: ["analytics"], protect: true, summary: "Board average cycle time (create -> Done) with sample size" } })
    .input(analyticsInput)
    .output(cycleTimeSchema)
    .query(({ ctx, input }) => analytics.cycleTime(ctx.db, user(ctx), input)),
});
