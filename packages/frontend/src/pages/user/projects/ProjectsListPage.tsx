import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/trpc";
import { ProjectCard } from "../../../features/project/components/ProjectCard";
import { useProjectsFilter } from "../../../hooks/useProjectsFilter";

export function ProjectsListPage() {
  const trpc = useTRPC();
  const filter = useProjectsFilter((s) => s.filter);

  const projectsQuery = useQuery(
    trpc.projects.list.queryOptions({ filter, limit: 100, offset: 0 }),
  );

  const projects = projectsQuery.data ?? [];

  return (
    <main className="px-8 py-8 lg:px-12">
      {projectsQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No projects yet. Create your first one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </main>
  );
}
