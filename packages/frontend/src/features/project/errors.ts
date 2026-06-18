import { TRPCClientError } from "@trpc/client";
import { ProjectError } from "shared";

const MESSAGES: Record<ProjectError, string> = {
  [ProjectError.FORBIDDEN]: "You do not have permission to do that.",
  [ProjectError.PROJECT_NOT_FOUND]: "That project no longer exists.",
  [ProjectError.USER_NOT_FOUND]: "No user found with that email.",
  [ProjectError.CANNOT_GRANT_OWNER]: "The owner already has full access.",
  [ProjectError.CANNOT_GRANT_SELF]: "You cannot grant access to yourself.",
};

export function projectErrorMessage(err: unknown): string {
  if (err instanceof TRPCClientError) {
    const msg = err.message;
    if (msg && msg in MESSAGES) return MESSAGES[msg as ProjectError];
  }
  return "Something went wrong. Please try again.";
}
