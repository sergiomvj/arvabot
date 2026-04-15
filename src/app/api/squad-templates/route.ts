import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext, requireRole } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

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

  const templates = await prisma.squad_templates.findMany({
    where: {
      active: true,
      OR: [{ organization_id: null }, { organization_id: context.orgId }],
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  if (!requireRole(context.role, ['owner', 'admin'])) {
    return NextResponse.json({ error: 'Sem permissao para criar squad por template' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const templateKey = typeof body?.templateKey === 'string' ? body.templateKey : ''
  if (!templateKey) return NextResponse.json({ error: 'templateKey obrigatorio' }, { status: 422 })

  const template = await prisma.squad_templates.findUnique({
    where: { key: templateKey },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!template || !template.active) {
    return NextResponse.json({ error: 'Template nao encontrado' }, { status: 404 })
  }

  const slugBase = slugify(typeof body?.name === 'string' ? body.name : template.name)
  let slug = slugBase
  let suffix = 1

  while (
    await prisma.squads.findFirst({
      where: {
        organization_id: context.orgId,
        slug,
      },
      select: { id: true },
    })
  ) {
    suffix += 1
    slug = `${slugBase}-${suffix}`
  }

  const squad = await prisma.squads.create({
    data: {
      organization_id: context.orgId,
      slug,
      name: typeof body?.name === 'string' ? body.name : template.name,
      description: template.description,
      autonomy_mode: template.autonomy_mode,
      status: 'active',
      active: true,
      preset_key: template.key,
      steps: {
        create: template.steps.map((step) => ({
          organization_id: context.orgId,
          agent_id: step.agent_id,
          order: step.order,
          title: step.title,
          instructions: step.instructions,
          checkpoint_required: step.checkpoint_required,
          step_type: step.step_type,
          skill_code: step.skill_code,
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
