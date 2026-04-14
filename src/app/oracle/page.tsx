import { redirect } from 'next/navigation'

import { OracleConsole } from '@/components/oracle-console'
import { prisma } from '@/lib/prisma'
import { getViewerContext } from '@/lib/viewer-context'

export const dynamic = 'force-dynamic'

export default async function OraclePage() {
  const viewer = await getViewerContext()
  if (!viewer) redirect('/login')
  if (!viewer.currentOrgId) redirect('/organizations')

  const [ranking, agents] = await Promise.all([
    prisma.agents_cache.findMany({
      where: { organization_id: viewer.currentOrgId },
      select: {
        openclaw_id: true,
        name: true,
        role: true,
        color: true,
        status: {
          select: {
            status: true,
            tasks_done: true,
            tasks_pending: true,
            updated_at: true,
          },
        },
      },
      orderBy: [{ status: { tasks_done: 'desc' } }, { name: 'asc' }],
    }),
    prisma.agents_cache.findMany({
      where: { organization_id: viewer.currentOrgId, active: true },
      select: {
        openclaw_id: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="p-5 md:p-8">
      <OracleConsole
        initialRanking={ranking}
        agents={agents}
        organizationName={viewer.currentOrg?.name || 'Workspace atual'}
      />
    </div>
  )
}
