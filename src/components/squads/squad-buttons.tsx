'use client'

import { useState } from 'react'

export function RunSquadButton({ squadId }: { squadId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/squads/${squadId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Falha ao rodar squad')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleRun}
        disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? 'Rodando...' : 'Rodar'}
      </button>
      {error && <div className="text-[11px] text-red-300 max-w-[220px] text-right">{error}</div>}
    </div>
  )
}

export function CreateFromTemplateButton({ templateKey, suggestedName }: { templateKey: string; suggestedName: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/squad-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey,
          name: suggestedName,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Falha ao criar squad por template')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleCreate}
        disabled={busy}
        className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? 'Criando...' : 'Criar squad'}
      </button>
      {error && <div className="mt-2 text-[11px] text-red-300">{error}</div>}
    </div>
  )
}
