import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Org Facebrasil
  const facebrasil = await prisma.organizations.upsert({
    where: { slug: 'facebrasil' },
    update: {},
    create: {
      slug: 'facebrasil',
      name: 'Grupo Facebrasil',
      plan: 'enterprise',
      primary_color: '#10B981',
    }
  })

  // Sergio profile/member
  await prisma.profiles.upsert({
    where: { id: 'sergio-uuid-placeholder' }, // Supabase auth.users id later
    update: { current_org_id: facebrasil.id },
    create: {
      id: 'sergio-uuid-placeholder',
      full_name: 'Sergio Castro',
      current_org_id: facebrasil.id,
    }
  })

  await prisma.organization_members.upsert({
    where: { organization_id_user_id: { organization_id: facebrasil.id, user_id: 'sergio-uuid-placeholder' } },
    update: {},
    create: {
      organization_id: facebrasil.id,
      user_id: 'sergio-uuid-placeholder',
      role: 'owner',
    }
  })

  // 13 agents (from AGENTS.md)
  const agents = [
    { openclaw_id: 'chiara', name: 'Chiara Garcia', role: 'Orquestradora', color: '#EF4444' },
    { openclaw_id: 'cinthia', name: 'Cinthia Yamamatsu', role: 'Senior Developer', color: '#0EA5E9' },
    { openclaw_id: 'david', name: 'David Novaes', role: 'Programador Sênior', color: '#3B82F6' },
    { openclaw_id: 'lia', name: 'Lia Salazar', role: 'Frontend Specialist', color: '#10B981' },
    { openclaw_id: 'mila', name: 'Mila Castro', role: 'Marketing Manager', color: '#F59E0B' },
    { openclaw_id: 'leon', name: 'Leon', role: '', color: '#8B5CF6' },
    { openclaw_id: 'maia', name: 'Maia', role: '', color: '#EC4899' },
    { openclaw_id: 'priscila', name: 'Priscila', role: 'Secretária', color: '#06B6D4' },
    { openclaw_id: 'bia', name: 'Bia Schultz', role: 'Executive Assistant', color: '#10B981' },
    // Add more if needed
  ]

  for (const agent of agents) {
    await prisma.agents_cache.upsert({
      where: { organization_id_openclaw_id: { organization_id: facebrasil.id, openclaw_id: agent.openclaw_id } },
      update: {},
      create: {
        organization_id: facebrasil.id,
        ...agent,
        skills: [],
        metadata: { model: 'openrouter/qwen/qwen3.5-plus-02-15' },
      }
    })

    await prisma.agent_status.upsert({
      where: { organization_id_openclaw_id: { organization_id: facebrasil.id, openclaw_id: agent.openclaw_id } },
      update: {},
      create: {
        organization_id: facebrasil.id,
        openclaw_id: agent.openclaw_id,
        status: 'online',
        tasks_pending: 0,
        tasks_done: 0,
      }
    })
  }

  console.log(`Seeded: Org Facebrasil + Sergio + ${agents.length} agents`)
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
