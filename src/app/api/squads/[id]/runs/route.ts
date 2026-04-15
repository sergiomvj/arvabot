import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'
import { startSquadRun } from '@/lib/services/squad-runner'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Params) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const runs = await prisma.squad_runs.findMany({
    where: {
      squad_id: params.id,
      organization_id: context.orgId,
    },
    include: {
      steps: true,
      checkpoints: true,
    },
    orderBy: { started_at: 'desc' },
  })

  return NextResponse.json(runs)
}

export async function POST(req: NextRequest, { params }: Params) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)

  try {
    const run = await startSquadRun({
      squadId: params.id,
      organizationId: context.orgId,
      startedBy: context.userId,
      inputPayload: body?.inputPayload,
    })

    return NextResponse.json(run, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Falha ao iniciar squad',
      },
      { status: 400 },
    )
  }
}
