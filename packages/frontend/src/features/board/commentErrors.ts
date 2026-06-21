import { TRPCClientError } from "@trpc/client";
import { CommentError } from "shared";

const MESSAGES: Record<CommentError, string> = {
  [CommentError.FORBIDDEN]: "You do not have permission to do that.",
  [CommentError.COMMENT_NOT_FOUND]: "That comment no longer exists.",
  [CommentError.CARD_NOT_FOUND]: "That card no longer exists.",
  [CommentError.PARENT_NOT_FOUND]: "The comment you replied to no longer exists.",
  [CommentError.PARENT_NOT_TOP_LEVEL]: "You can only reply to a top-level comment.",
  [CommentError.NOT_AUTHOR]: "You can only edit your own comments.",
};

export function commentErrorMessage(err: unknown): string {
  if (err instanceof TRPCClientError) {
    const msg = err.message;
    if (msg && msg in MESSAGES) return MESSAGES[msg as CommentError];
  }
  return "Something went wrong. Please try again.";
}
