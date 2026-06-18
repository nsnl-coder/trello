import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_PROJECT_COLOR,
  PROJECT_DESCRIPTION_MAX,
  ProjectVisibility,
  createProjectInput,
  projectVisibilitySchema,
  z,
} from "shared";
import { useTRPC } from "../../../lib/trpc";
import {
  ProjectFormFields,
  type ProjectFormValues,
} from "../../../features/project/components/ProjectFormFields";
import { canEdit, isOwner } from "../../../features/project/utils";
import { projectErrorMessage } from "../../../features/project/errors";

const formSchema = z.object({
  name: createProjectInput.shape.name,
  description: z.string().trim().max(PROJECT_DESCRIPTION_MAX).optional(),
  visibility: projectVisibilitySchema,
});

export function ProjectFormPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);

  const projectQuery = useQuery({
    ...trpc.projects.get.queryOptions({ id: id! }),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", visibility: ProjectVisibility.Private },
  });

  const project = projectQuery.data;
  const readOnly = isEdit && !!project && !canEdit(project);
  const visibilityDisabled = isEdit && !!project && !isOwner(project);

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description ?? "",
        visibility: project.visibility,
      });
      setColor(project.color);
    }
  }, [project, reset]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
    if (id) {
      queryClient.invalidateQueries({ queryKey: trpc.projects.get.queryKey({ id }) });
    }
  };

  const createMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (created) => {
        invalidate();
        navigate(`/projects/${created.id}`);
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: () => {
        invalidate();
        navigate(`/projects/${id}`);
      },
    }),
  );

  const onSubmit = handleSubmit((values) => {
    const description = values.description?.length ? values.description : undefined;
    if (isEdit) {
      updateMutation.mutate({
        id: id!,
        name: values.name,
        description: description ?? null,
        color,
        ...(isOwner(project!) ? { visibility: values.visibility } : {}),
      });
    } else {
      createMutation.mutate({
        name: values.name,
        description,
        color,
        visibility: values.visibility,
      });
    }
  });

  const error = createMutation.error ?? updateMutation.error;

  if (isEdit && projectQuery.error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-2xl p-6">
          <p className="text-sm text-slate-600">Project not found or no access.</p>
          <Link to="/projects" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Back to projects
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl p-6">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">
          {isEdit ? (readOnly ? "Project" : "Edit project") : "New project"}
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <ProjectFormFields
            register={register}
            errors={errors}
            color={color}
            onColorChange={setColor}
            disabled={readOnly}
            visibilityDisabled={visibilityDisabled}
          />

          {error ? <p className="text-sm text-red-600">{projectErrorMessage(error)}</p> : null}

          {!readOnly ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isEdit ? "Save" : "Create project"}
              </button>
              <Link
                to={isEdit ? `/projects/${id}` : "/projects"}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Link>
            </div>
          ) : null}
        </form>
      </main>
    </div>
  );
}
