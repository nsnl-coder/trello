import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ListProjectsInput } from "shared";
import { useTRPC } from "../../../lib/trpc";
import { Nav } from "../../../components/Nav";
import { ProjectCard } from "../../../features/project/components/ProjectCard";

const PAGE_SIZE = 24;

const FILTERS: { value: ListProjectsInput["filter"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "shared", label: "Shared with me" },
];

export function ProjectsListPage() {
  const trpc = useTRPC();
  const [filter, setFilter] = useState<ListProjectsInput["filter"]>("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const projectsQuery = useQuery(
    trpc.projects.list.queryOptions({
      filter,
      search: search.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
  );

  const projects = projectsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <Link
            to="/projects/new"
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            New project
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setFilter(f.value);
                  setOffset(0);
                }}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  filter === f.value
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {projectsQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No projects yet. Create your first one.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-slate-500">
            {projects.length === 0 ? 0 : offset + 1}-{offset + projects.length}
          </span>
          <button
            type="button"
            disabled={projects.length < PAGE_SIZE}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
