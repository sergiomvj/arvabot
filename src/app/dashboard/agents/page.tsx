import { prisma } from "@/lib/prisma"
import { AgentCard } from "@/components/agent-card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  })

  if (!profile?.current_org_id) {
    redirect('/organizations')
  }

  const agents = await prisma.agents_cache.findMany({
    where: { organization_id: profile.current_org_id },
    include: { status: true }
  })

  return (
    <div className="p-5">
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <button className="filter-btn bg-[#111528] border border-white/7 rounded-md px-3 py-1.5 text-xs font-medium text-[#4a5580] hover:border-white/20 hover:text-white active:bg-emerald/10 active:border-emerald/30 active:text-emerald-400">Todos</button>
        <button className="filter-btn bg-[#111528] border border-white/7 rounded-md px-3 py-1.5 text-xs font-medium text-[#4a5580]">● Online</button>
        <button className="ml-auto btn bg-emerald-500 text-black border-emerald-500 rounded-md px-3.5 py-1.75 text-xs font-semibold hover:brightness-110 flex-shrink-0">+ Novo Agente</button>
      </div>
      <div className="agents-grid grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
        {agents.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-[#4a5580] bg-[#0C0F1A] rounded-2xl border border-white/5 border-dashed">
            <span className="text-4xl mb-4">👥</span>
            <p className="text-sm font-medium">Nenhum agente cadastrado neste workspace</p>
          </div>
        ) : (
          agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} status={agent.status} />
          ))
        )}
      </div>
    </div>
  )
}
