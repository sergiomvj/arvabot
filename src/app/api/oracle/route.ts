import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

async function getOrgContext(req: NextRequest) {
  // 1. Tentar autenticação via Bearer Token (Service Role)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Se for Service Role, permitimos acesso global ou por orgId via query param
      const { searchParams } = new URL(req.url);
      const targetOrgId = searchParams.get('orgId');
      return targetOrgId || 'SERVICE_ROLE_ADMIN';
    }
  }

  // 2. Fallback para autenticação via Cookie (Sessão de Usuário)
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  });
  return profile?.current_org_id || null;
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgContext(req);
  if (!orgId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { agentId, message } = await req.json();

  // Se for Service Role Admin e não informou orgId, usamos a primeira encontrada ou bloqueamos
  let finalOrgId = orgId;
  if (orgId === 'SERVICE_ROLE_ADMIN') {
    return NextResponse.json({ error: 'orgId obrigatório para POST via Service Role' }, { status: 400 });
  }

  // ORACLE OpenClaw endpoint
  const oracleRes = await fetch('https://dashboard.fbrapps.com/api/oracle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message })
  });
  const oracleData = await oracleRes.json();

  // Ranking from Prisma - filtrado por org
  const ranking = await prisma.agents_cache.findMany({
    where: { organization_id: finalOrgId },
    include: { status: true },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ oracle: oracleData, ranking });
}

export async function GET(req: NextRequest) {
  const context = await getOrgContext(req);
  if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Se for Service Role mas não tiver Org específica, retornamos o ranking de TODAS (Bulk Sync)
  const where = context === 'SERVICE_ROLE_ADMIN' ? {} : { organization_id: context };

  const ranking = await prisma.agents_cache.findMany({
    where,
    include: { status: true },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json({ ranking });
}
