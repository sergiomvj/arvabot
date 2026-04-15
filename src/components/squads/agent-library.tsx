type AgentLibraryItem = {
  id: string
  name: string
  role: string
  skills: string[]
  color: string | null
  suggestedUses: string[]
  status: string
  throughput: {
    done: number
    pending: number
  }
}

export function AgentLibrary({ agents }: { agents: AgentLibraryItem[] }) {
  return (
    <div className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-5">
      <div className="text-white font-semibold">Biblioteca de agentes-base</div>
      <p className="text-xs text-[#4a5580] mt-1">
        Referencia rapida dos agentes ativos desta organizacao para montar presets e squads.
      </p>

      <div className="mt-4 space-y-3">
        {agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#07090F] px-4 py-5 text-sm text-[#8892b0]">
            Nenhum agente ativo disponivel nesta organizacao.
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-white/8 bg-[#07090F] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{agent.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#4a5580] mt-1">
                    {agent.role} • {agent.status}
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: agent.color || '#10B981' }} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {agent.skills.length > 0 ? (
                  agent.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-[#8892b0]">
                    sem skills declaradas
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs text-[#8892b0]">
                {agent.suggestedUses.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>

              <div className="mt-3 text-[10px] uppercase tracking-wider text-[#4a5580]">
                throughput • done {agent.throughput.done} • pending {agent.throughput.pending}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
