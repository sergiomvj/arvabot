import { prisma } from '@/lib/prisma';

export default async function TasksPage() {
  const tasks = await prisma.agentStatus.findMany();

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-white">Tasks Kanban</h1>
      <p>Kanban filtrado org/agent (Prisma realtime)</p>
    </div>
  );
}
EOF
