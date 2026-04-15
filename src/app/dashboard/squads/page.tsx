import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Layers3, Sparkles } from 'lucide-react'

import { ArchitectStudio } from '@/components/squads/architect-studio'
import { CreateFromTemplateButton, RunSquadButton } from '@/components/squads/squad-buttons'
import { prisma } from '@/lib/prisma'
import { getViewerContext } from '@/lib/viewer-context'

export const dynamic = 'force-dynamic'

export default async function SquadsPage() {
  const viewer = await getViewerContext()
  if (!viewer) redirect('/login')
  if (!viewer.currentOrgId) redirect('/organizations')

  const [squads, templates] = await Promise.all([
    prisma.squads.findMany({
      where: { organization_id: viewer.currentOrgId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        runs: { orderBy: { started_at: 'desc' }, take: 3 },
      },
      orderBy: { updated_at: 'desc' },
    }),
    prisma.squad_templates.findMany({
      where: {
        active: true,
        OR: [{ organization_id: null }, { organization_id: viewer.currentOrgId }],
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
  ])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Layers3 className="text-emerald-500" /> Squads
          </h1>
          <p className="text-sm text-[#4a5580] mt-1">
            Orquestre múltiplos agentes em pipelines sequenciais por organização.
          </p>
        </div>
        <Link href="#arquiteto" className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-sm">
          Novo squad com arquiteto
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#4a5580] font-mono">Squads</div>
          <div className="mt-2 text-3xl font-bold text-white">{squads.length}</div>
        </div>
        <div className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#4a5580] font-mono">Templates</div>
          <div className="mt-2 text-3xl font-bold text-white">{templates.length}</div>
        </div>
        <div className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#4a5580] font-mono">Runs recentes</div>
          <div className="mt-2 text-3xl font-bold text-white">{squads.reduce((sum, squad) => sum + squad.runs.length, 0)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8">
        <div className="space-y-4">
          {squads.length === 0 ? (
            <div className="bg-[#0C0F1A] border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <div className="text-white font-semibold">Nenhum squad criado ainda</div>
              <div className="text-sm text-[#4a5580] mt-2">Use o arquiteto abaixo ou parta de um template.</div>
            </div>
          ) : (
            squads.map((squad) => (
              <div key={squad.id} className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-white">{squad.name}</div>
                    <div className="text-xs uppercase tracking-wider text-[#4a5580] mt-1">
                      {squad.status} • {squad.autonomy_mode} • {squad.steps.length} etapas
                    </div>
                    {squad.description && <p className="text-sm text-[#8892b0] mt-3">{squad.description}</p>}
                  </div>
                  <RunSquadButton squadId={squad.id} />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {squad.steps.map((step) => (
                    <div key={step.id} className="rounded-xl border border-white/8 bg-[#07090F] p-3">
                      <div className="text-sm text-white font-semibold">
                        {step.order}. {step.title || `Etapa ${step.order}`}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-[#4a5580] mt-1">
                        {step.agent_id} {step.skill_code ? `• ${step.skill_code}` : ''} {step.checkpoint_required ? '• checkpoint' : ''}
                      </div>
                    </div>
                  ))}
                </div>

                {squad.runs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {squad.runs.map((run) => (
                      <div key={run.id} className="rounded-xl border border-white/8 bg-[#07090F] px-4 py-3 flex items-center justify-between gap-3">
                        <div className="text-sm text-white">Run {run.id.slice(0, 8)}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[#4a5580]">
                          {run.status} • etapa {run.current_step || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Sparkles size={16} className="text-amber-400" /> Templates e presets
            </div>
            <div className="space-y-3 mt-4">
              {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-white/8 bg-[#07090F] p-4">
                  <div className="text-sm font-semibold text-white">{template.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#4a5580] mt-1">
                    {template.category || 'general'} • {template.autonomy_mode}
                  </div>
                  {template.description && <p className="text-xs text-[#8892b0] mt-3">{template.description}</p>}
                  <CreateFromTemplateButton templateKey={template.key} suggestedName={template.name} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="arquiteto">
        <ArchitectStudio />
      </div>
    </div>
  )
}
