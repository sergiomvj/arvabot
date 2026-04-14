-- Batch 2: bridge multi-tenant safety + performance indexes

-- Ensure agent_threads matches Prisma expectations.
ALTER TABLE IF EXISTS "public"."agent_threads"
  ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "last_interaction" SET DEFAULT NOW(),
  ALTER COLUMN "created_at" SET DEFAULT NOW();

-- Performance indexes for the current query patterns.
CREATE INDEX IF NOT EXISTS "organization_members_user_id_idx"
ON "public"."organization_members"("user_id");

CREATE INDEX IF NOT EXISTS "profiles_current_org_id_idx"
ON "public"."profiles"("current_org_id");

CREATE INDEX IF NOT EXISTS "agents_cache_org_active_idx"
ON "public"."agents_cache"("organization_id", "active");

CREATE INDEX IF NOT EXISTS "agents_cache_org_last_synced_idx"
ON "public"."agents_cache"("organization_id", "last_synced_at");

CREATE INDEX IF NOT EXISTS "agent_status_org_status_idx"
ON "public"."agent_status"("organization_id", "status");

CREATE INDEX IF NOT EXISTS "agent_status_org_updated_idx"
ON "public"."agent_status"("organization_id", "updated_at");

CREATE INDEX IF NOT EXISTS "invitations_org_email_idx"
ON "public"."invitations"("organization_id", "email");

CREATE INDEX IF NOT EXISTS "invitations_expires_at_idx"
ON "public"."invitations"("expires_at");

CREATE INDEX IF NOT EXISTS "agent_threads_org_agent_user_status_interaction_idx"
ON "public"."agent_threads"("organization_id", "agent_id", "user_identifier", "status", "last_interaction");

CREATE INDEX IF NOT EXISTS "agent_threads_org_agent_status_interaction_idx"
ON "public"."agent_threads"("organization_id", "agent_id", "status", "last_interaction");

CREATE INDEX IF NOT EXISTS "agent_threads_org_status_interaction_idx"
ON "public"."agent_threads"("organization_id", "status", "last_interaction");
