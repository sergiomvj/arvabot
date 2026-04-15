import { Crosshair, Trash2 } from "lucide-react";
import Link from "next/link";
import { TaskCard } from "./TaskCard";
import type { ProjectWithTasks } from "../types";

interface ProjectCardProps {
  project: ProjectWithTasks;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6 flex flex-col gap-4">
      <div className="flex justify-between items-start border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md">
              ID: {project.code.split('_')[0]}
            </span>
            <h4 className="font-bold text-white text-lg">{project.name}</h4>
          </div>
          <p className="text-xs text-zinc-500 line-clamp-1">{project.documentation || "Sem documentação"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href={`/task-center/project/${project.id}`}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-xs font-semibold text-white uppercase transition-colors"
          >
            Gerenciar {project.status}
          </Link>
          {onDelete && (
            <form action={onDelete.bind(null, project.id)}>
              <button type="submit" className="p-1.5 text-zinc-500 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-full transition-colors" title="Deletar Projeto">
                <Trash2 size={16} />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-3 mt-2">
        {project.tasks?.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
