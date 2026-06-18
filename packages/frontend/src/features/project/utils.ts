import { ProjectVisibility, type Project } from "shared";

export function canEdit(p: Pick<Project, "myPermission">): boolean {
  return p.myPermission !== "view";
}

export function isOwner(p: Pick<Project, "myPermission">): boolean {
  return p.myPermission === "owner";
}

export const VISIBILITY_LABELS: Record<ProjectVisibility, string> = {
  [ProjectVisibility.Private]: "Private",
  [ProjectVisibility.Public]: "Public",
};

export const PERMISSION_LABELS: Record<Project["myPermission"], string> = {
  owner: "Owner",
  edit: "Editor",
  view: "Viewer",
};

// Palette for the color picker. Values are validated by createProjectInput.
export const PROJECT_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
] as const;
