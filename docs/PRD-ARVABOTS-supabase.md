# PRD — ARVABOTS com Supabase
## Plataforma Multi-Tenant de Agentes ARVA
> Versão 2.0 · Grupo Facebrasil · Abril 2026 · Confidencial

---

## 1. Visão Geral

O ARVABOTS é a evolução do OpenClaw Dashboard em uma **plataforma SaaS multi-tenant** para criação e gestão de agentes ARVA para múltiplos clientes. A adição do Supabase como camada de backend resolve três problemas de uma vez:

- **Auth multi-tenant nativo** — sem construir do zero
- **RLS (Row Level Security)** — isolamento de dados garantido no banco, não no código
- **Realtime** — cards dos agentes atualizam ao vivo sem polling
- **Storage** — avatares, documentos e assets dos agentes

### Princípio fundamental
O OpenClaw (`api.mjs` na VPS 2) continua sendo o **runtime operacional** — executa agentes, gerencia Telegram, workspaces e ORACLE. O Supabase é o **backend administrativo** do ARVABOTS — auth, dados dos clientes, configurações, realtime.

---

## 2. Arquitetura Alvo

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARVABOTS (arva.fbrapps.com)                  │
│                         VPS 1 / nginx                           │
│                                                                 │
│  ┌─────────────────┐          ┌──────────────────────────────┐  │
│  │  Frontend       │          │  Supabase (cloud)            │  │
│  │  Next.js 14     │◄────────►│  ├── Auth (JWT multi-tenant) │  │
│  │  App Router     │          │  ├── PostgreSQL + RLS        │  │
│  │  Tailwind CSS   │          │  ├── Realtime                │  │
│  └────────┬────────┘          │  └── Storage                 │  │
│           │                   └──────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────┘
            │ HTTPS
            ▼
┌─────────────────────────────────────────────────────────────────┐
│               OpenClaw Runtime (dashboard.fbrapps.com)          │
│                         VPS 2                                   │
│  ├── api.mjs (porta 19010) — endpoints operacionais             │
│  ├── PostgreSQL — dados operacionais dos agentes                │
│  ├── Workspaces (SOUL.md, TASKS.md, etc.)                       │
│  ├── ORACLE (Opus 4.6 via OpenRouter)                           │
│  └── Telegram bots                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Divisão de responsabilidades

| Camada | Supabase | OpenClaw (api.mjs) |
|---|---|---|
| Auth / Login | ✅ | — |
| Organizações / Tenants | ✅ | — |
| Usuários e permissões | ✅ | — |
| Configurações dos agentes | ✅ (cache) | ✅ (source of truth) |
| Realtime status dos agentes | ✅ | — |
| Storage (logos, docs) | ✅ | — |
| Execução dos agentes | — | ✅ |
| ORACLE / avaliações | — | ✅ |
| Workspaces (MDs) | — | ✅ |
| Telegram | — | ✅ |
| Sprint / Tasks | ✅ (leitura) | ✅ (escrita) |

---

## 3. Estrutura de Dados no Supabase

### 3.1 Tabelas principais

```sql
-- Organizações (tenants)
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  plan          TEXT DEFAULT 'starter',
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#10B981',
  openclaw_api_key TEXT,        -- ApiKey para chamar o api.mjs desta org
  openclaw_url  TEXT DEFAULT 'https://dashboard.fbrapps.com',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Membros de organizações
CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'member',  -- 'owner' | 'admin' | 'member' | 'viewer'
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Perfil estendido do usuário
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name       TEXT,
  avatar_url      TEXT,
  current_org_id  UUID REFERENCES organizations(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cache de agentes (sync do OpenClaw)
CREATE TABLE agents_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  openclaw_id     TEXT NOT NULL,          -- slug do agente no OpenClaw
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

-- Status realtime dos agentes
CREATE TABLE agent_status (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  openclaw_id     TEXT NOT NULL,
  status          TEXT DEFAULT 'offline',  -- 'online' | 'offline' | 'busy'
  last_seen       TIMESTAMPTZ,
  tasks_pending   INTEGER DEFAULT 0,
  tasks_done      INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, openclaw_id)
);

-- Convites pendentes
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
```

