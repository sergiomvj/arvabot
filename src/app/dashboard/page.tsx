import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const agentsCount = await prisma.agents_cache.count()
  const onlineAgents = await prisma.agent_status.count({
    where: { status: 'online' }
  })

  return (
    <div className="p-5">
      <div className="stats-bar grid grid-cols-4 gap-3 mb-4">
        <div className="stat-card bg-[#0C0F1A] border border-white/7 rounded-lg p-3.5">
          <div className="stat-label text-xs uppercase tracking-wider text-[#8892b0] font-mono">Agentes Ativos</div>
          <div className="stat-value text-3xl font-black text-white">{onlineAgents}</div>
        </div>
        {/* More stats */}
      </div>
      <h1 className="text-xl font-bold text-white">Dashboard Facebrasil</h1>
    </div>
  )
}
