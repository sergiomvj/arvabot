import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const tasks = await prisma.agent_status.findMany({
    include: { agent: true }
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-white mb-4">Tasks Kanban</h1>
      <div className="grid grid-cols-4 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="stat-card bg-[#0C0F1A] p-4 rounded-lg border border-white/7">
            <div className="stat-value text-lg">{task.agent?.name}</div>
            <div className="stat-sub text-xs">{task.status} ({task.tasks_pending})</div>
          </div>
        ))}
      </div>
    </div>
  );
}
