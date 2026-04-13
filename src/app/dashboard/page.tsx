import { prisma } from "@/lib/prisma"
import { Users, CheckCircle2, Folder, Activity, Clock, Globe, MessageSquare } from 'lucide-react'

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
  const agentsCount = await prisma.agents_cache.count()
  const onlineAgents = await prisma.agent_status.count({
    where: { status: 'online' }
  })
  
  const threadsCount = await prisma.agent_threads.count({
    where: { status: 'active' }
  })

  // Mocking heartbeat and projects for UI consistency with the requested layout
  const projectsCount = 4
  const nextHeartbeat = 2

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Agentes Ativos" 
          value={onlineAgents} 
          sub={`${agentsCount} total registrados`} 
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
          sub="sessões bridge ativas" 
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
            {/* Recent Agents List Item Sample */}
            <div className="bg-[#07090F] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-emerald-500/30 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 font-bold">
                  M
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Mila Castro</div>
                  <div className="text-[10px] text-[#4a5580] uppercase tracking-wider font-mono">Marketing Manager</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono font-bold bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </div>
            </div>
            
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
                <div className="text-[10px] text-[#4a5580] mt-0.5 tracking-tight font-medium">Dados de 4 agentes atualizados via API Master</div>
                <div className="text-[9px] text-[#4a5580] mt-1 font-mono uppercase">Há 2 minutos</div>
              </div>
            </div>

            <div className="relative flex gap-4 pl-1">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 z-10 flex-shrink-0">
                <MessageSquare size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Session Bridge</div>
                <div className="text-[10px] text-[#4a5580] mt-0.5 tracking-tight font-medium">Nova thread de memória registrada por Chiara Garcia</div>
                <div className="text-[9px] text-[#4a5580] mt-1 font-mono uppercase">Há 15 minutos</div>
              </div>
            </div>

            <div className="relative flex gap-4 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#07090F] border border-white/10 flex items-center justify-center text-[#4a5580] z-10 flex-shrink-0">
                <Clock size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#8892b0]">Sistema Online</div>
                <div className="text-[10px] text-[#4a5580] mt-0.5 tracking-tight font-medium">Todos os módulos operacionais estão estáveis</div>
                <div className="text-[9px] text-[#4a5580] mt-1 font-mono uppercase">Iniciado há 26h</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
