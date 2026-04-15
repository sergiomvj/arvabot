import { Crosshair, CheckCircle2, Clock } from "lucide-react";
import { Badge, badgeVariants } from "./Badge";
import type { ProjectTask, TaskStatus } from "../types";

interface TaskCardProps {
  task: ProjectTask;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onAssign?: (taskId: string) => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'backlog': return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    case 'assigned': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'in_progress': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'blocked': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 size={16} />;
    case 'in_progress': return <Clock size={16} />;
    default: return <Crosshair size={16} />;
  }
}

export function TaskCard({ task, onStatusChange, onAssign }: TaskCardProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${getStatusColor(task.status)}`}>
      <div className="flex items-center gap-3">
        {getStatusIcon(task.status)}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{task.title}</span>
          {task.assignedAgent && (
            <span className="text-xs opacity-70">
              Designado para: <strong>@{task.assignedAgent.code}</strong>
            </span>
          )}
        </div>
      </div>
      <span className="uppercase text-[10px] font-bold tracking-wider opacity-80">
        {task.status.replace("_", " ")}
      </span>
    </div>
  );
}

export { badgeVariants };
