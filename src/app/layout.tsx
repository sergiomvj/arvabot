import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { OrgSwitcher } from "@/components/org-switcher"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ARVABots - Dashboard Multi-Tenant",
  description: "Gerencie agentes ARVA para múltiplas organizações",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="shell min-h-screen bg-[#07090F]">
          <aside className="sidebar w-[190px] flex-shrink-0 bg-[#0C0F1A] border-r border-white/7 flex flex-col overflow-hidden">
            <div className="sidebar-brand p-4 border-b border-white/7 flex items-center gap-2.5">
              <div className="brand-icon w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold">🤖</div>
              <div>
                <div className="brand-name font-bold text-sm">ARVABots</div>
                <div className="brand-sub text-xs text-[#4a5580] font-mono">arva.fbrapps.com</div>
              </div>
            </div>
            <nav className="sidebar-nav flex-1 p-2.5 overflow-y-auto flex flex-col gap-0.5">
              <div className="nav-group-label text-xs uppercase tracking-wider text-[#4a5580] p-2 font-mono">Principal</div>
              <div className="nav-item flex items-center gap-2.25 p-2 rounded-md text-[#8892b0] text-xs font-medium hover:bg-[#111528] hover:text-white cursor-pointer active">
                <span className="nav-icon text-base">◎</span> Overview
              </div>
              <div className="nav-item flex items-center gap-2.25 p-2 rounded-md text-[#8892b0] text-xs font-medium hover:bg-[#111528] hover:text-white cursor-pointer">
                <span className="nav-icon text-base">👥</span> Agentes
              </div>
              {/* More nav items */}
            </nav>
            <OrgSwitcher />
          </aside>
          <main className="flex-1 flex flex-col overflow-hidden bg-[#07090F]">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
