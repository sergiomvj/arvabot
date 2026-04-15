import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext, requireRole } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'
import type { SquadCreatePayload } from '@/lib/types/squads'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const squads = await prisma.squads.findMany({
    where: { organization_id: context.orgId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
      runs: {
        take: 5,
        orderBy: { started_at: 'desc' },
      },
    },
    orderBy: [{ active: 'desc' }, { updated_at: 'desc' }],
  })

  return NextResponse.json(squads)
}

export async function POST(req: NextRequest) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  if (!requireRole(context.role, ['owner', 'admin'])) {
    return NextResponse.json({ error: 'Sem permissao para criar squads' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as SquadCreatePayload | null
  if (!body?.name || !Array.isArray(body.steps) || body.steps.length === 0) {
    return NextResponse.json({ error: 'Payload invalido para squad' }, { status: 422 })
  }

  const autonomyMode = body.autonomyMode === 'autonomous' ? 'autonomous' : 'interactive'
  const slug = slugify(body.slug || body.name)

  const existing = await prisma.squads.findFirst({
    where: {
      organization_id: context.orgId,
      slug,
    },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: 'Ja existe um squad com esse slug' }, { status: 409 })
  }

  const steps = [...body.steps].sort((a, b) => a.order - b.order)
  if (autonomyMode === 'interactive' && !steps.some((step) => step.checkpointRequired)) {
    const lastStep = steps[steps.length - 1]
    lastStep.checkpointRequired = true
  }

  const squad = await prisma.squads.create({
    data: {
      organization_id: context.orgId,
      slug,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      architect_prompt: body.architectPrompt?.trim() || null,
      architect_summary: body.architectSummary?.trim() || null,
      autonomy_mode: autonomyMode,
      preset_key: body.presetKey || null,
      status: 'active',
      active: true,
      steps: {
        create: steps.map((step) => ({
          organization_id: context.orgId,
          agent_id: step.agentId,
          order: step.order,
          title: step.title,
          instructions: step.instructions,
          checkpoint_required: Boolean(step.checkpointRequired),
          skill_code: step.skillCode || null,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  })

  return NextResponse.json(squad, { status: 201 })
}
