import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { agentId, message } = await req.json();

  // OpenClaw ORACLE endpoint mock → real arva-oracle.mjs
  const oracleRes = await fetch('https://dashboard.fbrapps.com/api/oracle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message })
  });
  const oracleData = await oracleRes.json();

  // Ranking
  const rankingRes = await fetch('https://ranking.fbrapps.com/api/oracle/ranking');
  const ranking = await rankingRes.json();

  return NextResponse.json({ oracle: oracleData, ranking });
}
