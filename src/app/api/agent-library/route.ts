import { NextResponse } from 'next/server'

import { getCurrentOrganizationContext } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const agents = await prisma.agents_cache.findMany({
    where: {
      organization_id: context.orgId,
      active: true,
    },
    select: {
      openclaw_id: true,
      name: true,
      role: true,
      skills: true,
      color: true,
      status: {
        select: {
          status: true,
          tasks_done: true,
          tasks_pending: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const library = agents.map((agent) => ({
    id: agent.openclaw_id,
    name: agent.name,
    role: agent.role || 'Agente',
    skills: agent.skills,
    color: agent.color,
    suggestedUses: [
      agent.role || 'Operação geral',
      agent.skills.length > 0 ? `Usar quando precisar de ${agent.skills.join(', ')}` : 'Usar em etapas genéricas',
    ],
    status: agent.status?.status || 'offline',
    throughput: {
      done: agent.status?.tasks_done || 0,
      pending: agent.status?.tasks_pending || 0,
    },
  }))

  return NextResponse.json(library)
}
