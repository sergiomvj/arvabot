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
    const response = await fetch(`${apiUrl}/api/oracle`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.warn(`Erro ao buscar dados do OpenClaw: ${response.statusText}`)
      // Se a API master no suportar esse GET, voltamos dados de exemplo 
      // mas marcados como "Synced"
      return { success: false, error: 'API Master indisponível' }
    }

    const data = await response.json()
    const agentsFromMaster = data.ranking || [] // Estrutura baseada no que vimos no api/oracle/route.ts

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
