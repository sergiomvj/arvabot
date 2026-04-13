import { prisma } from '@/lib/prisma'

export async function syncAgentsData(organizationId: string) {
  // 1. Buscar configs da organizao
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId }
  })

  if (!org) throw new Error('Organização não encontrada')
  if (!org.openclaw_url) throw new Error('URL do OpenClaw não configurada')
  if (!org.openclaw_api_key) {
    return { 
      success: false, 
      error: 'API Key não configurada. Vá em "Configurações" e insira sua Service Role Key do OpenClaw.' 
    }
  }

  try {
    // 2. Buscar agentes reais da API Master
    // Nota: Usando /api/oracle como fallback se /api/agents no existir,
    // mas o ideal  o endpoint de lista de agentes.
    const response = await fetch(`${org.openclaw_url}/api/oracle`, {
      method: 'GET', // Assumindo que o dashboard master exibe o ranking via GET
      headers: {
        'Authorization': `Bearer ${org.openclaw_api_key}`,
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
