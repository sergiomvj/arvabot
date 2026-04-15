import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext, requireRole } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Params) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const squad = await prisma.squads.findFirst({
    where: {
      id: params.id,
      organization_id: context.orgId,
    },
    include: {
      steps: { orderBy: { order: 'asc' } },
      runs: { orderBy: { started_at: 'desc' }, take: 20 },
    },
  })

  if (!squad) return NextResponse.json({ error: 'Squad nao encontrado' }, { status: 404 })
  return NextResponse.json(squad)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  if (!requireRole(context.role, ['owner', 'admin'])) {
    return NextResponse.json({ error: 'Sem permissao para editar squads' }, { status: 403 })
  }

  const current = await prisma.squads.findFirst({
    where: { id: params.id, organization_id: context.orgId },
    include: { runs: { where: { status: { in: ['queued', 'running', 'checkpoint'] } }, take: 1 } },
  })

  if (!current) return NextResponse.json({ error: 'Squad nao encontrado' }, { status: 404 })
  if (current.runs.length > 0) {
    return NextResponse.json({ error: 'Nao edite um squad com run ativa' }, { status: 409 })
  }

  const body = await req.json().catch(() => null)
  const updated = await prisma.squads.update({
    where: { id: current.id },
    data: {
      name: typeof body?.name === 'string' ? body.name.trim() : current.name,
      description: typeof body?.description === 'string' ? body.description.trim() : current.description,
      autonomy_mode: body?.autonomyMode === 'autonomous' ? 'autonomous' : body?.autonomyMode === 'interactive' ? 'interactive' : current.autonomy_mode,
      status: typeof body?.status === 'string' ? body.status : current.status,
      architect_summary: typeof body?.architectSummary === 'string' ? body.architectSummary.trim() : current.architect_summary,
    },
  })

  return NextResponse.json(updated)
}
