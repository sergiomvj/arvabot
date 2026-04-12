import { prisma } from '@/lib/prisma'
import { acceptInvitation } from '@/lib/actions/organizations'
import { Building2, UserPlus, ShieldCheck } from 'lucide-react'

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await prisma.invitations.findUnique({
    where: { token: params.token },
    include: { organization: true }
  })

  if (!invite) {
    return (
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-white mb-2">Convite não encontrado</h1>
          <p className="text-[#4a5580] text-sm">Este convite foi excluído ou expirou.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090F] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <div className="bg-[#0C0F1A] border border-white/5 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-6 border border-emerald-500/10">
            <UserPlus size={40} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Convite Recebido!</h1>
          <p className="text-[#8892b0] mb-8">
            Você foi convidado para se juntar à organização <br />
            <strong className="text-white text-lg">{invite.organization.name}</strong>
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 text-left border border-white/5">
              <ShieldCheck className="text-emerald-500 mt-1 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs font-semibold text-white uppercase tracking-wider mb-1 font-mono">Cargo: {invite.role}</p>
                <p className="text-[11px] text-[#4a5580] leading-relaxed">
                  Ao aceitar, você terá acesso aos agentes, tarefas e oráculos vinculados a esta organização.
                </p>
              </div>
            </div>

            <form action={async () => {
              'use server'
              await acceptInvitation(params.token)
            }}>
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
              >
                Aceitar Convite e Entrar
                <Building2 size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
