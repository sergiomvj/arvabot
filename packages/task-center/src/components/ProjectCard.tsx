import { Trash2 } from "lucide-react";
import { TaskCard } from "./TaskCard";
import type { ProjectWithTasks } from "../types";

interface ProjectCardProps {
  project: ProjectWithTasks;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
      <div className="flex items-start justify-between border-b border-white/5 pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-mono text-blue-400">
              ID: {project.code.split("_")[0]}
            </span>
            <h4 className="text-lg font-bold text-white">{project.name}</h4>
          </div>
          <p className="line-clamp-1 text-xs text-zinc-500">{project.documentation || "Sem documentacao"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase text-white">
            {project.status}
          </span>
          {onDelete && (
            <form action={onDelete.bind(null, project.id)}>
              <button
                type="submit"
                className="rounded-full bg-white/5 p-1.5 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                title="Deletar Projeto"
              >
                <Trash2 size={16} />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-3">
        {project.tasks?.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
