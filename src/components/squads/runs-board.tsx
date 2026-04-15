type RunBoardItem = {
  id: string
  status: string
  current_step: number | null
  started_at: Date
  completed_at: Date | null
  failed_at: Date | null
  squad: {
    id: string
    name: string
    slug: string | null
  }
  steps: Array<{
    id: string
    status: string
    handoff_summary: string | null
    output_text: string | null
  }>
  checkpoints: Array<{
    id: string
    status: string
  }>
}

function statusClass(status: string) {
  switch (status) {
    case 'completed':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    case 'checkpoint':
      return 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    case 'failed':
    case 'aborted':
      return 'text-red-300 border-red-500/30 bg-red-500/10'
    default:
      return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
  }
}

export function RunsBoard({ runs }: { runs: RunBoardItem[] }) {
  return (
    <div className="space-y-4">
      {runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0C0F1A] px-6 py-10 text-center text-sm text-[#8892b0]">
          Nenhuma run registrada ainda.
        </div>
      ) : (
        runs.map((run) => (
          <div key={run.id} className="rounded-2xl border border-white/7 bg-[#0C0F1A] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">{run.squad.name}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[#4a5580]">
                  run {run.id.slice(0, 8)} • step {run.current_step ?? '-'}
                </div>
              </div>
              <div className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider ${statusClass(run.status)}`}>
                {run.status}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-[#07090F] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-[#4a5580]">Inicio</div>
                <div className="mt-1 text-sm text-white">{new Date(run.started_at).toLocaleString('pt-BR')}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#07090F] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-[#4a5580]">Checkpoints</div>
                <div className="mt-1 text-sm text-white">{run.checkpoints.length}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#07090F] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-[#4a5580]">Etapas registradas</div>
                <div className="mt-1 text-sm text-white">{run.steps.length}</div>
              </div>
            </div>

            {run.steps.length > 0 && (
              <div className="mt-4 space-y-2">
                {run.steps.map((step, index) => (
                  <div key={step.id} className="rounded-xl border border-white/8 bg-[#07090F] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white">Registro de etapa {index + 1}</div>
                      <div className="text-[10px] uppercase tracking-wider text-[#4a5580]">{step.status}</div>
                    </div>
                    {step.handoff_summary && <div className="mt-2 text-xs text-[#8892b0]">{step.handoff_summary}</div>}
                    {step.output_text && <div className="mt-2 text-xs text-[#4a5580]">{step.output_text}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
