import { getPeriodRankings, setPrismaClient } from "@agent-hub/rankings/actions";
import { RankingTable } from "@agent-hub/rankings/components";
import { Trophy, Medal, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function RankingsPage() {
  // Inicialização obrigatória no servidor para SSR
  await setPrismaClient(prisma);

  // Por enquanto fixamos no período atual conforme o plano de implementação
  const periodCode = "monthly-2026-04";
  const { period, rankings } = await getPeriodRankings(periodCode);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#07090F]">
      <header className="flex-shrink-0 h-14 border-b border-white/7 flex items-center justify-between px-6 bg-[#090C16]">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-white tracking-wide uppercase">RANKINGS DE PERFORMANCE</h1>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[10px] text-amber-500 font-mono font-bold">GAMIFICATION</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit"><Target size={20} /></div>
              <p className="text-[#4a5580] text-xs font-mono uppercase tracking-wider">Período Ativo</p>
              <p className="text-xl font-bold text-white">{period?.code || 'Nenhum'}</p>
           </div>
           <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit"><Trophy size={20} /></div>
              <p className="text-[#4a5580] text-xs font-mono uppercase tracking-wider">Total Agentes</p>
              <p className="text-xl font-bold text-white">{rankings.length}</p>
           </div>
           <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 w-fit"><Medal size={20} /></div>
              <p className="text-[#4a5580] text-xs font-mono uppercase tracking-wider">Critério</p>
              <p className="text-xl font-bold text-white">Score Ponderado</p>
           </div>
        </div>

        <section className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
           <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-lg font-bold text-white">Quadro de Medalhas</h2>
           </div>
           
           <div className="p-6">
              {!period ? (
                <div className="py-20 text-center space-y-2">
                   <p className="text-white font-bold">Nenhum ranking disponível</p>
                   <p className="text-[#4a5580] text-sm">Certifique-se de que os períodos de avaliação foram gerados no banco de dados.</p>
                </div>
              ) : (
                <RankingTable 
                  rankings={rankings} 
                  onAgentClick={(code) => {
                    // Navegação padrão para o perfil do agente no ArvaBot
                    window.location.href = `/dashboard/agents/${code}`;
                  }} 
                />
              )}
           </div>
        </section>
      </div>
    </div>
  );
}
