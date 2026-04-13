import { prisma } from '@/lib/prisma'

export async function syncAgentsData(organizationId: string) {
  // 1. Buscar configs da organizao
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId }
  })

  if (!org) throw new Error('Organização não encontrada')
  
  const apiUrl = org.openclaw_url || process.env.OPENCLAW_API_URL
  const apiKey = org.openclaw_api_key || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiUrl) throw new Error('URL do OpenClaw não configurada')
  if (!apiKey) {
    return { 
      success: false, 
      error: 'API Key não configurada no banco nem no Servidor (.env).' 
    }
  }

  try {
    // 2. Buscar agentes reais da API Master
    console.log(`[Sync] Tentando sincronizar com: ${apiUrl}/api/oracle`)
    const response = await fetch(`${apiUrl}/api/oracle`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido')
      console.error(`[Sync] Erro na API Master (${response.status}):`, errorText)
      // FALLBACK: Se a API falhar, tentamos "resgatar" agentes que já existem no banco de dados local
      // mas pertencem a outras organizações (ou são órfãos)
      const orphanAgents = await prisma.agents_cache.findMany({
        where: { organization_id: { not: organizationId } },
        include: { status: true },
        take: 20
      })

      if (orphanAgents.length > 0) {
        console.log(`[Sync] API Falhou, mas encontramos ${orphanAgents.length} agentes no banco. Resgatando...`)
        for (const agent of orphanAgents) {
          await prisma.agents_cache.upsert({
            where: { 
              organization_id_openclaw_id: { 
                organization_id: organizationId, 
                openclaw_id: agent.openclaw_id 
              } 
            },
            update: { name: agent.name, role: agent.role, last_synced_at: new Date() },
            create: { 
              organization_id: organizationId, 
              openclaw_id: agent.openclaw_id, 
              name: agent.name, 
              role: agent.role || 'Agente',
              last_synced_at: new Date()
            }
          })
        }
        return { success: true, count: orphanAgents.length, warning: 'Sincronizado via Local Resgate (API indisponível)' }
      }

      return { success: false, error: `API Master retornou erro ${response.status}. Verifique as chaves ou o endpoint.` }
    }

    const data = await response.json()
    console.log(`[Sync] Dados recebidos com sucesso. Agentes encontrados:`, data.ranking?.length || 0)
    const agentsFromMaster = data.ranking || [] 

    // 3. Upsert no banco local
    for (const masterAgent of agentsFromMaster) {
      const openclawId = masterAgent.openclaw_id || masterAgent.id
      
      await prisma.agents_cache.upsert({
        where: { 
          organization_id_openclaw_id: { 
            organization_id: organizationId, 
            openclaw_id: openclawId 
          } 
        },
        update: {
          name: masterAgent.name,
          role: masterAgent.role,
          active: true,
          last_synced_at: new Date(),
        },
        create: {
          organization_id: organizationId,
          openclaw_id: openclawId,
          name: masterAgent.name,
          role: masterAgent.role || 'Agente',
          active: true,
          last_synced_at: new Date(),
        }
      })

      // Atualizar status tbm
      await prisma.agent_status.upsert({
        where: { 
          organization_id_openclaw_id: { 
            organization_id: organizationId, 
            openclaw_id: openclawId 
          } 
        },
        update: {
          status: masterAgent.status?.status || 'online',
          tasks_done: masterAgent.status?.tasks_done || 0,
          tasks_pending: masterAgent.status?.tasks_pending || 0,
          updated_at: new Date(),
        },
        create: {
          organization_id: organizationId,
          openclaw_id: openclawId,
          status: masterAgent.status?.status || 'online',
          tasks_done: masterAgent.status?.tasks_done || 0,
          tasks_pending: masterAgent.status?.tasks_pending || 0,
        }
      })
    }

    return { success: true, count: agentsFromMaster.length }
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return { success: false, error: 'Falha na conexão com a API' }
  }
}
