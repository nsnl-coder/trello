import { TRPCClientError } from "@trpc/client";
import { LabelError } from "shared";

const MESSAGES: Record<LabelError, string> = {
  [LabelError.FORBIDDEN]: "You do not have permission to do that.",
  [LabelError.LABEL_NOT_FOUND]: "That label no longer exists.",
  [LabelError.CARD_NOT_FOUND]: "That card no longer exists.",
  [LabelError.BOARD_NOT_FOUND]: "That board no longer exists.",
  [LabelError.LABEL_BOARD_MISMATCH]: "That label belongs to another board.",
};

export function labelErrorMessage(err: unknown): string {
  if (err instanceof TRPCClientError) {
    const msg = err.message;
    if (msg && msg in MESSAGES) return MESSAGES[msg as LabelError];
  }
  return "Something went wrong. Please try again.";
}
