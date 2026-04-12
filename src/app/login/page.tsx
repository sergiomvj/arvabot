'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Bot, Mail, Lock, ArrowRight, Github } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#07090F] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-3xl font-bold mb-4 shadow-lg shadow-emerald-500/20">
            <Bot size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">ARVABots</h1>
          <p className="text-[#4a5580] text-sm">Acesse seu centro de inteligência</p>
        </div>

        {/* Card */}
        <div className="bg-[#0C0F1A] border border-white/5 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#8892b0] uppercase tracking-wider mb-2 font-mono">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5580]" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#07090F] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8892b0] uppercase tracking-wider mb-2 font-mono">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5580]" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#07090F] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar na Plataforma'}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5">
            <button className="w-full bg-white/5 hover:bg-white/10 text-[#8892b0] text-sm font-medium py-3 rounded-xl border border-white/5 transition-all flex items-center justify-center gap-3">
              <Github size={18} />
              Continuar com GitHub
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-[#4a5580] text-xs">
          Ainda não tem uma conta? <span className="text-emerald-500 cursor-pointer font-semibold hover:text-emerald-400 transition-colors">Solicite acesso à sua organização</span>
        </p>
      </div>
    </div>
  )
}
