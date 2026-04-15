"use client";

import React from "react";

export function AgentHubProvider({ children }: { children: React.ReactNode }) {
  // O Prisma deve ser inicializado apenas no servidor (Server Components)
  // para evitar vazamento de binários para o cliente e erros de serialização.
  return <>{children}</>;
}
