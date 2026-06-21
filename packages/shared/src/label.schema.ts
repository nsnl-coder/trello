import { z } from "zod";

export const LABEL_NAME_MAX = 50;
export const LABEL_COLORS = [
  "#61bd4f",
  "#f2d600",
  "#ff9f1a",
  "#eb5a46",
  "#c377e0",
  "#0079bf",
  "#00c2e0",
  "#51e898",
  "#ff78cb",
  "#344563",
] as const;

const nameSchema = z.string().trim().max(LABEL_NAME_MAX);
const colorSchema = z.enum(LABEL_COLORS);

export const createLabelInput = z.object({
  boardId: z.string(),
  name: nameSchema,
  color: colorSchema,
});
export type CreateLabelInput = z.infer<typeof createLabelInput>;

export const updateLabelInput = z.object({
  name: nameSchema.optional(),
  color: colorSchema.optional(),
});
export type UpdateLabelInput = z.infer<typeof updateLabelInput>;

export const listLabelsInput = z.object({ boardId: z.string() });
export type ListLabelsInput = z.infer<typeof listLabelsInput>;

export const cardLabelInput = z.object({
  cardId: z.string(),
  labelId: z.string(),
});
export type CardLabelInput = z.infer<typeof cardLabelInput>;

export const labelSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Label = z.infer<typeof labelSchema>;
