import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ORACLE_TIMEOUT_MS = 90000

type OrgContext =
  | {
      orgId: string
      reviewedBy: string
    }
  | {
      orgId: 'SERVICE_ROLE_ADMIN'
      reviewedBy: 'service-role'
    }

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')

  if (!trimmed) return trimmed

  try {
    const url = new URL(trimmed)
    if (url.pathname.startsWith('/api/')) {
      return url.origin
    }

    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return trimmed
  }
}

async function getOrgContext(req: NextRequest): Promise<OrgContext | null> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length)

    if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const targetOrgId = req.nextUrl.searchParams.get('orgId')
      if (!targetOrgId) {
        return {
          orgId: 'SERVICE_ROLE_ADMIN',
          reviewedBy: 'service-role',
        }
      }

      return {
        orgId: targetOrgId,
        reviewedBy: 'service-role',
      }
    }
  }

  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: { current_org_id: true },
  })

  if (!profile?.current_org_id) return null

  return {
    orgId: profile.current_org_id,
    reviewedBy: session.user.email || session.user.id,
  }
}

async function getOrganizationConfig(orgId: string) {
  const organization = await prisma.organizations.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      openclaw_url: true,
      openclaw_api_key: true,
    },
  })

  if (!organization) {
    return { error: 'Organizacao nao encontrada.' } as const
  }

  const apiUrl = organization.openclaw_url || process.env.OPENCLAW_API_URL
  const apiKey = organization.openclaw_api_key || process.env.OPENCLAW_API_KEY

  if (!apiUrl) {
    return { error: 'URL do OpenClaw nao configurada.' } as const
  }

  if (!apiKey) {
    return { error: 'API key do OpenClaw nao configurada.' } as const
  }

  return {
    apiUrl: normalizeBaseUrl(apiUrl),
    apiKey,
  } as const
}

async function callOpenClaw(
  baseUrl: string,
  apiKey: string,
  pathname: string,
  init?: RequestInit
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ORACLE_TIMEOUT_MS)

  try {
    const url = new URL(pathname, `${baseUrl}/`)
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
        ...(init?.headers || {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    })

    const text = await response.text()
    let payload: unknown = null

    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { raw: text }
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        payload: {
          error: `Tempo limite excedido ao aguardar resposta do OpenClaw em ${pathname}.`,
        },
      }
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function buildOracleError(status: number, payload: unknown, fallbackMessage: string) {
  const payloadMessage =
    typeof payload === 'object' && payload && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : typeof payload === 'object' && payload && 'raw' in payload && typeof payload.raw === 'string'
        ? payload.raw
        : fallbackMessage

  return NextResponse.json(
    {
      error: fallbackMessage,
      details: payloadMessage,
    },
    { status }
  )
}

export async function GET(req: NextRequest) {
  const context = await getOrgContext(req)
  if (!context) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  if (context.orgId === 'SERVICE_ROLE_ADMIN') {
    return NextResponse.json({ error: 'orgId obrigatorio para GET via Service Role' }, { status: 400 })
  }

  const config = await getOrganizationConfig(context.orgId)
  if ('error' in config) {
    return NextResponse.json({ error: config.error }, { status: 400 })
  }

  const recommendationStatus = req.nextUrl.searchParams.get('status') || 'pending'
  const [ranking, recommendations, history] = await Promise.allSettled([
    prisma.agents_cache.findMany({
      where: { organization_id: context.orgId },
      select: {
        openclaw_id: true,
        name: true,
        role: true,
        color: true,
        status: {
          select: {
            status: true,
            tasks_done: true,
            tasks_pending: true,
            updated_at: true,
          },
        },
      },
      orderBy: [{ status: { tasks_done: 'desc' } }, { name: 'asc' }],
    }),
    callOpenClaw(
      config.apiUrl,
      config.apiKey,
      `/api/oracle/recommendations?status=${encodeURIComponent(recommendationStatus)}`
    ),
    callOpenClaw(config.apiUrl, config.apiKey, '/api/oracle/history?limit=10'),
  ])

  const recommendationPayload =
    recommendations.status === 'fulfilled' && recommendations.value.ok
      ? recommendations.value.payload
      : null

  const historyPayload = history.status === 'fulfilled' && history.value.ok ? history.value.payload : null

  return NextResponse.json({
    ranking: ranking.status === 'fulfilled' ? ranking.value : [],
    recommendations:
      recommendationPayload && typeof recommendationPayload === 'object' && 'recommendations' in recommendationPayload
        ? recommendationPayload.recommendations
        : [],
    history:
      historyPayload && typeof historyPayload === 'object' && 'history' in historyPayload ? historyPayload.history : [],
  })
}