### 3.2 RLS Policies

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents_cache       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations        ENABLE ROW LEVEL SECURITY;

-- Função helper: retorna org_id do usuário atual
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT current_org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função helper: verifica se usuário é membro da org
CREATE OR REPLACE FUNCTION is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função helper: verifica role do usuário na org
CREATE OR REPLACE FUNCTION org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members 
  WHERE organization_id = org_id AND user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies: organizations
CREATE POLICY "Membros veem sua organização"
  ON organizations FOR SELECT
  USING (is_member_of(id));

CREATE POLICY "Owners editam sua organização"
  ON organizations FOR UPDATE
  USING (org_role(id) IN ('owner', 'admin'));

-- Policies: agents_cache
CREATE POLICY "Membros veem agentes da sua org"
  ON agents_cache FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Admins gerenciam agentes"
  ON agents_cache FOR ALL
  USING (org_role(organization_id) IN ('owner', 'admin'));

-- Policies: agent_status (realtime)
CREATE POLICY "Membros veem status dos agentes"
  ON agent_status FOR SELECT
  USING (is_member_of(organization_id));

-- Policies: profiles
CREATE POLICY "Usuários veem e editam seu próprio perfil"
  ON profiles FOR ALL
  USING (id = auth.uid());

-- Policies: invitations
CREATE POLICY "Admins gerenciam convites"
  ON invitations FOR ALL
  USING (org_role(organization_id) IN ('owner', 'admin'));

-- Indexes para performance com RLS
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org  ON organization_members(organization_id);
CREATE INDEX idx_agents_cache_org ON agents_cache(organization_id);
CREATE INDEX idx_agent_status_org ON agent_status(organization_id);
```

### 3.3 Auth Hook — injetar org_id no JWT

```sql
-- Hook que roda após login para incluir org_id no JWT
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims    JSONB;
  org_id    UUID;
  user_role TEXT;
BEGIN
  claims := event->'claims';
  
  -- Buscar org atual do usuário
  SELECT p.current_org_id INTO org_id
  FROM profiles p WHERE p.id = (event->>'user_id')::UUID;
  
  -- Buscar role na org
  SELECT role INTO user_role
  FROM organization_members
  WHERE user_id = (event->>'user_id')::UUID 
    AND organization_id = org_id;
  
  -- Injetar no JWT
  claims := jsonb_set(claims, '{org_id}', to_jsonb(org_id));
  claims := jsonb_set(claims, '{org_role}', to_jsonb(user_role));
  
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Sync Supabase ↔ OpenClaw

O OpenClaw continua sendo a source of truth operacional. O Supabase tem uma **camada de cache** que é sincronizada periodicamente.

### 4.1 Webhook de sync (api.mjs → Supabase)

```javascript
// Quando um agente é criado/atualizado no OpenClaw,
// dispara webhook para atualizar o cache no Supabase

async function syncAgentToSupabase(agent, organizationId) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/agents_cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      organization_id: organizationId,
      openclaw_id: agent.id,
      name: agent.name,
      role: agent.role,
      career: agent.career,
      model: agent.model,
      color: agent.color,
      active: agent.active,
      skills: agent.skills || [],
      last_synced_at: new Date().toISOString()
    })
  });
}
```

### 4.2 Endpoint de sync manual

```
POST /api/supabase/sync-agents
Authorization: Bearer JWT (admin)

→ Lê todos os agentes da org no OpenClaw
→ Upsert em agents_cache no Supabase
→ Retorna: { synced: N, errors: [] }
```

### 4.3 Realtime de status (checkin → Supabase)

