export const ChecklistError = {
  FORBIDDEN: "FORBIDDEN",
  CHECKLIST_NOT_FOUND: "CHECKLIST_NOT_FOUND",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  CARD_NOT_FOUND: "CARD_NOT_FOUND",
} as const;
export type ChecklistError = (typeof ChecklistError)[keyof typeof ChecklistError];
