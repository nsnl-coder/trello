export const CommentError = {
  FORBIDDEN: "FORBIDDEN",
  COMMENT_NOT_FOUND: "COMMENT_NOT_FOUND",
  CARD_NOT_FOUND: "CARD_NOT_FOUND",
  PARENT_NOT_FOUND: "PARENT_NOT_FOUND",
  PARENT_NOT_TOP_LEVEL: "PARENT_NOT_TOP_LEVEL",
  NOT_AUTHOR: "NOT_AUTHOR",
} as const;
export type CommentError = (typeof CommentError)[keyof typeof CommentError];
