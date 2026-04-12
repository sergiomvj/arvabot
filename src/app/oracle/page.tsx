import { prisma } from '@/lib/prisma';
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function OraclePage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  })

  if (!profile?.current_org_id) redirect('/organizations')

  const ranking = await prisma.agents_cache.findMany({
    where: { organization_id: profile.current_org_id },
    include: { status: true },
    orderBy: { status: { tasks_done: 'desc' } }
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-white mb-4 italic font-serif">ORACLE Intelligence</h1>
      <div className="agents-grid grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {ranking.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[#4a5580] bg-[#0C0F1A] rounded-xl border border-white/5">Nenhum dado de ranking para este workspace</div>
        ) : (
          ranking.map((agent) => (
            <div key={agent.id} className="stat-card bg-[#0C0F1A] p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all">
              <div className="text-[#4a5580] text-[10px] uppercase tracking-widest font-mono mb-2">Cérebro Bio-Híbrido</div>
              <div className="stat-value text-lg font-bold text-white">{agent.name}</div>
              <div className="stat-sub text-xs text-emerald-400 mt-1 font-mono">Score: {agent.status?.tasks_done || 0} tasks done</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
