import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/trpc";
import { Nav } from "../../../components/Nav";
import { AccessPanel } from "../../../features/project/components/AccessPanel";
import { canEdit, isOwner, PERMISSION_LABELS, VISIBILITY_LABELS } from "../../../features/project/utils";
import { projectErrorMessage } from "../../../features/project/errors";

export function ProjectDetailPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const projectQuery = useQuery(trpc.projects.get.queryOptions({ id: id! }));
  const project = projectQuery.data;

  const deleteMutation = useMutation(
    trpc.projects.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        navigate("/projects");
      },
    }),
  );

  if (projectQuery.error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <main className="mx-auto max-w-3xl p-6">
          <p className="text-sm text-slate-600">Project not found or no access.</p>
          <Link to="/projects" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Back to projects
          </Link>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <main className="mx-auto max-w-3xl p-6">
          <p className="text-sm text-slate-500">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              style={{ backgroundColor: project.color }}
              className="h-6 w-6 rounded-full"
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  {VISIBILITY_LABELS[project.visibility]}
                </span>
                <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
                  {PERMISSION_LABELS[project.myPermission]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            {canEdit(project) ? (
              <Link
                to={`/projects/${project.id}/edit`}
                className="rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                Edit
              </Link>
            ) : null}
            {isOwner(project) ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded border border-red-300 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          {project.description || "No description"}
        </p>

        <section className="mt-8 rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          Boards and cards coming soon.
        </section>

        {isOwner(project) ? <AccessPanel projectId={project.id} /> : null}
      </main>

      {confirmDelete ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800">Delete project</h2>
            <p className="mt-2 text-sm text-slate-600">
              Delete <strong>{project.name}</strong>? This cannot be undone.
            </p>
            {deleteMutation.error ? (
              <p className="mt-2 text-sm text-red-600">
                {projectErrorMessage(deleteMutation.error)}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: project.id })}
                className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
