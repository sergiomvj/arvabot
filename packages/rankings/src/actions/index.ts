"use server";

import { revalidatePath } from "next/cache";
import { serializePrisma } from "../utils/serialization";
import type { RankingsResponse, AgentProfile } from "../types";

let prismaInstance: any = null;

function getPrisma() {
  if (!prismaInstance) {
    throw new Error("Prisma client not initialized. Call setPrismaClient() first.");
  }
  return prismaInstance;
}

export async function setPrismaClient(client: any) {
  prismaInstance = client;
}

export async function getPeriodRankings(periodCode: string): Promise<RankingsResponse> {
  try {
    const prisma = getPrisma();
    const period = await prisma.evaluationPeriod.findUnique({ where: { code: periodCode } });
    if (!period) return { period: null, rankings: [] };

    const scorecardsRaw = await prisma.periodScorecard.findMany({
      where: { periodId: period.id },
      orderBy: { rankPosition: "asc" },
      include: { agent: true }
    });

    const rankings = scorecardsRaw.map((sc: any) => ({
      ...sc,
      scoreValue: sc.scoreValue.toNumber(),
      confidenceIndex: sc.confidenceIndex.toNumber(),
      trendDelta: sc.trendDelta?.toNumber() || null
    }));

    return serializePrisma({ period, rankings });
  } catch (error) {
    console.error("Database connection failed in rankings:", error);
    return { period: null, rankings: [] };
  }
}

export async function getAgentProfile(agentCode: string, periodCode?: string): Promise<AgentProfile | null> {
  try {
    const prisma = getPrisma();
    const agent = await prisma.agent.findUnique({
      where: { code: agentCode }
    });

    if (!agent) return null;

    let teamDesc = "Sem Squad";
    if (agent.owningTeamId) {
       const t = await prisma.team.findUnique({ where: { id: agent.owningTeamId } });
       if (t) teamDesc = t.name;
    }
    let funcDesc = "Generic";
    if (agent.primaryFunctionId) {
       const f = await prisma.functionCatalog.findUnique({ where: { id: agent.primaryFunctionId } });
       if (f) funcDesc = f.name;
    }

    const badgesAwarded = await prisma.badgeAward.findMany({
        where: { agentId: agent.id },
        include: { badge: true }
    });
    
    const consequenceEvents = await prisma.consequenceEvent.findMany({
        where: { agentId: agent.id },
        include: { rule: true },
        orderBy: { triggeredAt: "desc" },
        take: 5
    });

    let scorecardRaw = null;
    if (periodCode) {
      const p = await prisma.evaluationPeriod.findUnique({ where: { code: periodCode } });
      if (p) {
        scorecardRaw = await prisma.periodScorecard.findFirst({
          where: { agentId: agent.id, periodId: p.id }
        });
      }
    } else {
      scorecardRaw = await prisma.periodScorecard.findFirst({
        where: { agentId: agent.id }
      });
    }

    const scorecard = scorecardRaw ? {
      ...scorecardRaw,
      scoreValue: scorecardRaw.scoreValue.toNumber(),
      confidenceIndex: scorecardRaw.confidenceIndex.toNumber(),
      trendDelta: scorecardRaw.trendDelta?.toNumber() || null
    } : null;

    const recentExecutions = await prisma.taskExecution.findMany({
      where: { agentId: agent.id },
      orderBy: { startedAt: "desc" },
      take: 15
    });

    return serializePrisma({ agent, teamDesc, funcDesc, badgesAwarded, consequenceEvents, scorecard, recentExecutions });
  } catch (error) {
    console.error("Database connection failed in getAgentProfile:", error);
    return null;
  }
}
