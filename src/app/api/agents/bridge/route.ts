import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agents/bridge?agentId=...&userId=...
 * Busca uma thread ativa (recente) para continuidade de contexto
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  const userIdentifier = searchParams.get('userId')

  if (!agentId || !userIdentifier) {
    return NextResponse.json({ error: 'agentId e userId são obrigatórios' }, { status: 400 })
  }

  // 1. Verificar sesso/auth (opcional para agentes se usarem API Key)
  // Mas aqui assumimos que o Hub  a fonte da verdade segura.
  
  // 2. Buscar thread ativa (TTL 72h)
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - 72)

  const activeThread = await prisma.agent_threads.findFirst({
    where: {
      agent_id: agentId,
      user_identifier: userIdentifier,
      status: 'active',
      last_interaction: { gte: thresholdDate }
    },
    orderBy: { last_interaction: 'desc' }
  })

  return NextResponse.json({ thread: activeThread })
}

/**
 * POST /api/agents/bridge
 * Registra ou atualiza uma interao (Session Bridge)
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agentId, userId, theme, context, channel, status } = body

  if (!agentId || !userId || !theme || !context) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  // Identificar organizao (Assumimos org do agente)
  const agent = await prisma.agents_cache.findFirst({
    where: { openclaw_id: agentId }
  })

  if (!agent) {
    return NextResponse.json({ error: 'Agente não encontrado no Hub' }, { status: 404 })
  }

  const organizationId = agent.organization_id

  // 1. Upsert da Thread (baseado em Agent/User/Tema)
  // Ou se hover uma thread ativa recente do mesmo usurio, atualizamos ela.
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - 24) // 24h para agrupar na mesma thread

  const existingThread = await prisma.agent_threads.findFirst({
    where: {
      agent_id: agentId,
      user_identifier: userId,
      theme: { contains: theme?.split(' ')[0] }, // Busca por similaridade no tema
      status: 'active',
      last_interaction: { gte: thresholdDate }
    }
  })

  let thread
  if (existingThread) {
    thread = await prisma.agent_threads.update({
      where: { id: existingThread.id },
      data: {
        context: context, // Substitui ou apensa o contexto resumido
        channel: channel || existingThread.channel,
        status: status || 'active',
        last_interaction: new Date()
      }
    })
  } else {
    thread = await prisma.agent_threads.create({
      data: {
        organization_id: organizationId,
        agent_id: agentId,
        user_identifier: userId,
        theme,
        context,
        channel,
        status: status || 'active'
      }
    })
  }

  // 2. Manuteno: Limite de 20 threads ativas por agente
  const activeCount = await prisma.agent_threads.count({
    where: { agent_id: agentId, status: 'active' }
  })

  if (activeCount > 20) {
    const oldestThreads = await prisma.agent_threads.findMany({
      where: { agent_id: agentId, status: 'active' },
      orderBy: { last_interaction: 'asc' },
      take: activeCount - 20
    })

    await prisma.agent_threads.updateMany({
      where: { id: { in: oldestThreads.map(t => t.id) } },
      data: { status: 'resolved' }
    })
  }

  return NextResponse.json({ success: true, threadId: thread.id })
}
