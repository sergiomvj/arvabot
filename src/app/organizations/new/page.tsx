import { createOrganization } from '@/lib/actions/organizations'
import { Building2, ArrowRight, ShieldCheck } from 'lucide-react'

export default function NewOrganizationPage() {
  return (
    <div className="min-h-screen bg-[#07090F] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-4 border border-emerald-500/20">
            <PlusIcon size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Criar Nova Organização</h1>
          <p className="text-[#4a5580] text-sm">Configure o seu workspace para começar a gerenciar agentes</p>
        </div>

        <div className="bg-[#0C0F1A] border border-white/5 rounded-2xl p-8 shadow-2xl">
          <form action={createOrganization} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[#8892b0] uppercase tracking-wider mb-2 font-mono">Nome da Empresa</label>
              <input
                name="name"
                type="text"
                className="w-full bg-[#07090F] border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                placeholder="Ex: Arva Intelligence"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8892b0] uppercase tracking-wider mb-2 font-mono">Identificador (Slug)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5580] text-sm">arva.fbrapps.com/</span>
                <input
                  name="slug"
                  type="text"
                  className="w-full bg-[#07090F] border border-white/10 rounded-xl py-3 pl-[140px] pr-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                  placeholder="minha-empresa"
                  required
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex gap-3">
              <ShieldCheck className="text-emerald-500 flex-shrink-0" size={20} />
              <p className="text-[11px] text-emerald-500/70 leading-relaxed">
                Você será configurado como <strong>Owner</strong> desta organização. Você poderá convidar membros e gerenciar permissões no painel de configurações.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              Criar Workspace
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function PlusIcon({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
