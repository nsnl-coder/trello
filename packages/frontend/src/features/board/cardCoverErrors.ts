import { TRPCClientError } from "@trpc/client";
import { CardCoverError } from "shared";

const MESSAGES: Record<CardCoverError, string> = {
  [CardCoverError.INVALID_COVER_COLOR]: "That cover color is not allowed.",
  [CardCoverError.COVER_ATTACHMENT_NOT_FOUND]: "That attachment no longer exists.",
  [CardCoverError.COVER_NOT_IMAGE]: "Only image attachments can be used as a cover.",
  [CardCoverError.COVER_CONFLICT]: "Choose either a color or an image, not both.",
  [CardCoverError.CARD_NOT_FOUND]: "That card no longer exists.",
  [CardCoverError.FORBIDDEN]: "You do not have permission to do that.",
};

// Accepts a tRPC error object (message is the error constant) OR a raw code string.
export function cardCoverErrorMessage(err: unknown): string {
  let code: string | undefined;
  if (err instanceof TRPCClientError) code = err.message;
  else if (typeof err === "string") code = err;
  if (code && code in MESSAGES) return MESSAGES[code as CardCoverError];
  return "Something went wrong. Please try again.";
}
