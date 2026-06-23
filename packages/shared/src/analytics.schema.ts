import { z } from "zod";

// Read-only board analytics, derived from cards + activity (no new table).
export const analyticsInput = z.object({ boardId: z.string() });
export type AnalyticsInput = z.infer<typeof analyticsInput>;

export const columnCountSchema = z.object({
  columnId: z.string(),
  columnName: z.string(),
  count: z.number().int(),
});
export type ColumnCount = z.infer<typeof columnCountSchema>;

export const boardSummarySchema = z.object({
  totalCards: z.number().int(),
  overdueCount: z.number().int(),
  completedLast7: z.number().int(),
  completedLast30: z.number().int(),
  cardsPerColumn: z.array(columnCountSchema),
  // null when no card has a measurable cycle (none entered the Done column).
  avgCycleTimeMs: z.number().nullable(),
  avgCycleTimeDays: z.number().nullable(),
});
export type BoardSummary = z.infer<typeof boardSummarySchema>;

export const cycleTimeSchema = z.object({
  avgMs: z.number().nullable(),
  avgDays: z.number().nullable(),
  // cards counted in the average (entered the Done column at least once).
  sampleSize: z.number().int(),
});
export type CycleTime = z.infer<typeof cycleTimeSchema>;
