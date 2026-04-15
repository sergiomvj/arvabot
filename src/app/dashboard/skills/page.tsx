import { redirect } from 'next/navigation'
import { Puzzle } from 'lucide-react'

import { SkillsManager } from '@/components/skills/skills-manager'
import { prisma } from '@/lib/prisma'
import { getViewerContext } from '@/lib/viewer-context'

export const dynamic = 'force-dynamic'

export default async function SkillsPage() {
  const viewer = await getViewerContext()
  if (!viewer) redirect('/login')
  if (!viewer.currentOrgId) redirect('/organizations')

  const skills = await prisma.skill_definitions.findMany({
    include: {
      organization_bindings: {
        where: { organization_id: viewer.currentOrgId },
        select: { id: true, status: true },
      },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Puzzle className="text-emerald-500" /> Skills Modulares
        </h1>
        <p className="text-sm text-[#4a5580] mt-1">
          Habilite ou desabilite capacidades por organização sem inflar o core dos agentes.
        </p>
      </div>

      <SkillsManager initialSkills={skills} />
    </div>
  )
}
