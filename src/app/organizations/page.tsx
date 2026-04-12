import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Plus, ArrowRight } from 'lucide-react'
import { switchOrganization } from '@/lib/actions/organizations'

export default async function OrganizationsPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const memberships = await prisma.organization_members.findMany({
    where: { user_id: session.user.id },
    include: { organization: true }
  })

  // Se no tiver ninguma, manda criar a primeira
  if (memberships.length === 0) {
    redirect('/organizations/new')
  }

  return (
    <div className="min-h-screen bg-[#07090F] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[640px]">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Suas Organizações</h1>
            <p className="text-[#4a5580] text-sm">Selecione onde você deseja trabalhar hoje</p>
          </div>
          <Link 
            href="/organizations/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all font-semibold text-sm border border-emerald-500/20"
          >
            <Plus size={18} />
            Nova Organização
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberships.map((m) => (
            <form key={m.organization_id} action={async () => {
              'use server'
              await switchOrganization(m.organization_id)
              redirect('/dashboard/agents')
            }}>
              <button
                type="submit"
                className="w-full text-left bg-[#0C0F1A] border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group hover:shadow-xl hover:shadow-emerald-500/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-emerald-500">
                    <Building2 size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-0.5">{m.organization.name}</h3>
                    <p className="text-[#4a5580] text-xs font-mono lowercase">@{m.organization.slug}</p>
                  </div>
                  <ArrowRight size={20} className="text-[#4a5580] group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}
