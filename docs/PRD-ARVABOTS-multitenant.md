# PRD — ARVABOTS
## Transformação do OpenClaw Dashboard em Plataforma Multi-Tenant
> Versão 1.0 · Grupo Facebrasil · Abril 2026 · Confidencial

---

## 1. Contexto e Objetivo

O OpenClaw Dashboard (`dashboard.fbrapps.com`) é hoje um sistema single-tenant que gerencia os agentes ARVA internos do Grupo Facebrasil. O objetivo deste PRD é transformá-lo no **ARVABOTS** — uma plataforma multi-tenant hospedada em `arva.fbrapps.com` (VPS 1) capaz de criar e gerenciar agentes ARVA para múltiplos clientes, mantendo o OpenClaw runtime intacto na VPS 2.

### O que NÃO muda
- O `api.mjs` na VPS 2 continua operando normalmente em `dashboard.fbrapps.com`
- O OpenClaw runtime, agentes, Telegram e PostgreSQL permanecem na VPS 2
- Nenhuma linha do código existente será deletada — apenas extendida

### O que muda
- O `index.html` é renomeado/evoluído para ARVABOTS e hospedado na VPS 1
- Multi-tenancy é adicionado ao banco e à API
- CORS é liberado para `arva.fbrapps.com` no api.mjs
- A variável `API` no frontend passa a apontar para `https://dashboard.fbrapps.com`

---

## 2. Arquitetura Alvo

```
VPS 1 (arva.fbrapps.com)              VPS 2 (dashboard.fbrapps.com)
┌─────────────────────────┐           ┌──────────────────────────────┐
│  ARVABOTS               │           │  OpenClaw Runtime             │
│  ├── index.html (nginx) │◄─────────►│  ├── api.mjs (porta 19010)   │
│  └── nginx proxy        │  HTTPS    │  ├── PostgreSQL               │
└─────────────────────────┘           │  ├── Workspaces dos agentes   │
                                      │  └── Telegram bots            │
         ranking.fbrapps.com          └──────────────────────────────┘
┌─────────────────────────┐                        ▲
│  Ranking Hub (Next.js)  │────────────────────────┘
└─────────────────────────┘
```

---

## 3. Modelo de Dados Multi-Tenant

### 3.1 Nova tabela: `organizations`

```sql
CREATE TABLE organizations (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(80) UNIQUE NOT NULL,
  name         VARCHAR(200) NOT NULL,
  plan         VARCHAR(30) DEFAULT 'starter',
  -- 'starter' | 'professional' | 'enterprise'
  logo_url     TEXT,
  primary_color VARCHAR(20) DEFAULT '#10B981',
  owner_email  VARCHAR(200),
  owner_name   VARCHAR(200),
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- Organização padrão — Grupo Facebrasil
INSERT INTO organizations (slug, name, plan, owner_email, owner_name)
VALUES ('facebrasil', 'Grupo Facebrasil', 'enterprise', 
        'sergio@facebrasil.com', 'Sergio Castro');
```

### 3.2 Coluna `organization_id` em `agents`

```sql
-- Adicionar sem quebrar dados existentes
ALTER TABLE agents 
  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Associar todos os agentes atuais ao Grupo Facebrasil
UPDATE agents SET organization_id = 1 WHERE organization_id IS NULL;

-- Após validação, tornar obrigatório
ALTER TABLE agents ALTER COLUMN organization_id SET NOT NULL;
```

### 3.3 Coluna `organization_id` em `users`

```sql
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Associar usuário atual ao Grupo Facebrasil
UPDATE users SET organization_id = 1 WHERE organization_id IS NULL;
```

### 3.4 Mapeamento de agentes por organização (estado atual)

| Agente | Organização | Observação |
|---|---|---|
| Chiara, David, Cinthia, Erick | Grupo Facebrasil | Internos |
| Leon, Lia, Maia, Maria, Mila, Priscila | Grupo Facebrasil | Internos |
| Bia | Cliente Externo A | A definir |
| Gabe | Cliente Externo B | A definir |
| Giorgian | Cliente Externo C | A definir |

