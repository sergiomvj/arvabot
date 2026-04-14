import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const DEFAULT_SYNC_TIMEOUT_MS = 12000
const SYNC_WRITE_BATCH_SIZE = 20

type OracleAgentPayload = {
  id?: string
  openclaw_id?: string
  name?: string
  role?: string | null
  active?: boolean
  color?: string | null
  model?: string | null
  career?: string | null
  skills?: string[] | null
  metadata?: unknown
  tasks_pending?: number | null
  tasks_done?: number | null
  status?: {
    status?: string | null
    tasks_done?: number | null
    tasks_pending?: number | null
    last_seen?: string | Date | null
  } | null
}

type NormalizedAgent = {
  openclawId: string
  name: string
  role: string
  active: boolean
  color: string
  model: string | null
  career: string | null
  skills: string[]
  metadata: Prisma.InputJsonValue
  status: {
    status: string
    tasksDone: number
    tasksPending: number
    lastSeen: Date | null
  }
}

type UpstreamAgentsPayload = {
  agents?: OracleAgentPayload[]
  ranking?: OracleAgentPayload[]
}

type RequestCandidate = {
  url: URL
  headers: Record<string, string>
  label: string
}

export type SyncAgentsResult =
  | {
      success: true
      count: number
      disabledCount: number
      message: string
    }
  | {
      success: false
      error: string
      details?: string
    }

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function buildRequestCandidates(baseUrl: string, apiKey: string, organizationId: string): RequestCandidate[] {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const rawUrl = new URL(normalizedBaseUrl)
  const looksLikeEndpoint = /\/api\//.test(rawUrl.pathname)

  const makeUrl = (pathname: string) => {
    const url = new URL(looksLikeEndpoint ? normalizedBaseUrl : `${normalizedBaseUrl}${pathname}`)
    url.searchParams.set('orgId', organizationId)
    return url
  }

  return [
    {
      url: makeUrl('/api/agents'),
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      label: 'GET /api/agents com ApiKey',
    },
  ]
}

function normalizeAgent(agent: OracleAgentPayload): NormalizedAgent | null {
  const openclawId = (agent.openclaw_id || agent.id || '').trim()
  const name = (agent.name || '').trim()

  if (!openclawId || !name) return null

  const tasksDone = agent.status?.tasks_done ?? agent.tasks_done ?? 0
  const tasksPending = agent.status?.tasks_pending ?? agent.tasks_pending ?? 0
  const isActive = agent.active ?? (agent.status?.status ? agent.status.status === 'online' : true)

  return {
    openclawId,
    name,
    role: agent.role?.trim() || 'Agente',
    active: isActive,
    color: agent.color?.trim() || '#10B981',
    model: agent.model?.trim() || null,
    career: agent.career?.trim() || null,
    skills: Array.isArray(agent.skills) ? agent.skills.filter(Boolean) : [],
    metadata: (agent.metadata ?? {}) as Prisma.InputJsonValue,
    status: {
      status: agent.status?.status?.trim() || (isActive ? 'online' : 'offline'),
      tasksDone,
      tasksPending,
      lastSeen: agent.status?.last_seen ? new Date(agent.status.last_seen) : null,
    },
  }
}

