import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { OrgSwitcher } from "@/components/org-switcher"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Settings, Users, LayoutDashboard } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ARVABots - Dashboard Multi-Tenant",
  description: "Gerencie agentes ARVA para múltiplas organizações",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let currentOrg = null
  let userOrgs: any[] = []

  if (session) {
    // 1. Executar consultas em paralelo para ganhar performance
    const [existingProfile, memberships] = await Promise.all([
      prisma.profiles.findUnique({
        where: { id: session.user.id },
        include: { organization: true }
      }),
      prisma.organization_members.findMany({
        where: { user_id: session.user.id },
        include: { organization: true }
      })
    ])

    let profile = existingProfile
    if (!profile) {
      profile = await prisma.profiles.create({
        data: {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
          avatar_url: session.user.user_metadata?.avatar_url || null,
        },
        include: { organization: true }
      })
    }

    currentOrg = profile?.organization || null
    userOrgs = memberships.map(m => m.organization)
  }

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="shell min-h-screen bg-[#07090F] flex">
          {session && currentOrg && (
            <aside className="sidebar w-[190px] flex-shrink-0 bg-[#0C0F1A] border-r border-white/7 flex flex-col overflow-hidden">
              <div className="sidebar-brand p-4 border-b border-white/7 flex items-center gap-2.5">
                <div className="brand-icon w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold">🦞</div>
                <div>
                  <div className="brand-name font-bold text-sm">OpenClaw</div>
                  <div className="brand-sub text-xs text-[#4a5580] font-mono whitespace-nowrap overflow-hidden text-ellipsis">dashboard.fbrapps.com</div>
                </div>
              </div>
              <nav className="sidebar-nav flex-1 p-2.5 overflow-y-auto flex flex-col gap-0.5">
                <div className="nav-group-label text-xs uppercase tracking-wider text-[#4a5580] p-2 font-mono">Principal</div>
                <Link href="/dashboard" className="nav-item flex items-center gap-2.25 p-2 rounded-md text-[#8892b0] text-xs font-medium hover:bg-[#111528] hover:text-white cursor-pointer active">
                  <LayoutDashboard size={16} /> Overview
                </Link>
                <Link href="/dashboard/agents" className="nav-item flex items-center gap-2.25 p-2 rounded-md text-[#8892b0] text-xs font-medium hover:bg-[#111528] hover:text-white cursor-pointer">
                  <Users size={16} /> Agentes
                </Link>
                <div className="mt-4 nav-group-label text-xs uppercase tracking-wider text-[#4a5580] p-2 font-mono">Sistema</div>
                <Link href="/dashboard/settings" className="nav-item flex items-center gap-2.25 p-2 rounded-md text-[#8892b0] text-xs font-medium hover:bg-[#111528] hover:text-white cursor-pointer">
                  <Settings size={16} /> Configurações
                </Link>
              </nav>
              <OrgSwitcher currentOrg={currentOrg} allOrgs={userOrgs} />
            </aside>
          )}
          {/* Usuário logado mas sem organização: mostra aviso inline */}
          {session && !currentOrg && (
            <aside className="sidebar w-[190px] flex-shrink-0 bg-[#0C0F1A] border-r border-white/7 flex flex-col overflow-hidden">
              <div className="sidebar-brand p-4 border-b border-white/7 flex items-center gap-2.5">
                <div className="brand-icon w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold">🦞</div>
                <div>
                   <div className="brand-name font-bold text-sm">OpenClaw</div>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-[#4a5580] text-xs mb-4">Você não está em nenhuma organização.</p>
                <Link
                  href="/organizations"
                  className="text-xs bg-emerald-500 text-black font-bold px-3 py-2 rounded-lg hover:bg-emerald-400 transition-colors"
                >
                  Entrar / Criar Org
                </Link>
              </div>
            </aside>
          )}
          <main className="flex-1 flex flex-col overflow-y-auto bg-[#07090F] scroll-smooth">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
