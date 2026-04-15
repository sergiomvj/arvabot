import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext, requireRole } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function planAllows(orgPlan: string, planGate: string | null) {
  const weight: Record<string, number> = {
    starter: 1,
    professional: 2,
    enterprise: 3,
  }

  return weight[orgPlan] >= weight[planGate || 'starter']
}

export async function GET() {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const bindings = await prisma.organization_skill_bindings.findMany({
    where: { organization_id: context.orgId },
    include: { skill: true },
    orderBy: { enabled_at: 'desc' },
  })

  return NextResponse.json(bindings)
}

export async function POST(req: NextRequest) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  if (!requireRole(context.role, ['owner', 'admin'])) {
    return NextResponse.json({ error: 'Sem permissao para gerenciar skills' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const skillCode = typeof body?.skillCode === 'string' ? body.skillCode : ''

  if (!skillCode) {
    return NextResponse.json({ error: 'skillCode obrigatorio' }, { status: 422 })
  }

  const [organization, skill] = await Promise.all([
    prisma.organizations.findUnique({
      where: { id: context.orgId },
      select: { id: true, plan: true },
    }),
    prisma.skill_definitions.findUnique({
      where: { code: skillCode },
    }),
  ])

  if (!organization || !skill) {
    return NextResponse.json({ error: 'Organizacao ou skill nao encontrada' }, { status: 404 })
  }

  if (!planAllows(organization.plan, skill.plan_gate)) {
    return NextResponse.json({ error: 'Plano atual nao permite esta skill' }, { status: 403 })
  }

  const binding = await prisma.organization_skill_bindings.upsert({
    where: {
      organization_id_skill_id: {
        organization_id: context.orgId,
        skill_id: skill.id,
      },
    },
    update: {
      status: body?.status === 'disabled' ? 'disabled' : 'enabled',
      config: body?.config ?? undefined,
      secret_ref: typeof body?.secretRef === 'string' ? body.secretRef : null,
      enabled_by: context.userId,
    },
    create: {
      organization_id: context.orgId,
      skill_id: skill.id,
      status: body?.status === 'disabled' ? 'disabled' : 'enabled',
      config: body?.config ?? undefined,
      secret_ref: typeof body?.secretRef === 'string' ? body.secretRef : null,
      enabled_by: context.userId,
    },
    include: { skill: true },
  })

  return NextResponse.json(binding, { status: 201 })
}
