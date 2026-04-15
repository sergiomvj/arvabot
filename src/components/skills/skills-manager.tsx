'use client'

import { useState } from 'react'

type SkillItem = {
  id: string
  code: string
  name: string
  description: string | null
  type: string
  provider: string | null
  plan_gate: string | null
  status: string
  organization_bindings: Array<{
    id: string
    status: string
  }>
}

export function SkillsManager({ initialSkills }: { initialSkills: SkillItem[] }) {
  const [skills, setSkills] = useState(initialSkills)
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleSkill(skill: SkillItem) {
    setBusyCode(skill.code)
    setError(null)

    try {
      const currentStatus = skill.organization_bindings[0]?.status === 'enabled' ? 'disabled' : 'enabled'
      const response = await fetch('/api/organization-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillCode: skill.code,
          status: currentStatus,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Falha ao atualizar skill')

      setSkills((current) =>
        current.map((item) =>
          item.code === skill.code
            ? {
                ...item,
                organization_bindings: [{ id: payload.id, status: payload.status }],
              }
            : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setBusyCode(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {skills.map((skill) => {
          const enabled = skill.organization_bindings[0]?.status === 'enabled'
          return (
            <div key={skill.id} className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white">{skill.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#4a5580] mt-1">
                    {skill.type} {skill.provider ? `• ${skill.provider}` : ''} {skill.plan_gate ? `• plano ${skill.plan_gate}` : ''}
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${enabled ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-[#8892b0] border-white/10 bg-white/5'}`}>
                  {enabled ? 'habilitada' : 'desabilitada'}
                </span>
              </div>

              <p className="text-xs text-[#8892b0] mt-4 leading-relaxed">{skill.description || 'Sem descrição cadastrada.'}</p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  disabled={busyCode === skill.code}
                  className="px-4 py-2 rounded-xl bg-[#111528] border border-white/10 text-sm text-white hover:border-emerald-500/30 disabled:opacity-60"
                >
                  {busyCode === skill.code ? 'Atualizando...' : enabled ? 'Desabilitar' : 'Habilitar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
