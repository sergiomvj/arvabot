'use client'

import { useState } from 'react'

type AgentSummary = {
  openclaw_id: string
  name: string
  role: string | null
}

type SuggestionStep = {
  order: number
  agentId: string
  title: string
  instructions: string
  checkpointRequired?: boolean
  skillCode?: string | null
}

type SuggestionPayload = {
  prompt: string
  availableAgents: AgentSummary[]
  suggestion: {
    name: string
    slug: string
    description: string
    architectSummary: string
    autonomyMode: 'interactive' | 'autonomous'
    presetKey: string | null
    steps: SuggestionStep[]
  }
}

export function ArchitectStudio() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SuggestionPayload | null>(null)

  async function handleSuggest() {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/architect/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Falha ao gerar sugestao')
      setResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSquad() {
    if (!result) return
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.suggestion.name,
          slug: result.suggestion.slug,
          description: result.suggestion.description,
          architectPrompt: result.prompt,
          architectSummary: result.suggestion.architectSummary,
          autonomyMode: result.suggestion.autonomyMode,
          presetKey: result.suggestion.presetKey,
          steps: result.suggestion.steps,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Falha ao salvar squad')

      window.location.href = '/dashboard/squads'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#0C0F1A] border border-white/7 rounded-2xl p-6 shadow-2xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Agente Arquiteto</h2>
        <p className="text-xs text-[#4a5580] mt-1">
          Descreva a dor do cliente e deixe o The Call 2.0 sugerir um squad inicial.
        </p>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="w-full min-h-[140px] bg-[#07090F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50"
        placeholder="Ex: preciso transformar videos do YouTube em conteudo para LinkedIn com checkpoint antes da versao final..."
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-sm disabled:opacity-60"
        >
          {loading ? 'Gerando...' : 'Gerar sugestao'}
        </button>

        {result && (
          <button
            type="button"
            onClick={handleCreateSquad}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold text-sm disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar squad sugerido'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-[#07090F] p-4">
            <div className="text-white font-semibold">{result.suggestion.name}</div>
            <div className="text-xs text-[#8892b0] mt-1">{result.suggestion.description}</div>
            <div className="text-xs text-[#4a5580] mt-3">{result.suggestion.architectSummary}</div>
          </div>

          <div className="space-y-3">
            {result.suggestion.steps.map((step) => (
              <div key={`${step.order}-${step.agentId}`} className="rounded-xl border border-white/8 bg-[#07090F] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {step.order}. {step.title}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-[#4a5580] mt-1">
                      Agente: {step.agentId}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400">
                    {step.checkpointRequired ? 'Checkpoint' : 'Auto'}
                  </div>
                </div>
                <div className="text-xs text-[#8892b0] mt-3 leading-relaxed">{step.instructions}</div>
                {step.skillCode && (
                  <div className="mt-3 text-[10px] uppercase tracking-wider text-cyan-300">
                    Skill: {step.skillCode}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