Quando o OpenClaw recebe um checkin, além de atualizar o TASKS.md, atualiza o `agent_status` no Supabase:

```javascript
// Em arva-checkin.mjs — após o checkin bem-sucedido
await fetch(`${SUPABASE_URL}/rest/v1/agent_status`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'resolution=merge-duplicates'
  },
  body: JSON.stringify({
    organization_id: agent.organization_supabase_id,
    openclaw_id: agent.id,
    status: 'online',
    last_seen: new Date().toISOString(),
    tasks_pending: hubResponse.tasks?.length || 0,
    updated_at: new Date().toISOString()
  })
});
```

O frontend do ARVABOTS faz subscribe no Supabase Realtime e os cards atualizam instantaneamente sem polling.

---

## 5. Frontend — Next.js 14

### 5.1 Stack

```
Framework:     Next.js 14 (App Router)
Auth:          @supabase/ssr
Database:      @supabase/supabase-js
UI:            Tailwind CSS + shadcn/ui
Icons:         Lucide React
State:         Zustand
Realtime:      Supabase Realtime
Deploy:        VPS 1 via nginx (build estático ou Node server)
```

### 5.2 Estrutura de rotas

```
app/
├── (auth)/
│   ├── login/              → Login com Supabase Auth
│   ├── register/           → Cadastro + criar organização
│   └── invite/[token]/     → Aceitar convite
│
├── (dashboard)/
│   ├── layout.tsx          → Sidebar + org switcher
│   ├── page.tsx            → Overview (métricas da org)
│   ├── agents/
│   │   ├── page.tsx        → Lista de agentes (cards)
│   │   └── [id]/page.tsx   → Detalhes do agente
│   ├── teams/              → Times e membros
│   ├── tasks/              → Fila de tarefas
│   ├── oracle/             → Chat ORACLE + ranking
│   ├── organizations/      → Gerenciar org (admin)
│   ├── the-call/           → Criar novo agente
│   └── settings/           → Configurações
│
└── api/
    ├── supabase/
    │   └── sync/route.ts   → Sync com OpenClaw
    └── webhook/
        └── openclaw/route.ts → Recebe eventos do OpenClaw
```

### 5.3 Org Switcher

Para usuários que pertencem a múltiplas organizações (ex: você, que gerencia a FBR e os clientes externos):

```tsx
// Componente OrgSwitcher na sidebar
export function OrgSwitcher() {
  const { organizations, currentOrg, switchOrg } = useOrganization();
  
  return (
    <Select value={currentOrg.id} onValueChange={switchOrg}>
      {organizations.map(org => (
        <SelectItem key={org.id} value={org.id}>
          <div className="flex items-center gap-2">
            <div style={{ background: org.primary_color }} className="w-3 h-3 rounded-full" />
            {org.name}
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}
```

### 5.4 Cards de agentes com Realtime

```tsx
// Hook que combina dados do cache Supabase + status realtime
export function useAgents(organizationId: string) {
  const [agents, setAgents] = useState([]);
  const supabase = createClient();
  
  useEffect(() => {
    // Carregar dados iniciais
    supabase
      .from('agents_cache')
      .select('*, agent_status(*)')
      .eq('organization_id', organizationId)
      .then(({ data }) => setAgents(data));
    
    // Subscribe a mudanças de status em realtime
    const channel = supabase
      .channel('agent-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_status',
        filter: `organization_id=eq.${organizationId}`
      }, (payload) => {
        // Atualiza apenas o status do agente afetado
        setAgents(prev => prev.map(a => 
          a.openclaw_id === payload.new.openclaw_id 
            ? { ...a, agent_status: payload.new }
            : a
        ));
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [organizationId]);
  
  return agents;
}
```

---

## 6. Autenticação e Multi-Tenancy

### 6.1 Fluxo de login

