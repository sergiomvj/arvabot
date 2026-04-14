import { redirect } from 'next/navigation'
import { AlertCircle, Globe, Key, Save, Settings } from 'lucide-react'

import { updateOrganizationSettings } from '@/lib/actions/organizations'
import { getViewerContext } from '@/lib/viewer-context'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { success?: string }
}) {
  const viewer = await getViewerContext()
  if (!viewer) redirect('/login')
  if (!viewer.currentOrg) redirect('/organizations')

  const org = viewer.currentOrg
  const isSuccess = searchParams.success === 'true'

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {isSuccess && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-500 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black">
            <Save size={16} />
          </div>
          <div className="text-sm font-bold">Configuracoes salvas com sucesso!</div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
          <p className="text-[#4a5580] text-sm">Gerencie as integracoes da organizacao {org.name}</p>
        </div>
      </div>

      <div className="bg-[#0C0F1A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe size={20} className="text-emerald-500" />
            Integracao OpenClaw Master
          </h2>
          <p className="text-xs text-[#4a5580] mt-1">Configure o endpoint de onde os dados dos agentes serao sincronizados.</p>
        </div>

        <form action={updateOrganizationSettings} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8892b0] uppercase tracking-wider mb-2 font-mono">URL do Master Dashboard</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5580]" size={18} />
                <input
                  name="openclaw_url"
                  defaultValue={org.openclaw_url}
                  className="w-full bg-[#07090F] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-mono"
                  placeholder="https://dashboard.fbrapps.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8892b0] uppercase tracking-wider mb-2 font-mono">API Key do OpenClaw</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5580]" size={18} />
                <input
                  name="openclaw_api_key"
                  type="password"
                  defaultValue={org.openclaw_api_key || ''}
                  className="w-full bg-[#07090F] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-mono"
                  placeholder="oc_live_..."
                />
              </div>
              <p className="mt-2 text-[10px] text-[#4a5580] italic flex items-center gap-1">
                <AlertCircle size={10} />
                Use uma ApiKey do OpenClaw com escopo para agents e oracle.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group">
              <Save size={18} />
              Salvar Configuracoes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
