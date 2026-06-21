import { TRPCClientError } from "@trpc/client";
import { ChecklistError } from "shared";

const MESSAGES: Record<ChecklistError, string> = {
  [ChecklistError.FORBIDDEN]: "You do not have permission to do that.",
  [ChecklistError.CHECKLIST_NOT_FOUND]: "That checklist no longer exists.",
  [ChecklistError.ITEM_NOT_FOUND]: "That item no longer exists.",
  [ChecklistError.CARD_NOT_FOUND]: "That card no longer exists.",
};

export function checklistErrorMessage(err: unknown): string {
  if (err instanceof TRPCClientError) {
    const msg = err.message;
    if (msg && msg in MESSAGES) return MESSAGES[msg as ChecklistError];
  }
  return "Something went wrong. Please try again.";
}
