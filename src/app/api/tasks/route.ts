import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId') || 'cbe3cee1-1340-4b02-bebd-41e1c2dd7913';
  const agentId = searchParams.get('agentId');

  const tasks = await prisma.agentStatus.findMany({
    where: { organization_id: orgId, ...(agentId && { openclaw_id: agentId }) },
    include: { agent: true }
  });

  return NextResponse.json(tasks);
}
