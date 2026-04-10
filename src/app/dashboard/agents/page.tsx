import { prisma } from "@/lib/prisma"
import { AgentCard } from "@/components/agent-card"

export default async function AgentsPage() {
  const agents = await prisma.agents_cache.findMany({
    include: { agent_status: true }
  })

  return (
    <div className="p-5">
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <button className="filter-btn bg-[#111528] border border-white/7 rounded-md px-3 py-1.5 text-xs font-medium text-[#4a5580] hover:border-white/20 hover:text-white active:bg-emerald/10 active:border-emerald/30 active:text-emerald-400">Todos</button>
        <button className="filter-btn bg-[#111528] border border-white/7 rounded-md px-3 py-1.5 text-xs font-medium text-[#4a5580]">● Online</button>
        {/* More filters */}
        <button className="ml-auto btn bg-emerald-500 text-black border-emerald-500 rounded-md px-3.5 py-1.75 text-xs font-semibold hover:brightness-110 flex-shrink-0">+ Novo Agente</button>
      </div>
      <div className="agents-grid grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} status={agent.agent_status} />
        ))}
      </div>
    </div>
  )
}