```
1. Usuário acessa arva.fbrapps.com/login
2. Supabase Auth (email/senha ou Magic Link)
3. Auth Hook injeta org_id + org_role no JWT
4. Redirect para /dashboard
5. Middleware Next.js valida sessão Supabase
6. Todas as queries filtradas por org_id automaticamente via RLS
```

### 6.2 Fluxo de convite de cliente

```
1. Admin FBR acessa /organizations/novo
2. Preenche: nome do cliente, email do responsável, plano
3. Sistema cria: organização no Supabase + envia email de convite
4. Cliente clica no link → cria senha → acessa ARVABOTS
5. Cliente vê APENAS seus agentes (RLS garante isolamento)
6. Admin FBR pode criar agentes para o cliente via The Call
```

### 6.3 Roles e permissões

| Role | O que pode fazer |
|---|---|
| `owner` | Tudo — gerenciar org, usuários, agentes, faturamento |
| `admin` | Criar/editar agentes, convidar membros, ver tudo |
| `member` | Ver agentes, criar tarefas, usar ORACLE |
| `viewer` | Somente visualização — sem criar nada |

---

## 7. Fases de Implementação

### Fase 1 — Infraestrutura Supabase (semana 1)
- [ ] Criar projeto Supabase
- [ ] Criar tabelas + RLS policies
- [ ] Configurar Auth Hook (org_id no JWT)
- [ ] Inserir organização Facebrasil e usuário admin
- [ ] Popular `agents_cache` com os 13 agentes atuais
- [ ] Testar RLS: usuário vê apenas sua org

### Fase 2 — ARVABOTS Next.js básico (semana 2)
- [ ] Setup Next.js 14 + Supabase SSR + Tailwind
- [ ] Login page com Supabase Auth
- [ ] Middleware de proteção de rotas
- [ ] Layout com sidebar + org switcher
- [ ] Página de agentes com cards (dados do cache)
- [ ] Realtime de status nos cards
- [ ] Deploy na VPS 1 com nginx

### Fase 3 — Integração OpenClaw (semana 3)
- [ ] Endpoint de sync Supabase ↔ OpenClaw
- [ ] Checkin atualiza agent_status no Supabase
- [ ] The Call migrado para Next.js
- [ ] ORACLE chat integrado no ARVABOTS
- [ ] Tasks via ORACLE e sprint API

### Fase 4 — Multi-tenant completo (semana 4)
- [ ] Fluxo de convite de clientes
- [ ] Página de organizações (admin FBR)
- [ ] Bia, Gabe e Giorgian movidos para suas orgs
- [ ] Org switcher funcional
- [ ] Dashboard por organização com métricas isoladas

---

## 8. Variáveis de Ambiente

### ARVABOTS (VPS 1 / Next.js)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
OPENCLAW_API_URL=https://dashboard.fbrapps.com
OPENCLAW_API_KEY=oc_live_6e99...
```

### OpenClaw (VPS 2 / api.mjs) — adicionar
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ARVABOTS_URL=https://arva.fbrapps.com
```

---

## 9. Checklist Final

| Item | Fase | Status |
|---|---|---|
| Projeto Supabase criado | 1 | `[ ]` |
| Tabelas + RLS configuradas | 1 | `[ ]` |
| Org Facebrasil + 13 agentes no cache | 1 | `[ ]` |
| Next.js rodando em arva.fbrapps.com | 2 | `[ ]` |
| Login funcionando | 2 | `[ ]` |
| Cards de agentes com realtime | 2 | `[ ]` |
| Sync OpenClaw ↔ Supabase | 3 | `[ ]` |
| The Call no Next.js | 3 | `[ ]` |
| ORACLE chat no ARVABOTS | 3 | `[ ]` |
| Convite de clientes | 4 | `[ ]` |
| Bia/Gabe/Giorgian em orgs separadas | 4 | `[ ]` |

---

*ARVABOTS PRD v2.0 com Supabase · Grupo Facebrasil · Abril 2026 · Confidencial*
