import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Project, PublicUser } from "shared";
import { useAuthStore } from "../../../hooks/useAuthStore";

const h = vi.hoisted(() => ({
  queryData: {} as Record<string, unknown>,
  queryCalls: {} as Record<string, unknown[]>,
}));

vi.mock("../../../lib/trpc", () => {
  const leaf = (path: string) => ({
    queryOptions: (input: unknown) => {
      (h.queryCalls[path] ??= []).push(input);
      return { queryKey: [path, input] };
    },
    queryKey: (input?: unknown) => [path, input],
    mutationOptions: (opts: Record<string, unknown> = {}) => ({ ...opts, _mutationKey: path }),
  });
  const proxy = new Proxy({}, { get: () => new Proxy({}, { get: (_t, ep: string) => leaf(ep) }) });
  return { useTRPC: () => proxy };
});

vi.mock("@tanstack/react-query", async (orig) => {
  const actual = await orig<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (opts: { queryKey: unknown[] }) => ({
      data: h.queryData[opts.queryKey[0] as string],
      isLoading: false,
      error: null,
    }),
    useMutation: () => ({ mutate: () => {}, isPending: false, error: null }),
    useQueryClient: () => ({ invalidateQueries: () => {} }),
  };
});

const { ProjectsListPage } = await import("./ProjectsListPage");

const user: PublicUser = {
  id: "u1",
  email: "u@x.io",
  isSuperuser: false,
  roleId: null,
  emailVerified: true,
  permissions: [],
};

const projects: Project[] = [
  {
    id: "p1",
    ownerId: "u1",
    name: "Roadmap",
    description: "Q3",
    color: "#4f46e5",
    visibility: "private",
    myPermission: "owner",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p2",
    ownerId: "u2",
    name: "Shared board",
    description: null,
    color: "#10b981",
    visibility: "public",
    myPermission: "view",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/projects"]}>
      <Routes>
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/new" element={<div>new-project</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.queryData = { list: projects };
  h.queryCalls = {};
  useAuthStore.getState().setAuth(user);
});

describe("ProjectsListPage", () => {
  it("renders owned and shared cards", () => {
    renderPage();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Shared board")).toBeInTheDocument();
  });

  it("passes the active sidebar filter to the query", () => {
    renderPage();
    const last = h.queryCalls.list.at(-1) as { filter: string };
    expect(last.filter).toBe("all");
  });

  it("shows an empty state when there are no projects", () => {
    h.queryData = { list: [] };
    renderPage();
    expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
  });
});
