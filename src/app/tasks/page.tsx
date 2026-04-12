import { prisma } from '@/lib/prisma';
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  })

  if (!profile?.current_org_id) redirect('/organizations')

  const tasks = await prisma.agent_status.findMany({
    where: { agent: { organization_id: profile.current_org_id } },
    include: { agent: true }
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-white mb-4 italic font-serif">Task Matrix</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {tasks.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[#4a5580] bg-[#0C0F1A] rounded-xl border border-white/5">Nenhuma tarefa ativa neste workspace</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="stat-card bg-[#0C0F1A] p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="text-white font-bold">{task.agent?.name}</div>
                <div className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 text-[10px] font-mono uppercase">{task.status}</div>
              </div>
              <div className="stat-sub text-xs text-[#8892b0]">Pendentes: {task.tasks_pending}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
