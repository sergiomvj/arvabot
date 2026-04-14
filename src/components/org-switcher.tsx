'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { Building2, ChevronDown, LogOut, Plus } from 'lucide-react'

import { signOut } from '@/lib/actions/auth'
import { switchOrganization } from '@/lib/actions/organizations'

interface OrganizationOption {
  id: string
  name: string
}

interface OrgSwitcherProps {
  currentOrg: OrganizationOption
  allOrgs: OrganizationOption[]
}

export function OrgSwitcher({ currentOrg, allOrgs }: OrgSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  async function handleSwitch(id: string) {
    if (id === currentOrg.id || isSwitching) return

    setIsSwitching(true)

    try {
      await switchOrganization(id)
      setIsOpen(false)
      startTransition(() => {
        router.refresh()
      })
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="org-switcher p-3 border-t border-white/7 mt-auto relative">
      <div onClick={() => setIsOpen((prev) => !prev)} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all">
        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <Building2 size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{currentOrg.name}</div>
          <div className="text-[10px] text-[#4a5580] uppercase tracking-wider font-mono">Workspace Ativo</div>
        </div>
        <ChevronDown size={14} className={`text-[#4a5580] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#0C1221] border border-white/10 rounded-lg shadow-2xl p-1 z-50 overflow-hidden">
          <div className="p-2 text-[10px] uppercase tracking-wider text-[#4a5580] font-mono">Suas Organizacoes</div>
          <div className="max-h-[200px] overflow-y-auto">
            {allOrgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSwitch(org.id)}
                disabled={isSwitching}
                className={`w-full p-2 rounded-md transition-all text-xs cursor-pointer flex items-center justify-between group ${
                  org.id === currentOrg.id ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'hover:bg-white/5 text-[#8892b0]'
                } ${isSwitching ? 'opacity-60 cursor-wait' : ''}`}
              >
                <span>{org.id === currentOrg.id ? '●' : '○'} {org.name}</span>
              </button>
            ))}
          </div>

          <Link href="/organizations" onClick={() => setIsOpen(false)} className="flex items-center gap-2 p-2 mt-1 border-t border-white/5 text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors uppercase font-bold tracking-widest">
            <Plus size={12} />
            Gerenciar/Criar
          </Link>

          <button onClick={() => signOut()} className="w-full flex items-center gap-2 p-2 text-[10px] text-red-500/70 hover:text-red-400 transition-colors uppercase font-bold tracking-widest">
            <LogOut size={12} />
            Sair da Conta
          </button>
        </div>
      )}
    </div>
  )
}
