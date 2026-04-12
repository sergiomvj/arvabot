const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Perfis ---')
  const profiles = await prisma.profiles.findMany()
  console.log(JSON.stringify(profiles, null, 2))

  console.log('\n--- Organizações ---')
  const orgs = await prisma.organizations.findMany()
  console.log(JSON.stringify(orgs, null, 2))

  console.log('\n--- Agentes ---')
  const agents = await prisma.agents_cache.findMany({
    include: { status: true }
  })
  console.log(JSON.stringify(agents, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
