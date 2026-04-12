import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  });
  const orgId = profile?.current_org_id;
  if (!orgId) return NextResponse.json({ error: 'Nenhuma organização selecionada' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId');

  const tasks = await prisma.agent_status.findMany({
    where: { 
      agent: { organization_id: orgId }, 
      ...(agentId && { openclaw_id: agentId }) 
    },
    include: { agent: true }
  });

  return NextResponse.json(tasks);
}