export async function POST(req: NextRequest) {
  const context = await getOrgContext(req)
  if (!context) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  if (context.orgId === 'SERVICE_ROLE_ADMIN') {
    return NextResponse.json({ error: 'orgId obrigatorio para POST via Service Role' }, { status: 400 })
  }

  const config = await getOrganizationConfig(context.orgId)
  if ('error' in config) {
    return NextResponse.json({ error: config.error }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const mode = body?.mode === 'ranking' ? 'ranking' : 'custom'

  if (mode === 'custom') {
    const question = typeof body?.question === 'string' ? body.question.trim() : ''
    const freeContext = typeof body?.context === 'string' ? body.context.trim() : ''
    const agentId = typeof body?.agentId === 'string' ? body.agentId.trim() : ''

    if (!question) {
      return NextResponse.json({ error: 'Pergunta obrigatoria.' }, { status: 400 })
    }

    const upstream = await callOpenClaw(config.apiUrl, config.apiKey, '/api/oracle/custom', {
      method: 'POST',
      body: JSON.stringify({
        question,
        context: freeContext,
        agent_id: agentId || undefined,
      }),
    })

    if (!upstream.ok) {
      return buildOracleError(upstream.status, upstream.payload, 'Falha ao consultar o ORACLE.')
    }

    return NextResponse.json(upstream.payload)
  }

  const periodDays =
    typeof body?.periodDays === 'number'
      ? body.periodDays
      : Number.parseInt(typeof body?.periodDays === 'string' ? body.periodDays : '7', 10)

  const freeContext = typeof body?.context === 'string' ? body.context.trim() : ''

  const upstream = await callOpenClaw(config.apiUrl, config.apiKey, '/api/oracle/ranking', {
    method: 'POST',
    body: JSON.stringify({
      period_days: Number.isFinite(periodDays) ? periodDays : 7,
      context: freeContext || undefined,
      triggered_by: context.reviewedBy,
    }),
  })

  if (!upstream.ok) {
    return buildOracleError(upstream.status, upstream.payload, 'Falha ao gerar ranking no ORACLE.')
  }

  return NextResponse.json(upstream.payload)
}

export async function PUT(req: NextRequest) {
  const context = await getOrgContext(req)
  if (!context) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  if (context.orgId === 'SERVICE_ROLE_ADMIN') {
    return NextResponse.json({ error: 'orgId obrigatorio para PUT via Service Role' }, { status: 400 })
  }

  const config = await getOrganizationConfig(context.orgId)
  if ('error' in config) {
    return NextResponse.json({ error: config.error }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const recommendationId = typeof body?.recommendationId === 'number' ? body.recommendationId : Number(body?.recommendationId)
  const status = body?.status === 'rejected' ? 'rejected' : body?.status === 'approved' ? 'approved' : null

  if (!recommendationId || !status) {
    return NextResponse.json({ error: 'recommendationId e status sao obrigatorios.' }, { status: 400 })
  }

  const upstream = await callOpenClaw(
    config.apiUrl,
    config.apiKey,
    `/api/oracle/recommendations/${recommendationId}/review`,
    {
      method: 'PUT',
      body: JSON.stringify({
        status,
        reviewed_by: context.reviewedBy,
      }),
    }
  )

  if (!upstream.ok) {
    return buildOracleError(upstream.status, upstream.payload, 'Falha ao revisar recomendacao.')
  }

  return NextResponse.json(upstream.payload)
}
