# BRIEFING TÉCNICO — ARVABOTS
## Para o Agente Executor do Projeto
> Grupo Facebrasil · Abril 2026 · Confidencial

---

## Missão

Você é o agente responsável por transformar o OpenClaw Dashboard em **ARVABOTS** — uma plataforma SaaS multi-tenant de agentes ARVA hospedada em `arva.fbrapps.com`. Este documento contém tudo que você precisa para executar sem precisar perguntar.

---

## Infraestrutura Atual (não mexa sem ordem explícita)

| Componente | Localização | Status |
|---|---|---|
| OpenClaw runtime | VPS 2 — 76.13.168.223 | ✅ Operacional |
| api.mjs (backend) | VPS 2 — porta 19010 | ✅ Operacional |
| dashboard atual | dashboard.fbrapps.com | ✅ Operacional |
| PostgreSQL | VPS 2 — banco `openclaw_dashboard` | ✅ Operacional |
| Ranking Hub | ranking.fbrapps.com | ✅ Operacional |
| VPS 1 (empresa) | fbrapps.com | 🔲 Aguarda ARVABOTS |

### Credenciais e chaves já configuradas

```
OpenClaw ApiKey (oracle+sprint+checkin):
oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e

OpenRouter API Key:
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

ORACLE Model:
anthropic/claude-opus-4.6

OpenClaw Base URL:
https://dashboard.fbrapps.com
```

---

## Arquivos de Referência no Projeto

Todos os arquivos abaixo estão no projeto e devem ser lidos antes de iniciar:

| Arquivo | O que é |
|---|---|
| `index-v3-final.html` | Código fonte completo do dashboard atual (1979 linhas) |
| `PRD-ARVABOTS-multitenant.md` | PRD da transformação multi-tenant |
| `PRD-ARVABOTS-supabase.md` | PRD completo com Supabase — arquitetura alvo |
| `arva-oracle.mjs` | Módulo ORACLE já instalado no api.mjs |
| `arva-sprint-apikey.mjs` | Módulo Sprint + ApiKeys |
| `arva-teams-tasknotify.mjs` | Módulo Teams + Task Notification |
| `arva-checkin.mjs` | Módulo Punch Clock |
| `arva-career.mjs` | Módulo Career dos agentes |
| `oracle-briefing-dev.docx` | Documentação da API do ORACLE |
| `briefing-dev-sprint-api.md` | Documentação da Sprint API |

---

## O que já existe no banco (VPS 2)

### Tabelas operacionais
- `agents` — 13 agentes com `career`, `model`, `fallback_model`, `skills`
- `tasks` — com `sprint`, `team_id`, `assigned_by`, `assigned_by_key`
- `teams` + `team_members` — times e membros
- `api_keys` — chaves com escopos
- `agent_checkins` — histórico de check-ins
- `oracle_evaluations` + `oracle_recommendations` — avaliações do ORACLE
- `agent_career_sync` — histórico de sincronização de career

### Agentes e organizações
Os 13 agentes atuais precisam ser associados a organizações. O mapeamento correto é:

| Agente | Slug | Organização | Tipo |
|---|---|---|---|
| Ana Beatriz Schultz | bia | Cliente Externo A | Externo |
| Chiara Garcia | chiara | Grupo Facebrasil | Interno |
| Cinthia Yamamatsu | cinthia | Grupo Facebrasil | Interno |
| David Novaes | david | Grupo Facebrasil | Interno |
| Erick Moraes | erick | Grupo Facebrasil | Interno |
| Gabe Castro | gabe | Cliente Externo B | Externo |
| Giorgian Castro | giorgian | Cliente Externo C | Externo |
| Leon Guavamango | leon | Grupo Facebrasil | Interno |
| Lia Salazar | lia | Grupo Facebrasil | Interno |
| Maia Mendes | maia | Grupo Facebrasil | Interno |
| Maria Rodrigues | maria | Grupo Facebrasil | Interno |
| Mila Castro | mila | Grupo Facebrasil | Interno |
| Priscila | secretary | Grupo Facebrasil | Interno |

