import { User, Activity, Clock, CheckCircle2 } from 'lucide-react'

interface AgentCardProps {
  agent: any
  status: any
}

export function AgentCard({ agent, status }: AgentCardProps) {
  const metadata = typeof agent.metadata === 'string' ? JSON.parse(agent.metadata) : agent.metadata
  const agentColor = agent.color || '#10B981'
  const isOnline = status?.status === 'online'
  const modelName = agent.model || metadata?.model || 'claude-3.5'

  return (
    <div className="agent-card bg-[#0C1221] border border-white/7 rounded-xl overflow-hidden card-shadow hover:border-white/15 transition-all group relative">
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${agentColor} 0%, transparent 100%)` }}
      />
      
      <div className="p-4 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-inner border border-white/10"
                style={{ backgroundColor: `${agentColor}20`, color: agentColor }}
              >
                {agent.name.charAt(0)}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0C1221] ${isOnline ? 'bg-emerald-500' : 'bg-[#4a5580]'}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{agent.name}</h3>
              <p className="text-[10px] text-[#4a5580] uppercase tracking-wider font-semibold">{agent.role || 'Agente ARVA'}</p>
            </div>
          </div>
          <div className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/7 text-[#8892b0] font-mono">
            {modelName.split('/').pop()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#07090F] p-2 rounded-lg border border-white/5">
            <div className="flex items-center gap-1.5 text-[9px] text-[#4a5580] mb-1">
              <Activity size={10} /> PENDENTES
            </div>
            <div className="text-sm font-mono text-white">{status?.tasks_pending || 0}</div>
          </div>
          <div className="bg-[#07090F] p-2 rounded-lg border border-white/5">
            <div className="flex items-center gap-1.5 text-[9px] text-[#4a5580] mb-1 text-emerald-500/70">
              <CheckCircle2 size={10} /> CONCLUDAS
            </div>
            <div className="text-sm font-mono text-emerald-400">{status?.tasks_done || 0}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-[#8892b0]">
            <Clock size={10} />
            {status?.last_seen ? new Date(status.last_seen).toLocaleTimeString() : 'Offline'}
          </div>
          <button className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            Gerenciar →
          </button>
        </div>
      </div>
    </div>
  )
}
