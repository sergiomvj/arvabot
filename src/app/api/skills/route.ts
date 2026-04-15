import { NextResponse } from 'next/server'

import { getCurrentOrganizationContext } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const context = await getCurrentOrganizationContext()
  if (!context) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const skills = await prisma.skill_definitions.findMany({
    include: {
      organization_bindings: {
        where: { organization_id: context.orgId },
      },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(skills)
}