---

## 4. Mudanças no Backend (api.mjs — VPS 2)

### 4.1 CORS — liberar VPS 1

```javascript
// Adicionar arva.fbrapps.com à lista de origens permitidas
const allowedOrigins = [
  'https://dashboard.fbrapps.com',
  'https://arva.fbrapps.com',
  'https://ranking.fbrapps.com',
  'http://localhost:3000' // dev local
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

### 4.2 Middleware de tenant — filtrar por organização

```javascript
// Injetar organization_id em todas as queries de agents
async function withTenant(req, res, next) {
  if (req.user) {
    const org = await db.query(
      'SELECT organization_id FROM users WHERE id = $1', 
      [req.user.id]
    );
    req.organizationId = org.rows[0]?.organization_id;
  } else if (req.apiKey) {
    // ApiKeys também associadas a uma organização
    req.organizationId = req.apiKey.organization_id;
  }
  next();
}
```

### 4.3 Endpoints afetados pelo tenant

Todos os endpoints que retornam ou manipulam agentes precisam filtrar por `organization_id`:

```javascript
// ANTES
SELECT * FROM agents ORDER BY name

// DEPOIS  
SELECT * FROM agents 
WHERE organization_id = $1 
ORDER BY name
```

Endpoints impactados:
- `GET /api/agents` — listar agentes
- `GET /api/overview` — métricas do overview
- `GET /api/tasks` — tarefas
- `GET /api/logs` — logs
- `GET /api/teams` — times
- `POST /api/sprint` — criar sprint
- `GET /api/careers/status` — careers
- `POST /api/oracle/*` — avaliações

### 4.4 Novos endpoints de organizações

```
GET  /api/organizations           → listar orgs (admin only)
POST /api/organizations           → criar org
GET  /api/organizations/:id       → buscar org com agentes
PUT  /api/organizations/:id       → atualizar org
GET  /api/organizations/:id/agents → agentes da org
POST /api/organizations/:id/invite → convidar usuário para org
```

---

## 5. Mudanças no Frontend (index.html → ARVABOTS)

### 5.1 Mudança crítica — variável API

```javascript
// ANTES (same-origin)
const API = '';

// DEPOIS (cross-origin para VPS 2)
const API = 'https://dashboard.fbrapps.com';
```

### 5.2 Rebranding

| Elemento | Antes | Depois |
|---|---|---|
| `<title>` | OpenClaw — Dashboard | ARVABOTS — Gerenciador de Agentes |
| Brand name (sidebar) | OpenClaw | ARVABOTS |
| Brand sub | dashboard.fbrapps.com | arva.fbrapps.com |
| Emoji/logo | 🦞 | 🤖 (ou logo FBR) |
| VPS addr no footer | 76.13.168.223 | arva.fbrapps.com |

### 5.3 Nova página: Organizações

Adicionar item na sidebar e página `/organizations`:

```javascript
// Sidebar
{ id: 'organizations', icon: '🏢', label: 'Organizações', adminOnly: true }

// Página
// - Lista de organizações com contador de agentes
// - Card por organização com: nome, plano, agentes ativos, owner
// - Botão "Nova Organização" 
// - Click na org → filtra agentes por organização
```

### 5.4 Filtro de organização nos cards de agentes

```javascript
// Adicionar seletor de organização acima dos filtros existentes
<select id="org-filter" onchange="filterByOrg(this.value)">
  <option value="all">Todas as organizações</option>
  <!-- populado via GET /api/organizations -->
</select>
```

### 5.5 Badge de organização nos cards dos agentes

```javascript
// Adicionar no card do agente
<div class="agent-org-badge" style="background:${org.primary_color}22">
  ${org.name}
</div>
```

### 5.6 The Call — campo de organização

```javascript
// Adicionar na etapa de Configuração do The Call
{ title: 'Organização', fields: () => `
  <div class="form-group">
    <label>Organização cliente</label>
    <select id="tc-org-id">
      <!-- populado via /api/organizations -->
    </select>
  </div>
` }
```

---

## 6. Deploy na VPS 1

### 6.1 Estrutura de diretórios

```bash
# Na VPS 1
mkdir -p /var/www/arvabots
cp index.html /var/www/arvabots/index.html
```

### 6.2 Nginx config

```nginx
server {
  listen 80;
  server_name arva.fbrapps.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name arva.fbrapps.com;
  
  ssl_certificate     /etc/letsencrypt/live/arva.fbrapps.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/arva.fbrapps.com/privkey.pem;
  
  root /var/www/arvabots;
  index index.html;
  
  location / {
    try_files $uri /index.html;
  }
  
  # Headers de segurança
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";
}
```

### 6.3 SSL via Certbot

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d arva.fbrapps.com
```

---

## 7. Fases de Implementação

### Fase 1 — Sem quebrar nada (esta semana)
**Backend (VPS 2):**
- [ ] Adicionar CORS para `arva.fbrapps.com` no api.mjs
- [ ] Criar tabela `organizations` e inserir Grupo Facebrasil
- [ ] Adicionar coluna `organization_id` em `agents` e `users`
- [ ] Popular `organization_id` para todos os agentes existentes (org_id = 1)

**Frontend:**
- [ ] Mudar `const API = ''` para `const API = 'https://dashboard.fbrapps.com'`
- [ ] Rebranding: título, nome, cores
- [ ] Testar tudo funcionando em `arva.fbrapps.com`

**Infra (VPS 1):**
- [ ] Configurar nginx para `arva.fbrapps.com`
- [ ] SSL via Certbot
- [ ] Deploy do `index.html` atualizado

### Fase 2 — Multi-tenant básico (semana 2)
- [ ] Middleware `withTenant` no api.mjs
- [ ] Filtro por `organization_id` nos endpoints principais
- [ ] Endpoints de organizações (CRUD)
- [ ] Página de Organizações no frontend
- [ ] Seletor de organização nos filtros de agentes
- [ ] Badge de organização nos cards
- [ ] Associar Bia, Gabe e Giorgian às suas organizações corretas

### Fase 3 — Multi-tenant completo (semana 3-4)
- [ ] Sistema de convite de usuários por organização
- [ ] Login escopado por organização
- [ ] The Call com campo de organização
- [ ] Endpoints de oracle e sprint escopados por tenant
- [ ] Dashboard por organização (métricas isoladas)
- [ ] API Keys escopadas por organização

---

## 8. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| CORS bloqueado por nginx na VPS 2 | Alto | Testar CORS antes do deploy na VPS 1 |
| Queries sem filtro de org expõem dados | Alto | Code review em todos os endpoints antes da Fase 2 |
| Token JWT não carrega organization_id | Médio | Adicionar org ao payload do JWT no login |
| Bia/Gabe/Giorgian sem organização definida | Baixo | Criar orgs placeholder antes da Fase 2 |

---

## 9. Checklist de Entrega — Fase 1 (MVP)

| Item | Responsável | Status |
|---|---|---|
| CORS liberado para arva.fbrapps.com | Dev Backend | `[ ]` |
| Tabela organizations criada | Dev Backend | `[ ]` |
| Coluna organization_id em agents/users | Dev Backend | `[ ]` |
| const API atualizada no frontend | Dev Frontend | `[ ]` |
| Rebranding visual | Dev Frontend | `[ ]` |
| Nginx configurado na VPS 1 | DevOps | `[ ]` |
| SSL ativo em arva.fbrapps.com | DevOps | `[ ]` |
| Teste de login e carregamento de agentes | QA | `[ ]` |
| dashboard.fbrapps.com continua operando | QA | `[ ]` |

---

*ARVABOTS PRD v1.0 · Grupo Facebrasil · Abril 2026 · Confidencial*
