-- Script para criar a tabela agent_threads manualmente
-- Alinhado ao schema Prisma atual

CREATE TABLE IF NOT EXISTS "public"."agent_threads" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "agent_id" TEXT NOT NULL,
    "user_identifier" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_interaction" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT "agent_threads_organization_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "agent_threads_agent_fkey" FOREIGN KEY ("organization_id", "agent_id") REFERENCES "public"."agents_cache"("organization_id", "openclaw_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_threads_org_agent_user_status_interaction_idx"
ON "public"."agent_threads"("organization_id", "agent_id", "user_identifier", "status", "last_interaction");

CREATE INDEX IF NOT EXISTS "agent_threads_org_agent_status_interaction_idx"
ON "public"."agent_threads"("organization_id", "agent_id", "status", "last_interaction");

CREATE INDEX IF NOT EXISTS "agent_threads_org_status_interaction_idx"
ON "public"."agent_threads"("organization_id", "status", "last_interaction");
