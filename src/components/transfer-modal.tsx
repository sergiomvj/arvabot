'use client'

import { useState } from 'react'
import { Move, X } from 'lucide-react'
import { transferAgent } from '@/lib/actions/agents'

interface TransferModalProps {
  agent: any
  organizations: any[]
  currentOrgId: string
  onClose: () => void
}

export function TransferModal({ agent, organizations, currentOrgId, onClose }: TransferModalProps) {
  const [targetId, setTargetId] = useState('')
  const [loading, setLoading] = useState(false)
  
  const otherOrgs = organizations.filter(org => org.id !== currentOrgId)

  async function handleTransfer() {
    if (!targetId) return
    setLoading(true)
    try {
      const result = await transferAgent(agent.id, targetId)
      if (result.success) {
        alert('Agente transferido com sucesso!')
        window.location.reload()
      } else {
        alert(`Erro: ${result.error}`)
      }
    } catch (error) {
      alert('Erro ao transferir agente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0C0F1A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Move size={18} className="text-emerald-500" />
            <h3 className="text-lg font-bold text-white">Transferir Agente</h3>
          </div>
          <button onClick={onClose} className="text-[#4a5580] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-[#07090F] border border-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 font-bold">
              {agent.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{agent.name}</div>
              <div className="text-[10px] text-[#4a5580] uppercase tracking-wider font-mono">ID: {agent.openclaw_id}</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-widest text-[#8892b0] font-mono font-bold">Empresa de Destino</label>
            <select 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-[#07090F] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
            >
              <option value="">Selecione uma empresa...</option>
              {otherOrgs.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {otherOrgs.length === 0 && (
            <p className="text-[10px] text-amber-500/70 italic">
              Você não possui outras empresas cadastradas para realizar a transferência.
            </p>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-white/5 text-xs font-bold text-[#8892b0] hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleTransfer}
              disabled={loading || !targetId}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/10"
            >
              {loading ? 'Transferindo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
