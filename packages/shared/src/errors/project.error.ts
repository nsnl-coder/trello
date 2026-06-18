export const ProjectError = {
  FORBIDDEN: "FORBIDDEN",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  CANNOT_GRANT_OWNER: "CANNOT_GRANT_OWNER",
  CANNOT_GRANT_SELF: "CANNOT_GRANT_SELF",
} as const;
export type ProjectError = (typeof ProjectError)[keyof typeof ProjectError];