---

## Endpoints da API OpenClaw (VPS 2)

### Autenticação
```
POST /api/auth/login
Body: { email, password }
Response: { ok, token }

Usar: Authorization: Bearer {token} para admin
Usar: Authorization: ApiKey oc_live_6e99... para integração
```

### Agentes
```
GET  /api/agents                    → lista todos os agentes
GET  /api/agents/:id                → busca agente por id
GET  /api/agents/:id/career         → career do agente
PUT  /api/agents/:id/career         → atualiza career
GET  /api/agents/:id/workspace/:file → lê MD do workspace
PUT  /api/agents/:id/workspace/:file → salva MD
```

### ORACLE
```
POST /api/oracle/evaluate           → avalia um agente
POST /api/oracle/ranking            → ranking cross-agente
POST /api/oracle/tasklist           → PRD → TaskList
POST /api/oracle/custom             → consulta livre
GET  /api/oracle/recommendations    → recomendações pendentes
PUT  /api/oracle/recommendations/:id/review → aprovar/rejeitar
GET  /api/oracle/history            → histórico
```

### Sprint e Tasks
```
POST /api/sprint                    → criar sprint (payload simplificado)
GET  /api/agents/career/status      → Atenção: rota é /api/careers/status
POST /api/agents/:id/checkin        → punch clock
GET  /api/checkins/summary          → resumo do dia
```

### Teams
```
GET  /api/teams                     → listar times
POST /api/teams                     → criar time
POST /api/teams/:id/members         → adicionar agente ao time
GET  /api/agents/:id/teams          → times de um agente
```

---

## Plano de Execução — 4 Fases

### Fase 1 — Setup Supabase (executar primeiro)

**Objetivo:** Supabase configurado com dados reais dos 13 agentes.

1. Criar projeto no Supabase (supabase.com)
2. Rodar o SQL abaixo no SQL Editor do Supabase:

```sql
-- Organizações
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  plan          TEXT DEFAULT 'starter',
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#10B981',
  openclaw_api_key TEXT,
  openclaw_url  TEXT DEFAULT 'https://dashboard.fbrapps.com',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Membros
CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'member',
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Perfis
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name       TEXT,
  avatar_url      TEXT,
  current_org_id  UUID REFERENCES organizations(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cache de agentes
CREATE TABLE agents_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  openclaw_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT,
  career          TEXT,
  model           TEXT,
  color           TEXT DEFAULT '#10B981',
  active          BOOLEAN DEFAULT true,
  skills          TEXT[],
  last_synced_at  TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  UNIQUE(organization_id, openclaw_id)
);

-- Status realtime
CREATE TABLE agent_status (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  openclaw_id     TEXT NOT NULL,
  status          TEXT DEFAULT 'offline',
  last_seen       TIMESTAMPTZ,
  tasks_pending   INTEGER DEFAULT 0,
  tasks_done      INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, openclaw_id)
);

-- Convites
CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT DEFAULT 'member',
  token           TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_by      UUID REFERENCES auth.users(id),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents_cache        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations         ENABLE ROW LEVEL SECURITY;

-- Funções helper
CREATE OR REPLACE FUNCTION is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members 
  WHERE organization_id = org_id AND user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies
CREATE POLICY "members_see_org" ON organizations FOR SELECT USING (is_member_of(id));
CREATE POLICY "admins_edit_org" ON organizations FOR UPDATE USING (org_role(id) IN ('owner','admin'));
CREATE POLICY "members_see_agents" ON agents_cache FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "admins_manage_agents" ON agents_cache FOR ALL USING (org_role(organization_id) IN ('owner','admin'));
CREATE POLICY "members_see_status" ON agent_status FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "own_profile" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "admins_manage_invites" ON invitations FOR ALL USING (org_role(organization_id) IN ('owner','admin'));

-- Indexes
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org  ON organization_members(organization_id);
CREATE INDEX idx_agents_cache_org ON agents_cache(organization_id);
CREATE INDEX idx_agent_status_org ON agent_status(organization_id);

-- Organizações iniciais
INSERT INTO organizations (slug, name, plan, primary_color, openclaw_api_key, openclaw_url)
VALUES 
  ('facebrasil', 'Grupo Facebrasil', 'enterprise', '#10B981', 
   'oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e',
   'https://dashboard.fbrapps.com'),
  ('cliente-a', 'Cliente A (Bia)', 'professional', '#8B5CF6',
   'oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e',
   'https://dashboard.fbrapps.com'),
  ('cliente-b', 'Cliente B (Gabe)', 'professional', '#F59E0B',
   'oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e',
   'https://dashboard.fbrapps.com'),
  ('cliente-c', 'Cliente C (Giorgian)', 'professional', '#3B82F6',
   'oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e',
   'https://dashboard.fbrapps.com');
```

