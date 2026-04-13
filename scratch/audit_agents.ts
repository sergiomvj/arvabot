import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const allAgents = await prisma.agents_cache.findMany({
    include: { organization: true }
  })
  
  console.log(`Total de agentes no banco: ${allAgents.length}`)
  allAgents.forEach(a => {
    console.log(`- [${a.organization.name}] ${a.name} (OpenClaw ID: ${a.openclaw_id})`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
