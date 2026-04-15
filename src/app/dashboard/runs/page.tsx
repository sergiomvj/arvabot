import { redirect } from 'next/navigation'
import { ActivitySquare } from 'lucide-react'

import { RunsBoard } from '@/components/squads/runs-board'
import { prisma } from '@/lib/prisma'
import { getViewerContext } from '@/lib/viewer-context'

export const dynamic = 'force-dynamic'

export default async function RunsPage() {
  const viewer = await getViewerContext()
  if (!viewer) redirect('/login')
  if (!viewer.currentOrgId) redirect('/organizations')

  const runs = await prisma.squad_runs.findMany({
    where: { organization_id: viewer.currentOrgId },
    include: {
      squad: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      steps: {
        orderBy: { created_at: 'desc' },
      },
      checkpoints: {
        orderBy: { created_at: 'desc' },
      },
    },
    orderBy: { started_at: 'desc' },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ActivitySquare className="text-emerald-500" /> Runs
        </h1>
        <p className="text-sm text-[#4a5580] mt-1">
          Acompanhe o histórico operacional dos squads e os handoffs registrados.
        </p>
      </div>

      <RunsBoard runs={runs} />
    </div>
  )
}
