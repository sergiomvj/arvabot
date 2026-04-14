import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const THREAD_LOOKBACK_HOURS = 72
const THREAD_GROUPING_HOURS = 24
const MAX_ACTIVE_THREADS_PER_AGENT = 20

type OrgContext = {
  organizationId: string
  source: 'service-role' | 'session' | 'agent-lookup'
}

function buildThresholdDate(hours: number) {
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - hours)
  return thresholdDate
}

function normalizeTheme(theme: string) {
  return theme.trim().replace(/\s+/g, ' ')
}

async function getSessionOrgId() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: { current_org_id: true },
  })

  return profile?.current_org_id ?? null
}

async function getBridgeOrgContext(req: NextRequest, agentId: string): Promise<OrgContext | null> {
  const { searchParams } = new URL(req.url)
  const authHeader = req.headers.get('authorization')
  const serviceRoleToken = process.env.SUPABASE_SERVICE_ROLE_KEY
  const orgIdFromQuery = searchParams.get('orgId')?.trim() || null

  if (authHeader?.startsWith('Bearer ') && serviceRoleToken) {
    const token = authHeader.slice('Bearer '.length)

    if (token === serviceRoleToken) {
      if (!orgIdFromQuery) return null
      return { organizationId: orgIdFromQuery, source: 'service-role' }
    }
  }

  const sessionOrgId = await getSessionOrgId()
  if (sessionOrgId) {
    return { organizationId: sessionOrgId, source: 'session' }
  }

  if (orgIdFromQuery) {
    return { organizationId: orgIdFromQuery, source: 'agent-lookup' }
  }

  const matchingAgents = await prisma.agents_cache.findMany({
    where: { openclaw_id: agentId },
    select: { organization_id: true },
    take: 2,
  })

  if (matchingAgents.length !== 1) return null

  return {
    organizationId: matchingAgents[0].organization_id,
    source: 'agent-lookup',
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')?.trim()
  const userIdentifier = searchParams.get('userId')?.trim()

  if (!agentId || !userIdentifier) {
    return NextResponse.json({ error: 'agentId e userId são obrigatórios.' }, { status: 400 })
  }

  const orgContext = await getBridgeOrgContext(req, agentId)
  if (!orgContext) {
    return NextResponse.json(
      { error: 'Não foi possível resolver a organização. Envie orgId ou autentique a requisição.' },
      { status: 401 }
    )
  }

  const thresholdDate = buildThresholdDate(THREAD_LOOKBACK_HOURS)

  const activeThread = await prisma.agent_threads.findFirst({
    where: {
      organization_id: orgContext.organizationId,
      agent_id: agentId,
      user_identifier: userIdentifier,
      status: 'active',
      last_interaction: { gte: thresholdDate },
    },
    orderBy: { last_interaction: 'desc' },
  })

  return NextResponse.json({ thread: activeThread })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const agentId = typeof body?.agentId === 'string' ? body.agentId.trim() : ''
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
  const theme = typeof body?.theme === 'string' ? normalizeTheme(body.theme) : ''
  const context = typeof body?.context === 'string' ? body.context.trim() : ''
  const channel = typeof body?.channel === 'string' ? body.channel.trim() : null
  const requestedStatus = typeof body?.status === 'string' ? body.status.trim() : 'active'

  if (!agentId || !userId || !theme || !context) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const orgContext = await getBridgeOrgContext(req, agentId)
  if (!orgContext) {
    return NextResponse.json(
      { error: 'Não foi possível resolver a organização. Envie orgId ou autentique a requisição.' },
      { status: 401 }
    )
  }

  const agent = await prisma.agents_cache.findUnique({
    where: {
      organization_id_openclaw_id: {
        organization_id: orgContext.organizationId,
        openclaw_id: agentId,
      },
    },
    select: {
      openclaw_id: true,
      organization_id: true,
    },
  })

  if (!agent) {
    return NextResponse.json({ error: 'Agente não encontrado para a organização informada.' }, { status: 404 })
  }

  const thresholdDate = buildThresholdDate(THREAD_GROUPING_HOURS)

  const existingThread = await prisma.agent_threads.findFirst({
    where: {
      organization_id: agent.organization_id,
      agent_id: agentId,
      user_identifier: userId,
      theme,
      status: 'active',
      last_interaction: { gte: thresholdDate },
    },
    orderBy: { last_interaction: 'desc' },
  })

  const thread = existingThread
    ? await prisma.agent_threads.update({
        where: { id: existingThread.id },
        data: {
          context,
          channel: channel || existingThread.channel,
          status: requestedStatus || 'active',
          last_interaction: new Date(),
        },
      })
    : await prisma.agent_threads.create({
        data: {
          organization_id: agent.organization_id,
          agent_id: agentId,
          user_identifier: userId,
          theme,
          context,
          channel,
          status: requestedStatus || 'active',
        },
      })

  const activeCount = await prisma.agent_threads.count({
    where: {
      organization_id: agent.organization_id,
      agent_id: agentId,
      status: 'active',
    },
  })

  if (activeCount > MAX_ACTIVE_THREADS_PER_AGENT) {
    const oldestThreads = await prisma.agent_threads.findMany({
      where: {
        organization_id: agent.organization_id,
        agent_id: agentId,
        status: 'active',
      },
      orderBy: { last_interaction: 'asc' },
      take: activeCount - MAX_ACTIVE_THREADS_PER_AGENT,
      select: { id: true },
    })

    if (oldestThreads.length > 0) {
      await prisma.agent_threads.updateMany({
        where: {
          organization_id: agent.organization_id,
          id: { in: oldestThreads.map((entry) => entry.id) },
        },
        data: { status: 'resolved' },
      })
    }
  }

  return NextResponse.json({ success: true, threadId: thread.id })
}
