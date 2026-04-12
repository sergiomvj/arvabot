import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

async function getOrgContext() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  });
  return profile?.current_org_id || null;
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { agentId, message } = await req.json();

  // ORACLE OpenClaw endpoint
  const oracleRes = await fetch('https://dashboard.fbrapps.com/api/oracle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message })
  });
  const oracleData = await oracleRes.json();

  // Ranking from Prisma - filtrado por org
  const ranking = await prisma.agents_cache.findMany({
    where: { organization_id: orgId },
    include: { status: true },
    orderBy: { status: { tasks_done: 'desc' } }
  });

  return NextResponse.json({ oracle: oracleData, ranking });
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const ranking = await prisma.agents_cache.findMany({
    where: { organization_id: orgId },
    include: { status: true },
    orderBy: { status: { tasks_done: 'desc' } }
  });
  return NextResponse.json({ ranking });
}
