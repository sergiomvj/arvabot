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

  const skills = [
    {
      code: 'oracle-analysis',
      name: 'Oracle Analysis',
      description: 'Usa o ORACLE do OpenClaw para analise estrategica e ranking.',
      type: 'internal-api',
      provider: 'openclaw',
      plan_gate: 'starter',
      config_schema: { type: 'object', properties: { mode: { type: 'string' } } },
    },
    {
      code: 'canva-generate',
      name: 'Canva Generate',
      description: 'Gera materiais visuais com integracao Canva.',
      type: 'mcp',
      provider: 'canva',
      plan_gate: 'professional',
      config_schema: { type: 'object', properties: { designType: { type: 'string' } } },
    },
    {
      code: 'browser-investigation',
      name: 'Browser Investigation',
      description: 'Investiga URLs com navegador headless e extrai padroes.',
      type: 'script',
      provider: 'playwright',
      plan_gate: 'professional',
      config_schema: { type: 'object', properties: { targetUrl: { type: 'string' } } },
    },
  ]

  for (const skill of skills) {
    await prisma.skill_definitions.upsert({
      where: { code: skill.code },
      update: skill,
      create: skill,
    })
  }

  const templates = [
    {
      key: 'youtube-to-linkedin',
      name: 'YouTube para LinkedIn',
      description: 'Transforma um video longo em sequencia de conteudo para LinkedIn.',
      category: 'content-refactor',
      steps: [
        { order: 1, agent_id: 'david', title: 'Diagnostico', instructions: 'Analise o material original e levante os melhores ganchos.', checkpoint_required: true },
        { order: 2, agent_id: 'chiara', title: 'Adaptacao', instructions: 'Reescreva o conteudo no formato ideal para LinkedIn.', skill_code: 'oracle-analysis' },
        { order: 3, agent_id: 'leon', title: 'Revisao', instructions: 'Revise fluidez, clareza e CTA.', checkpoint_required: true },
      ],
    },
    {
      key: 'site-style-investigation',
      name: 'Investigacao de Estilo de Site',
      description: 'Analisa referencias publicas do cliente e gera briefing interno.',
      category: 'investigation',
      steps: [
        { order: 1, agent_id: 'david', title: 'Investigacao', instructions: 'Use browser headless para investigar o site ou perfil indicado.', checkpoint_required: true, skill_code: 'browser-investigation' },
        { order: 2, agent_id: 'chiara', title: 'Sintese', instructions: 'Transforme a investigacao em briefing claro com padroes e recomendacoes.', skill_code: 'oracle-analysis' },
      ],
    },
    {
      key: 'video-to-carousel',
      name: 'Video para Carrossel',
      description: 'Transforma um video base em carrossel com checkpoints nas etapas-chave.',
      category: 'content-refactor',
      steps: [
        { order: 1, agent_id: 'david', title: 'Extracao de estrutura', instructions: 'Extraia a estrutura principal, ganchos, promessas e CTA do video base.', checkpoint_required: true },
        { order: 2, agent_id: 'chiara', title: 'Roteiro em slides', instructions: 'Transforme a estrutura em roteiro de carrossel com abertura, desenvolvimento e fechamento.' },
        { order: 3, agent_id: 'lia', title: 'Briefing visual', instructions: 'Converta o roteiro em instrucoes visuais para design e consistencia de identidade.', checkpoint_required: true, skill_code: 'canva-generate' },
      ],
    },
  ]

  for (const template of templates) {
    const createdTemplate = await prisma.squad_templates.upsert({
      where: { key: template.key },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        active: true,
      },
      create: {
        key: template.key,
        name: template.name,
        description: template.description,
        category: template.category,
        active: true,
      },
    })

    for (const step of template.steps) {
      await prisma.squad_template_steps.upsert({
        where: {
          template_id_order: {
            template_id: createdTemplate.id,
            order: step.order,
          },
        },
        update: step,
        create: {
          template_id: createdTemplate.id,
          organization_id: facebrasil.id,
          ...step,
        },
      })
    }
  }

  console.log(`Seeded: Org Facebrasil + Sergio + ${agents.length} agents + ${skills.length} skills + ${templates.length} templates`)
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
