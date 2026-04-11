import { prisma } from '@/lib/prisma';

export default async function OraclePage() {
  const ranking = await prisma.agentsCache.findMany({
    include: { agentStatus: true },
    orderBy: { agentStatus: { tasksDone: 'desc' } }
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-white mb-4">Oracle Chat + Ranking</h1>
      <div className="agents-grid grid grid-cols-3 gap-4">
        {ranking.map((agent) => (
          <div key={agent.id} className="stat-card bg-[#0C0F1A] p-4 rounded-lg border border-white/7">
            <div className="stat-value text-lg font-bold">{agent.name}</div>
            <div className="stat-sub text-xs text-[#8892b0]">Score: {agent.agentStatus?.tasksDone || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
