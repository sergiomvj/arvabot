'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { syncAgentsAction } from '@/lib/actions/sync'

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)

  async function handleSync() {
    setIsSyncing(true)

    try {
      const result = await syncAgentsAction()

      if (result.success) {
        const disabledMessage =
          result.disabledCount > 0 ? ` ${result.disabledCount} agente(s) foram marcados como inativos.` : ''
        alert(`${result.message}${disabledMessage}`)
        return
      }

      const details = 'details' in result && result.details ? `\n\nDetalhes: ${result.details}` : ''
      alert(`Falha na sincronização: ${result.error}${details}`)
    } catch {
      alert('Erro inesperado ao sincronizar.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
        isSyncing
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-50 cursor-not-allowed'
          : 'bg-[#111528] border-white/7 text-[#8892b0] hover:border-white/20 hover:text-white'
      }`}
    >
      <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
      {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados Master'}
    </button>
  )
}
