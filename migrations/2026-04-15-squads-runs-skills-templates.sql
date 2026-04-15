ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS autonomy_mode TEXT NOT NULL DEFAULT 'interactive',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS architect_summary TEXT,
  ADD COLUMN IF NOT EXISTS preset_key TEXT;

ALTER TABLE squad_steps
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS step_type TEXT NOT NULL DEFAULT 'agent_task',
  ADD COLUMN IF NOT EXISTS skill_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'squad_steps_squad_id_order_key'
  ) THEN
    ALTER TABLE squad_steps
      ADD CONSTRAINT squad_steps_squad_id_order_key UNIQUE (squad_id, "order");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_squads_org_active_status
  ON squads (organization_id, active, status);

CREATE INDEX IF NOT EXISTS idx_squad_steps_org_skill
  ON squad_steps (organization_id, skill_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'squads_organization_id_slug_key'
  ) THEN
    ALTER TABLE squads
      ADD CONSTRAINT squads_organization_id_slug_key UNIQUE (organization_id, slug);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS squad_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_squad_runs_org_status_updated
  ON squad_runs (organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_squad_runs_squad_started
  ON squad_runs (squad_id, started_at DESC);

CREATE TABLE IF NOT EXISTS squad_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES squad_runs(id) ON DELETE CASCADE,
  squad_step_id UUID NOT NULL REFERENCES squad_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  output_text TEXT,
  output_payload JSONB,
  handoff_summary TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_squad_run_steps_run_status_created
  ON squad_run_steps (run_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_squad_run_steps_squad_step
  ON squad_run_steps (squad_step_id);

CREATE TABLE IF NOT EXISTS squad_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES squad_runs(id) ON DELETE CASCADE,
  run_step_id UUID NOT NULL REFERENCES squad_run_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  action TEXT,
  feedback_text TEXT,
  selection_payload JSONB,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_squad_checkpoints_org_status_created
  ON squad_checkpoints (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_squad_checkpoints_run_status
  ON squad_checkpoints (run_id, status);

CREATE TABLE IF NOT EXISTS skill_definitions (
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

CREATE INDEX IF NOT EXISTS idx_skill_definitions_status_type
  ON skill_definitions (status, type);

CREATE TABLE IF NOT EXISTS organization_skill_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enabled',
  config JSONB,
  secret_ref TEXT,
  enabled_by UUID,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_org_skill_bindings_org_status
  ON organization_skill_bindings (organization_id, status);

CREATE TABLE IF NOT EXISTS squad_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  autonomy_mode TEXT NOT NULL DEFAULT 'interactive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_squad_templates_org_active
  ON squad_templates (organization_id, active);

CREATE TABLE IF NOT EXISTS squad_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES squad_templates(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS architect_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID,
  prompt TEXT NOT NULL,
  suggestion JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_architect_suggestions_org_created
  ON architect_suggestions (organization_id, created_at DESC);

INSERT INTO skill_definitions (code, name, description, type, provider, plan_gate, status, config_schema)
VALUES
  (
    'oracle-analysis',
    'Oracle Analysis',
    'Usa o ORACLE do OpenClaw para análise estratégica e ranking.',
    'internal-api',
    'openclaw',
    'starter',
    'active',
    '{"type":"object","properties":{"mode":{"type":"string"}}}'::jsonb
  ),
  (
    'canva-generate',
    'Canva Generate',
    'Gera materiais visuais com integração Canva.',
    'mcp',
    'canva',
    'professional',
    'active',
    '{"type":"object","properties":{"designType":{"type":"string"}}}'::jsonb
  ),
  (
    'browser-investigation',
    'Browser Investigation',
    'Investiga URLs com navegador headless e extrai padrões.',
    'script',
    'playwright',
    'professional',
    'active',
    '{"type":"object","properties":{"targetUrl":{"type":"string"}}}'::jsonb
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO squad_templates (key, name, description, category, active, autonomy_mode)
VALUES
  (
    'youtube-to-linkedin',
    'YouTube para LinkedIn',
    'Transforma um vídeo longo em sequência de conteúdo para LinkedIn.',
    'content-refactor',
    TRUE,
    'interactive'
  ),
  (
    'site-style-investigation',
    'Investigação de Estilo de Site',
    'Analisa referências públicas do cliente e gera briefing interno.',
    'investigation',
    TRUE,
    'interactive'
  ),
  (
    'campaign-squad',
    'Squad de Campanha',
    'Coordena pesquisa, copy e design em uma sequência pronta.',
    'campaign',
    TRUE,
    'interactive'
  )
ON CONFLICT (key) DO NOTHING;