3. Salvar as credenciais geradas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

---

### Fase 2 — Next.js ARVABOTS (semana 2)

**Stack obrigatório:**
```bash
npx create-next-app@latest arvabots \
  --typescript --tailwind --app --src-dir --import-alias "@/*"

cd arvabots
npm install @supabase/ssr @supabase/supabase-js
npm install lucide-react zustand
npx shadcn@latest init
```

**Mudança crítica do index.html para Next.js:**
```typescript
// lib/openclaw.ts — wrapper para todas as chamadas ao api.mjs
const OPENCLAW_URL = process.env.OPENCLAW_API_URL || 'https://dashboard.fbrapps.com';
const OPENCLAW_KEY = process.env.OPENCLAW_API_KEY;

export async function openclawFetch(path: string, opts: RequestInit = {}) {
  return fetch(`${OPENCLAW_URL}${path}`, {
    ...opts,
    headers: {
      'Authorization': `ApiKey ${OPENCLAW_KEY}`,
      'Content-Type': 'application/json',
      ...opts.headers
    }
  });
}
```

---

### Fase 3 — Integração OpenClaw ↔ Supabase (semana 3)

**Endpoint de sync a criar no Next.js:**
```
POST /api/supabase/sync
→ Chama GET /api/agents no OpenClaw
→ Upsert em agents_cache no Supabase por organização
→ Retorna: { synced: N, errors: [] }
```

**Adicionar ao arva-checkin.mjs (VPS 2):**
Após cada checkin bem-sucedido, atualizar `agent_status` no Supabase via service key.

---

### Fase 4 — Multi-tenant e deploy (semana 4)

**nginx na VPS 1:**
```nginx
server {
  listen 443 ssl;
  server_name arva.fbrapps.com;
  
  # Next.js rodando na porta 3000
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

**CORS no api.mjs (VPS 2) — adicionar:**
```javascript
const allowedOrigins = [
  'https://dashboard.fbrapps.com',
  'https://arva.fbrapps.com',
  'https://ranking.fbrapps.com',
  'http://localhost:3000'
];
```

---

## Regras para o agente executor

1. **Nunca derrubar o OpenClaw** — qualquer mudança na VPS 2 requer restart e teste imediato
2. **Sempre fazer backup** antes de modificar `api.mjs`
3. **O dashboard.fbrapps.com continua operando** durante todo o processo — o ARVABOTS é paralelo
4. **Testar RLS no Supabase** antes de qualquer deploy — usar o SQL Editor com `SET role authenticated`
5. **Variáveis de ambiente nunca no código** — sempre em `.env.local` e `.env` do servidor
6. **A ApiKey `oc_live_6e99...` tem escopos oracle+sprint+checkin** — suficiente para todas as operações do ARVABOTS

---

## Perguntas que NÃO precisam ser feitas

- Qual a URL do OpenClaw? → `https://dashboard.fbrapps.com`
- Qual a ApiKey? → `oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e`
- Quais agentes existem? → Os 13 listados na tabela acima
- Qual o modelo do ORACLE? → `anthropic/claude-opus-4.6` via OpenRouter
- Onde fica o banco? → VPS 2, PostgreSQL, banco `openclaw_dashboard`

---

*Briefing ARVABOTS · Grupo Facebrasil · Abril 2026 · Confidencial*
