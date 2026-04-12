const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const orgCols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'id'
  `
  console.log('--- organizations.id ---')
  console.log(orgCols)

  const agentCols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'agents_cache' AND column_name = 'organization_id'
  `
  console.log('\n--- agents_cache.organization_id ---')
  console.log(agentCols)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
