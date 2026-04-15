-- Adição de colunas na tabela agents_cache
ALTER TABLE agents_cache 
ADD COLUMN IF NOT EXISTS "owningTeamId" UUID,
ADD COLUMN IF NOT EXISTS "primaryFunctionId" UUID;

-- Tabela PROJECTS
CREATE TABLE IF NOT EXISTS "projects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "code" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "documentation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela PROJECT_TASKS
CREATE TABLE IF NOT EXISTS "project_tasks" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'backlog',
    "criticality" TEXT NOT NULL DEFAULT 'medium',
    "complexity" TEXT NOT NULL DEFAULT 'standard',
    "assigned_agent_id" UUID,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela EVALUATION_PERIODS
CREATE TABLE IF NOT EXISTS "evaluation_periods" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" TEXT UNIQUE NOT NULL,
    "periodType" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela PERIOD_SCORECARDS
CREATE TABLE IF NOT EXISTS "period_scorecards" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "periodId" UUID NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
    "agentId" UUID NOT NULL REFERENCES agents_cache(id) ON DELETE CASCADE,
    "scoreValue" DECIMAL(10, 2) NOT NULL,
    "scoreStatus" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "confidenceIndex" DECIMAL(5, 2) NOT NULL,
    "rankPosition" INTEGER,
    "trendDelta" DECIMAL(5, 2),
    "operationalBand" TEXT NOT NULL,
    "explanation" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("periodId", "agentId")
);

-- Tabela BADGES
CREATE TABLE IF NOT EXISTS "badges" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "badgeCategory" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela BADGE_AWARDS
CREATE TABLE IF NOT EXISTS "badge_awards" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "badgeId" UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    "agentId" UUID NOT NULL REFERENCES agents_cache(id) ON DELETE CASCADE,
    "awardedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela RANKING_RULES
CREATE TABLE IF NOT EXISTS "ranking_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela CONSEQUENCE_EVENTS
CREATE TABLE IF NOT EXISTS "consequence_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL REFERENCES agents_cache(id) ON DELETE CASCADE,
    "ruleId" UUID NOT NULL REFERENCES ranking_rules(id) ON DELETE CASCADE,
    "status" TEXT NOT NULL,
    "triggeredAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela TASK_TYPES
CREATE TABLE IF NOT EXISTS "task_types" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela TASK_EXECUTIONS
CREATE TABLE IF NOT EXISTS "task_executions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL REFERENCES agents_cache(id) ON DELETE CASCADE,
    "taskTypeId" UUID NOT NULL REFERENCES task_types(id) ON DELETE CASCADE,
    "startedAt" TIMESTAMPTZ NOT NULL,
    "completedAt" TIMESTAMPTZ,
    "executionStatus" TEXT NOT NULL,
    "scoreRaw" DECIMAL(10, 2),
    "scoreFinal" DECIMAL(10, 2)
);

-- Tabela FUNCTION_CATALOG
CREATE TABLE IF NOT EXISTS "function_catalog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices adicionais para performance
CREATE INDEX IF NOT EXISTS "idx_projects_org_status" ON "projects"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_project_status" ON "project_tasks"("project_id", "status");
CREATE INDEX IF NOT EXISTS "idx_task_executions_agent_started" ON "task_executions"("agentId", "startedAt");
