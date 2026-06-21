export const LabelError = {
  FORBIDDEN: "FORBIDDEN",
  LABEL_NOT_FOUND: "LABEL_NOT_FOUND",
  CARD_NOT_FOUND: "CARD_NOT_FOUND",
  BOARD_NOT_FOUND: "BOARD_NOT_FOUND",
  LABEL_BOARD_MISMATCH: "LABEL_BOARD_MISMATCH",
} as const;
export type LabelError = (typeof LabelError)[keyof typeof LabelError];
