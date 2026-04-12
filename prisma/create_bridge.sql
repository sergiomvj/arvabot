-- Script para criar a tabela agent_threads manualmente (CORRIGIDO)
-- Usando UUID para compatibilidade com as tabelas existentes

CREATE TABLE IF NOT EXISTS "public"."agent_threads" (
    "id" TEXT PRIMARY KEY,
    "organization_id" UUID NOT NULL,
    "agent_id" TEXT NOT NULL,
    "user_identifier" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_interaction" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT "agent_threads_organization_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "agent_threads_agent_fkey" FOREIGN KEY ("organization_id", "agent_id") REFERENCES "public"."agents_cache"("organization_id", "openclaw_id") ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "agent_threads_agent_user_idx" ON "public"."agent_threads"("agent_id", "user_identifier");
CREATE INDEX IF NOT EXISTS "agent_threads_org_idx" ON "public"."agent_threads"("organization_id");
