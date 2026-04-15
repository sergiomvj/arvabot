-- Batch 1, 2, 3 & 6: Fundação e Orquestração de Squads + Sessions
-- Este script cria as tabelas base caso não existam e aplica as colunas necessárias.

-- 1. Squads (Core)
CREATE TABLE IF NOT EXISTS public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT,
  name TEXT NOT NULL,
  description TEXT,
  architect_prompt TEXT,
  architect_summary TEXT,
  autonomy_mode TEXT NOT NULL DEFAULT 'interactive',
  status TEXT NOT NULL DEFAULT 'draft',
  preset_key TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Squad Steps
CREATE TABLE IF NOT EXISTS public.squad_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  title TEXT,
  instructions TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'agent_task',
  skill_code TEXT,
  checkpoint_required BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (squad_id, "order")
);

-- 3. Squad Runs
CREATE TABLE IF NOT EXISTS public.squad_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  current_step INTEGER,
  started_by UUID,
  input_payload JSONB,
  output_summary JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Squad Run Steps
CREATE TABLE IF NOT EXISTS public.squad_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.squad_runs(id) ON DELETE CASCADE,
  squad_step_id UUID NOT NULL REFERENCES public.squad_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  output_text TEXT,
  output_payload JSONB,
  handoff_summary TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Squad Checkpoints (Batch 4)
CREATE TABLE IF NOT EXISTS public.squad_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.squad_runs(id) ON DELETE CASCADE,
  run_step_id UUID NOT NULL REFERENCES public.squad_run_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  action TEXT,
  feedback_text TEXT,
  selection_payload JSONB,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 6. Skills (Batch 5/6)
CREATE TABLE IF NOT EXISTS public.skill_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  provider TEXT,
  plan_gate TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  config_schema JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_skill_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enabled',
  config JSONB,
  secret_ref TEXT,
  enabled_by UUID,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, skill_id)
);

-- 7. Browser Sessions (Batch 6)
CREATE TABLE IF NOT EXISTS public.browser_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  cookies JSONB,
  storage_state JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, platform)
);

-- 8. Templates (Batch 7)
CREATE TABLE IF NOT EXISTS public.squad_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  autonomy_mode TEXT NOT NULL DEFAULT 'interactive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.squad_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.squad_templates(id) ON DELETE CASCADE,
  organization_id UUID,
  agent_id TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  title TEXT,
  instructions TEXT NOT NULL,
  checkpoint_required BOOLEAN NOT NULL DEFAULT FALSE,
  step_type TEXT NOT NULL DEFAULT 'agent_task',
  skill_code TEXT,
  UNIQUE (template_id, "order")
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_squads_org_active_status ON squads (organization_id, active, status);
CREATE INDEX IF NOT EXISTS idx_squad_runs_org_status_updated ON squad_runs (organization_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_squad_checkpoints_org_status_created ON squad_checkpoints (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_org ON browser_sessions (organization_id);
