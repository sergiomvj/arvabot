'use client'

import { useState } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'

export function OrgSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="org-switcher p-3 border-t border-white/7 mt-auto relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
      >
        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <Building2 size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">Grupo Facebrasil</div>
          <div className="text-[10px] text-[#4a5580]">Enterprise Plan</div>
        </div>
        <ChevronDown size={14} className={`text-[#4a5580] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#0C1221] border border-white/10 rounded-lg shadow-2xl p-1 z-50">
          <div className="p-2 text-[10px] uppercase tracking-wider text-[#4a5580] font-mono">Suas Organizaes</div>
          <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium cursor-pointer">
            ● Grupo Facebrasil
          </div>
          <div className="p-2 rounded-md hover:bg-white/5 text-[#8892b0] text-xs cursor-pointer">
            ○ Cliente A (Bia)
          </div>
          <div className="p-2 rounded-md hover:bg-white/5 text-[#8892b0] text-xs cursor-pointer">
            ○ Cliente B (Gabe)
          </div>
        </div>
      )}
    </div>
  )
}
