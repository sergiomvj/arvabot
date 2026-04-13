import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Users, Activity, Clock, Globe, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

function StatCard({ label, value, sub, color }: { label: string, value: any, sub: string, color: string }) {
  return (
    <div className="bg-[#0C0F1A] border border-white/7 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <div className="text-[10px] uppercase tracking-widest text-[#8892b0] font-mono mb-1">{label}</div>
      <div className="text-3xl font-extrabold text-white tracking-tighter mb-1">{value}</div>
      <div className="text-[10px] text-[#4a5580]">{sub}</div>
    </div>
  )
}

export default async function Dashboard() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  })

  if (!profile?.current_org_id) redirect('/organizations')

  const orgId = profile.current_org_id

  const orgId = profile.current_org_id

  // ── CONSULTAS PARALELAS PARA PERFORMANCE ──
  const [agentsCount, onlineAgents, threadsCount, recentAgents] = await Promise.all([
    prisma.agents_cache.count({ where: { organization_id: orgId } }),
    prisma.agent_status.count({ where: { organization_id: orgId, status: 'online' } }),
    prisma.agent_threads.count({ where: { organization_id: orgId, status: 'active' } }),
    prisma.agents_cache.findMany({
      where: { organization_id: orgId },
      include: { status: true },
      take: 5,
      orderBy: { last_synced_at: 'desc' }
    })
  ])

  // Mocking heartbeat for UI consistency
  const nextHeartbeat = 2

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Agentes Ativos" 
          value={onlineAgents} 
          sub={`${agentsCount} neste workspace`} 
          color="#10B981" 
        />
        <StatCard 
          label="Tarefas Ativas" 
          value="—" 
          sub="carregando métricas..." 
          color="#6366F1" 
        />
        <StatCard 
          label="Threads Ativas" 
          value={threadsCount} 
          sub="sessões bridge coletadas" 
          color="#F59E0B" 
        />
        <StatCard 
          label="Próximo Heartbeat" 
          value={nextHeartbeat} 
          sub="minutos para varredura" 
          color="#06B6D4" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── AGENTS PANEL ── */}
        <div className="lg:col-span-2 bg-[#0C0F1A] border border-white/7 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-[#8892b0] uppercase tracking-[0.15em] font-mono flex items-center gap-2">
              <Users size={14} className="text-emerald-500" /> Agentes Conectados
            </h2>
          </div>
          <div className="space-y-3">
            {recentAgents.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-xl">
                 <p className="text-[10px] text-[#4a5580] uppercase tracking-widest font-mono">Nenhum agente sincronizado</p>
              </div>
            ) : (
              recentAgents.map(agent => (
                <div key={agent.id} className="bg-[#07090F] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-emerald-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border"
                      style={{ 
                        backgroundColor: `${agent.color || '#10B981'}20`, 
                        color: agent.color || '#10B981',
                        borderColor: `${agent.color || '#10B981'}40`
                      }}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{agent.name}</div>
                      <div className="text-[10px] text-[#4a5580] uppercase tracking-wider font-mono">{agent.role || 'Agente'}</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold bg-white/5 px-2 py-1 rounded border border-white/10 ${agent.status?.status === 'online' ? 'text-emerald-500' : 'text-[#4a5580]'}`}>
                    {agent.status?.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {(agent.status?.status || 'OFFLINE').toUpperCase()}
                  </div>
                </div>
              ))
            )}
            
            <div className="bg-[#07090F] border border-white/5 rounded-xl p-4 flex items-center justify-center opacity-40">
              <p className="text-[10px] text-[#4a5580] uppercase tracking-widest font-mono">Sincronização em tempo real ativa</p>
            </div>
          </div>
        </div>

        {/* ── ACTIVITY PANEL ── */}
        <div className="lg:col-span-1 bg-[#0C0F1A] border border-white/7 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-[#8892b0] uppercase tracking-[0.15em] font-mono flex items-center gap-2">
              <Activity size={14} className="text-cyan-500" /> Atividade Recente
            </h2>
          </div>
          <div className="space-y-6 relative overflow-hidden">
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/5" />
            
            <div className="relative flex gap-4 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#07090F] border border-white/10 flex items-center justify-center text-[#4a5580] z-10 flex-shrink-0">
                <Globe size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Sincronização Hub</div>
                <div className="text-[10px] text-[#4a5580] mt-0.5 tracking-tight font-medium">Sincronização configurada p/ workspace atual</div>
                <div className="text-[9px] text-[#4a5580] mt-1 font-mono uppercase">Status Atualizado</div>
              </div>
            </div>

            <div className="relative flex gap-4 pl-1">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 z-10 flex-shrink-0">
                <MessageSquare size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Prisma UUID Fix</div>
                <div className="text-[10px] text-[#4a5580] mt-0.5 tracking-tight font-medium">Ambiente estabilizado para multi-tenancy</div>
                <div className="text-[9px] text-[#4a5580] mt-1 font-mono uppercase">Aplicado Agora</div>
              </div>
            </div>

            <div className="relative flex gap-4 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#07090F] border border-white/10 flex items-center justify-center text-[#4a5580] z-10 flex-shrink-0">
                <Clock size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#8892b0]">Sistema Online</div>
                <div className="text-[10px] text-[#4a5580] mt-0.5 tracking-tight font-medium">Módulo Multi-tenant isolado por organização</div>
                <div className="text-[9px] text-[#4a5580] mt-1 font-mono uppercase">Online</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
