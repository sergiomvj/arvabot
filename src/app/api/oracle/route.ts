import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { agentId, message } = await req.json();

  // ORACLE OpenClaw endpoint
  const oracleRes = await fetch('https://dashboard.fbrapps.com/api/oracle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message })
  });
  const oracleData = await oracleRes.json();

  // Ranking from Prisma
  const ranking = await prisma.agents_cache.findMany({
    include: { status: true },
    orderBy: { status: { tasks_done: 'desc' } }
  });

  return NextResponse.json({ oracle: oracleData, ranking });
}

export async function GET(req: NextRequest) {
  const ranking = await prisma.agents_cache.findMany({
    include: { status: true },
    orderBy: { status: { tasks_done: 'desc' } }
  });
  return NextResponse.json({ ranking });
}
