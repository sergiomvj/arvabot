import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Brain, ChevronRight, Clock, Globe, History, MessageSquare, User } from 'lucide-react'

import { prisma } from '@/lib/prisma'
import { getViewerContext } from '@/lib/viewer-context'

export default async function AgentMemoryPage({ params }: { params: { id: string } }) {
  const viewer = await getViewerContext()
  if (!viewer) redirect('/login')
  if (!viewer.currentOrgId) redirect('/organizations')

  const agent = await prisma.agents_cache.findFirst({
    where: {
      organization_id: viewer.currentOrgId,
      openclaw_id: params.id,
    },
    include: {
      status: true,
      threads: {
        orderBy: { last_interaction: 'desc' },
        take: 20,
      },
    },
  })

  if (!agent) redirect('/dashboard/agents')

  const activeThreads = agent.threads.filter((thread) => thread.status === 'active')
  const resolvedThreads = agent.threads.filter((thread) => thread.status === 'resolved')

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/agents" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#4a5580] hover:text-white hover:bg-white/10 transition-all border border-white/5">
          <ChevronRight className="rotate-180" size={20} />
        </Link>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
          <Brain size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Session Bridge: {agent.name}</h1>
          <p className="text-[#4a5580] text-sm">Memoria Cross-Canal e Continuidade (SMT v1.1)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0C0F1A] border border-white/5 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xs font-bold text-[#8892b0] uppercase tracking-widest mb-4 font-mono flex items-center gap-2">
              <Globe size={14} className="text-emerald-500" /> Status da Ponte
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#4a5580]">Threads Ativas</span>
                <span className="text-emerald-400 font-mono font-bold">{activeThreads.length}/20</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(activeThreads.length / 20) * 100}%` }} />
              </div>
              <p className="text-[10px] text-[#4a5580] leading-relaxed italic">
                O limite de 20 threads garante que o agente foque apenas em contextos recentes e relevantes para continuidade cross-canal.
              </p>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2 font-mono">Proxima Promocao</h3>
            <p className="text-[11px] text-[#8892b0] leading-relaxed">
              Threads resolvidas com alta relevancia sao automaticamente promovidas para o <strong>SHORT_TERM (MEMORY.md)</strong> apos a proxima rodada do SMT Processor.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={20} className="text-emerald-500" /> Threads Ativas
            </h2>
          </div>

          {activeThreads.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#4a5580] bg-[#0C0F1A] rounded-2xl border border-white/5 border-dashed">
              <MessageSquare size={40} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Nenhuma thread ativa encontrada</p>
              <p className="text-[11px] mt-1">Interacoes cross-canal aparecerao aqui automaticamente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeThreads.map((thread) => (
                <div key={thread.id} className="bg-[#0C0F1A] border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#8892b0]">
                        <User size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{thread.theme}</h4>
                        <p className="text-[11px] text-[#4a5580]">{thread.user_identifier} • {thread.channel || 'Canal Desconhecido'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#4a5580] font-mono">
                      <Clock size={12} />
                      {new Date(thread.last_interaction).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#07090F] rounded-xl p-4 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5 text-emerald-500">
                      <Brain size={40} />
                    </div>
                    <p className="text-[11px] text-[#8892b0] leading-relaxed whitespace-pre-wrap font-mono uppercase opacity-80">{thread.context}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolvedThreads.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 pt-4">
                <History size={20} className="text-[#4a5580]" /> Historico Recente (Resolvidas)
              </h2>
              <div className="space-y-3 opacity-60">
                {resolvedThreads.map((thread) => (
                  <div key={thread.id} className="bg-[#0C0F1A] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] font-bold text-[#8892b0] uppercase tracking-tighter w-24 truncate">{thread.theme}</div>
                      <div className="text-[10px] text-[#4a5580] uppercase truncate max-w-[150px]">{thread.user_identifier}</div>
                    </div>
                    <div className="text-[9px] text-[#4a5580] font-mono">Resolvida em {new Date(thread.last_interaction).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
