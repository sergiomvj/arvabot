"use client";

import React from "react";
import { setPrismaClient as setTaskCenterPrisma } from "@agent-hub/task-center/actions";
import { setPrismaClient as setRankingsPrisma } from "@agent-hub/rankings/actions";
import { prisma } from "@/lib/prisma";

export function AgentHubProvider({ children }: { children: React.ReactNode }) {
  // Inicializa o Prisma para os pacotes operacionais
  setTaskCenterPrisma(prisma);
  setRankingsPrisma(prisma);
  
  return <>{children}</>;
}
