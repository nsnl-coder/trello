import { z } from "zod";

export const CHECKLIST_TITLE_MAX = 200;
export const CHECKLIST_ITEM_TEXT_MAX = 500;

const titleSchema = z.string().trim().min(1).max(CHECKLIST_TITLE_MAX);
const textSchema = z.string().trim().min(1).max(CHECKLIST_ITEM_TEXT_MAX);

export const createChecklistInput = z.object({
  cardId: z.string(),
  title: titleSchema,
});
export type CreateChecklistInput = z.infer<typeof createChecklistInput>;

export const updateChecklistInput = z.object({ title: titleSchema });
export type UpdateChecklistInput = z.infer<typeof updateChecklistInput>;

export const createChecklistItemInput = z.object({
  checklistId: z.string(),
  text: textSchema,
});
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemInput>;

export const updateChecklistItemInput = z.object({
  text: textSchema.optional(),
  isDone: z.boolean().optional(),
});
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemInput>;

export const moveChecklistItemInput = z.object({
  beforeId: z.string().optional(),
  afterId: z.string().optional(),
});
export type MoveChecklistItemInput = z.infer<typeof moveChecklistItemInput>;

export const checklistItemSchema = z.object({
  id: z.string(),
  checklistId: z.string(),
  text: z.string(),
  isDone: z.boolean(),
  position: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const checklistSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  title: z.string(),
  position: z.number(),
  items: z.array(checklistItemSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Checklist = z.infer<typeof checklistSchema>;
