import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateOrganizationSettings } from '@/lib/actions/organizations'
import { Settings, Globe, Key, Save, AlertCircle } from 'lucide-react'

export default async function SettingsPage({
  searchParams
}: {
  searchParams: { success?: string }
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    include: { organization: true }
  })

  if (!profile?.organization) redirect('/organizations')

  const org = profile.organization
  const isSuccess = searchParams.success === 'true'

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {isSuccess && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-500 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black">
            <Save size={16} />
          </div>
          <div className="text-sm font-bold">Configurações salvas com sucesso!</div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-[#4a5580] text-sm">Gerencie as integrações da organização {org.name}</p>
        </div>
      </div>

      <div className="bg-[#0C0F1A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe size={20} className="text-emerald-500" />
            Integração OpenClaw Master
          </h2>
          <p className="text-xs text-[#4a5580] mt-1">Configure o endpoint de onde os dados dos agentes serão sincronizados.</p>
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
              <label className="block text-xs font-semibold text-[#8892b0] uppercase tracking-wider mb-2 font-mono">API Key (Service Role)</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5580]" size={18} />
                <input
                  name="openclaw_api_key"
                  type="password"
                  defaultValue={org.openclaw_api_key || ''}
                  className="w-full bg-[#07090F] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-mono"
                  placeholder="sk-openclaw-..."
                />
              </div>
              <p className="mt-2 text-[10px] text-[#4a5580] italic flex items-center gap-1">
                <AlertCircle size={10} />
                Esta chave é usada apenas para sincronizar o cache de agentes.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
            >
              <Save size={18} />
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
