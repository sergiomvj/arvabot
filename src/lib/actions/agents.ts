'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function transferAgent(agentId: string, targetOrgId: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('Não autorizado')

  // 1. Validar permissão na organização de destino
  const member = await prisma.organization_members.findUnique({
    where: {
      organization_id_user_id: {
        organization_id: targetOrgId,
        user_id: session.user.id
      }
    }
  })

  if (!member) throw new Error('Você não tem permissão na organização de destino')

  // 2. Buscar dados do agente
  const agent = await prisma.agents_cache.findUnique({
    where: { id: agentId }
  })

  if (!agent) throw new Error('Agente não encontrado')

  // 3. Executar transferência em transação
  try {
    await prisma.$transaction(async (tx) => {
      // Verificar se já existe um cache desse agente na org de destino
      const existing = await tx.agents_cache.findUnique({
        where: {
          organization_id_openclaw_id: {
            organization_id: targetOrgId,
            openclaw_id: agent.openclaw_id
          }
        }
      })

      if (existing) {
        throw new Error('Este agente já existe na organização de destino')
      }

      // Atualizar Cache do Agente
      await tx.agents_cache.update({
        where: { id: agentId },
        data: { organization_id: targetOrgId }
      })

      // Atualizar Status
      await tx.agent_status.updateMany({
        where: { 
          organization_id: agent.organization_id,
          openclaw_id: agent.openclaw_id
        },
        data: { organization_id: targetOrgId }
      })

      // Atualizar Threads (opcional: o usuário pode querer manter o histórico)
      await tx.agent_threads.updateMany({
        where: { 
          organization_id: agent.organization_id,
          agent_id: agent.openclaw_id
        },
        data: { organization_id: targetOrgId }
      })
    })

    revalidatePath('/')
    revalidatePath('/dashboard/agents')
    return { success: true }
  } catch (error: any) {
    console.error('Erro na transferência:', error)
    return { success: false, error: error.message || 'Falha na transferência' }
  }
}
