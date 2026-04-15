"use server";

import { serializePrisma } from "../utils/serialization";
import type { AgentProfile, RankingsResponse } from "../types";

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

function normalizeAgent(agent: any) {
  if (!agent) return null;
  return {
    id: agent.id,
    code: agent.openclaw_id,
    displayName: agent.name,
    description: agent.role ?? null,
    owningTeamId: agent.owningTeamId ?? null,
    primaryFunctionId: agent.primaryFunctionId ?? null,
  };
}

function normalizeRequiredAgent(agent: any) {
  return {
    id: agent.id,
    code: agent.openclaw_id,
    displayName: agent.name,
    description: agent.role ?? null,
    owningTeamId: agent.owningTeamId ?? null,
    primaryFunctionId: agent.primaryFunctionId ?? null,
  };
}

export async function getPeriodRankings(periodCode: string): Promise<RankingsResponse> {
  try {
    const prisma = getPrisma();
    const period = await prisma.evaluation_period.findUnique({ where: { code: periodCode } });
    if (!period) return { period: null, rankings: [] };

    const scorecardsRaw = await prisma.period_scorecard.findMany({
      where: { periodId: period.id },
      orderBy: { rankPosition: "asc" },
      include: { agent: true },
    });

    const rankings = scorecardsRaw.map((scorecard: any) => ({
      ...scorecard,
      scoreValue: scorecard.scoreValue.toNumber(),
      confidenceIndex: scorecard.confidenceIndex.toNumber(),
      trendDelta: scorecard.trendDelta?.toNumber() || null,
      agent: normalizeAgent(scorecard.agent),
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
    const agent = await prisma.agents_cache.findFirst({
      where: { openclaw_id: agentCode },
    });

    if (!agent) return null;

    let funcDesc = "Generic";
    if (agent.primaryFunctionId) {
      const func = await prisma.function_catalog.findUnique({ where: { id: agent.primaryFunctionId } });
      if (func) funcDesc = func.name;
    }

    const badgesAwarded = await prisma.badge_award.findMany({
      where: { agentId: agent.id },
      include: { badge: true },
    });

    const consequenceEvents = await prisma.consequence_event.findMany({
      where: { agentId: agent.id },
      include: { rule: true },
      orderBy: { triggeredAt: "desc" },
      take: 5,
    });

    let scorecardRaw = null;
    if (periodCode) {
      const period = await prisma.evaluation_period.findUnique({ where: { code: periodCode } });
      if (period) {
        scorecardRaw = await prisma.period_scorecard.findFirst({
          where: { agentId: agent.id, periodId: period.id },
        });
      }
    } else {
      scorecardRaw = await prisma.period_scorecard.findFirst({
        where: { agentId: agent.id },
      });
    }

    const scorecard = scorecardRaw
      ? {
          ...scorecardRaw,
          scoreValue: scorecardRaw.scoreValue.toNumber(),
          confidenceIndex: scorecardRaw.confidenceIndex.toNumber(),
          trendDelta: scorecardRaw.trendDelta?.toNumber() || null,
        }
      : null;

    const recentExecutions = await prisma.task_execution.findMany({
      where: { agentId: agent.id },
      orderBy: { startedAt: "desc" },
      take: 15,
      include: { task_type: true },
    });

    return serializePrisma({
      agent: normalizeRequiredAgent(agent),
      teamDesc: "Sem Squad",
      funcDesc,
      badgesAwarded,
      consequenceEvents,
      scorecard,
      recentExecutions: recentExecutions.map((execution: any) => ({
        ...execution,
        taskType: execution.task_type,
      })),
    });
  } catch (error) {
    console.error("Database connection failed in getAgentProfile:", error);
    return null;
  }
}