async function fetchAgentsFromUpstream(baseUrl: string, apiKey: string, organizationId: string, signal: AbortSignal) {
  const candidates = buildRequestCandidates(baseUrl, apiKey, organizationId)
  const failures: string[] = []

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url, {
        method: 'GET',
        headers: candidate.headers,
        cache: 'no-store',
        signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        failures.push(`${candidate.label}: HTTP ${response.status}${errorText ? ` - ${errorText}` : ''}`)
        continue
      }

      const payload = (await response.json().catch(() => null)) as UpstreamAgentsPayload | null
      const records = Array.isArray(payload?.agents) ? payload.agents : Array.isArray(payload?.ranking) ? payload.ranking : []

      return {
        records,
        source: candidate.label,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      failures.push(`${candidate.label}: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
    }
  }

  return {
    records: null,
    source: failures.join(' | '),
  }
}

export async function syncAgentsData(organizationId: string): Promise<SyncAgentsResult> {
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      openclaw_url: true,
      openclaw_api_key: true,
    },
  })

  if (!org) {
    return { success: false, error: 'Organização não encontrada.' }
  }

  const apiUrl = org.openclaw_url || process.env.OPENCLAW_API_URL
  const apiKey = org.openclaw_api_key || process.env.OPENCLAW_API_KEY

  if (!apiUrl) {
    return { success: false, error: 'URL do OpenClaw não configurada.' }
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'API key do OpenClaw não configurada.',
      details: 'Configure a chave do OpenClaw na organização ou no ambiente do servidor.',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_SYNC_TIMEOUT_MS)

  try {
    const upstream = await fetchAgentsFromUpstream(apiUrl, apiKey, organizationId, controller.signal)

    if (!upstream.records) {
      return {
        success: false,
        error: 'Não foi possível buscar os agentes na API Master.',
        details: upstream.source || 'Verifique a URL e a API key configuradas.',
      }
    }

    const normalizedAgents: NormalizedAgent[] = upstream.records
      .map(normalizeAgent)
      .filter((agent): agent is NormalizedAgent => Boolean(agent))

    const uniqueAgents = new Map(normalizedAgents.map((agent) => [agent.openclawId, agent]))
    const syncedAgents = Array.from(uniqueAgents.values())
    const syncedIds = syncedAgents.map((agent) => agent.openclawId)
    const now = new Date()

    const writeBatches = chunkArray(syncedAgents, SYNC_WRITE_BATCH_SIZE)

    for (const batch of writeBatches) {
      await prisma.$transaction(
        async (tx) => {
          for (const agent of batch) {
            await tx.agents_cache.upsert({
              where: {
                organization_id_openclaw_id: {
                  organization_id: organizationId,
                  openclaw_id: agent.openclawId,
                },
              },
              update: {
                name: agent.name,
                role: agent.role,
                active: agent.active,
                color: agent.color,
                model: agent.model,
                career: agent.career,
                skills: agent.skills,
                metadata: agent.metadata,
                last_synced_at: now,
              },
              create: {
                organization_id: organizationId,
                openclaw_id: agent.openclawId,
                name: agent.name,
                role: agent.role,
                active: agent.active,
                color: agent.color,
                model: agent.model,
                career: agent.career,
                skills: agent.skills,
                metadata: agent.metadata,
                last_synced_at: now,
              },
            })

            await tx.agent_status.upsert({
              where: {
                organization_id_openclaw_id: {
                  organization_id: organizationId,
                  openclaw_id: agent.openclawId,
                },
              },
              update: {
                status: agent.status.status,
                tasks_done: agent.status.tasksDone,
                tasks_pending: agent.status.tasksPending,
                last_seen: agent.status.lastSeen,
                updated_at: now,
              },
              create: {
                organization_id: organizationId,
                openclaw_id: agent.openclawId,
                status: agent.status.status,
                tasks_done: agent.status.tasksDone,
                tasks_pending: agent.status.tasksPending,
                last_seen: agent.status.lastSeen,
                updated_at: now,
              },
            })
          }
        },
        {
          timeout: 20000,
        }
      )
    }

    const staleAgentsWhere =
      syncedIds.length > 0
        ? {
            organization_id: organizationId,
            openclaw_id: { notIn: syncedIds },
          }
        : {
            organization_id: organizationId,
          }

    const staleAgentsResult = await prisma.$transaction(
      async (tx) => {
        const agentsResult = await tx.agents_cache.updateMany({
          where: staleAgentsWhere,
          data: {
            active: false,
            last_synced_at: now,
          },
        })

        await tx.agent_status.updateMany({
          where: staleAgentsWhere,
          data: {
            status: 'offline',
            updated_at: now,
          },
        })

        return agentsResult
      },
      {
        timeout: 20000,
      }
    )

    const disabledCount = staleAgentsResult.count

    return {
      success: true,
      count: syncedAgents.length,
      disabledCount,
      message:
        syncedAgents.length > 0
          ? `${syncedAgents.length} agente(s) sincronizado(s) a partir de ${upstream.source}.`
          : 'A sincronização foi concluída, mas a origem não retornou agentes.',
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Timeout ao sincronizar com a API Master.',
        details: 'A origem demorou mais do que o limite configurado para responder.',
      }
    }

    return {
      success: false,
      error: 'Falha na conexão com a API Master.',
      details: error instanceof Error ? error.message : 'Erro desconhecido.',
    }
  } finally {
    clearTimeout(timeout)
  }
}
