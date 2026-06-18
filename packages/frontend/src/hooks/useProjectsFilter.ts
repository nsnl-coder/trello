import { create } from "zustand";
import type { ListProjectsInput } from "shared";

export type ProjectsFilter = ListProjectsInput["filter"];

export const PROJECT_FILTERS: { value: ProjectsFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "shared", label: "Shared with me" },
];

interface FilterState {
  filter: ProjectsFilter;
  setFilter: (filter: ProjectsFilter) => void;
}

// Shared between the sidebar dropdown and the projects grid.
export const useProjectsFilter = create<FilterState>((set) => ({
  filter: "all",
  setFilter: (filter) => set({ filter }),
}));
