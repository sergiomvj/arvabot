import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const squadId = searchParams.get('squadId')
  const status = searchParams.get('status')

  const runs = await prisma.squad_runs.findMany({
    where: {
      organization_id: context.orgId,
      ...(squadId ? { squad_id: squadId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      squad: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      steps: true,
      checkpoints: true,
    },
    orderBy: { started_at: 'desc' },
  })

  return NextResponse.json(runs)
}
