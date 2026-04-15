import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext, requireRole } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'
import { buildArchitectSuggestion } from '@/lib/squad-presets'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  if (!requireRole(context.role, ['owner', 'admin', 'member'])) {
    return NextResponse.json({ error: 'Sem permissao para usar o arquiteto' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt obrigatorio' }, { status: 422 })
  }

  const availableAgents = await prisma.agents_cache.findMany({
    where: { organization_id: context.orgId, active: true },
    select: { openclaw_id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  const suggestion = buildArchitectSuggestion(
    prompt,
    availableAgents.map((agent) => agent.openclaw_id),
  )

  await prisma.architect_suggestions.create({
    data: {
      organization_id: context.orgId,
      created_by: context.userId,
      prompt,
      suggestion,
    },
  })

  return NextResponse.json({
    prompt,
    availableAgents,
    suggestion,
  })
}
