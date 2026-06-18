import { Link } from "react-router-dom";
import type { Project } from "shared";
import { PERMISSION_LABELS, VISIBILITY_LABELS } from "../utils";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          style={{ backgroundColor: project.color }}
          className="h-4 w-4 shrink-0 rounded-full"
        />
        <h2 className="truncate font-semibold text-slate-800">{project.name}</h2>
      </div>
      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-600">
        {project.description || "No description"}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
          {VISIBILITY_LABELS[project.visibility]}
        </span>
        <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
          {PERMISSION_LABELS[project.myPermission]}
        </span>
      </div>
    </Link>
  );
}
