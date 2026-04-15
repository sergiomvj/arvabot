# 🦞 OpenClaw — Sprint API
## Documentação de Integração
> Grupo Facebrasil · Abril 2026 · Confidencial

---

## Informações de Acesso

| Campo | Valor |
|---|---|
| Base URL | `https://dashboard.fbrapps.com` |
| Autenticação | `ApiKey` (header) |
| Formato | JSON (`Content-Type: application/json`) |
| API Key | ⚠️ Enviada separadamente — confidencial |

Como usar a API Key em **toda** requisição:

```
Authorization: ApiKey oc_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Endpoint Principal — Criar Sprint

### `POST /api/sprint`

Cria um sprint com várias tarefas e distribui automaticamente para cada agente. Os `TASKS.md` nativos de cada agente são atualizados em tempo real.

---

### Request

```
POST https://dashboard.fbrapps.com/api/sprint
Authorization: ApiKey oc_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Content-Type: application/json
```

### Body

```json
{
  "sprintName": "Campanha Alpha",
  "context": "Briefing e diretrizes completos do projeto aqui...",
  "tasks": [
    {
      "agent": "MILA-01",
      "action": "Enviar email pra base inativa"
    },
    {
      "agent": "DAVID-01",
      "action": "Ativar automação de recarga",
      "priority": "high",
      "due_date": "2026-04-30"
    }
  ]
}
```

### Campos do Body

| Campo | Obrigatório | Descrição |
|---|---|---|
| `sprintName` | ✅ | Nome do sprint / projeto |
| `context` | recomendado | Briefing completo — aparece no TASKS.md de cada agente |
| `tasks[]` | ✅ | Array de tarefas — mínimo 1 |
| `tasks[].agent` | ✅ | Slug, ID ou nome do agente (case-insensitive) |
| `tasks[].action` | ✅ | Descrição da tarefa |
| `tasks[].priority` | opcional | `"high"` \| `"normal"` \| `"low"` — padrão: `"normal"` |
| `tasks[].due_date` | opcional | Data no formato `YYYY-MM-DD` |
| `team_id` | opcional | ID do time associado ao sprint |

---

### Response — Sucesso `200`

```json
{
  "ok": true,
  "sprint": "Campanha Alpha",
  "summary": {
    "total": 2,
    "created": 2,
    "failed": 0
  },
  "results": [
    {
      "ok": true,
      "agent": "mila-01",
      "agent_name": "Mila",
      "task_id": 42,
      "title": "Enviar email pra base inativa",
      "workspace_updated": true
    },
    {
      "ok": true,
      "agent": "david-01",
      "agent_name": "David",
      "task_id": 43,
      "title": "Ativar automação de recarga",
      "workspace_updated": true
    }
  ]
}
```

### `workspace_updated`

- **`true`** — o `TASKS.md` nativo do agente no OpenClaw já foi atualizado em tempo real. O agente verá a tarefa na próxima sessão sem nenhuma ação adicional.
- **`false`** — a tarefa foi salva no banco mas houve um problema de acesso ao workspace. Reportar se ocorrer.

---

## Códigos de Erro

| HTTP | Descrição |
|---|---|
| `400` | Campo obrigatório ausente (`sprintName`, `tasks`, `agent`, `action`) |
| `401` | API Key inválida, expirada ou revogada |
| `403` | API Key sem escopo `"sprint"` |
| `404` | Agente não encontrado — verificar slug/nome |
| `500` | Erro interno — reportar |

### Exemplo erro 400

```json
{
  "error": "\"sprintName\" é obrigatório"
}
```

### Erro parcial — tarefa específica falhou

Se uma tarefa do array falhar mas outras passarem, o endpoint retorna `200` com o array `"errors"` preenchido:

```json
{
  "ok": true,
  "summary": { "total": 2, "created": 1, "failed": 1 },
  "results": [ { "ok": true, "agent": "mila-01", "..." : "..." } ],
  "errors": [
    {
      "task": { "agent": "X", "action": "..." },
      "error": "Agente \"X\" não encontrado"
    }
  ]
}
```

---

## Agentes Disponíveis

Use o slug exatamente como está, ou o nome completo — o sistema resolve automaticamente, sem case-sensitivity.

| agent (slug) | Nome completo |
|---|---|
| `bia` | Bia |
| `chiara` | Chiara |
| `david` | David |
| `lia` | Lia |
| `mila` | Mila |
| `leon` | Leon |
| `maia` | Maia |
| `secretary` | Secretary |

> Novos agentes são adicionados automaticamente ao sistema.

---

## Exemplo Completo — curl

```bash
curl -X POST https://dashboard.fbrapps.com/api/sprint \
  -H "Authorization: ApiKey oc_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "sprintName": "Campanha Black Friday",
    "context": "Reativar base de clientes inativos há 90+ dias. Tom urgente mas não agressivo. Foco em recuperação de receita recorrente.",
    "tasks": [
      { "agent": "mila", "action": "Disparar sequência de 3 emails para base inativa", "priority": "high" },
      { "agent": "david", "action": "Ativar automação de recarga no sistema", "due_date": "2026-04-20" },
      { "agent": "bia", "action": "Preparar relatório de clientes elegíveis para reativação" }
    ]
  }'
```

---

## Segurança

- A API Key tem **escopo limitado** — permite apenas criar sprints, não acessa outros endpoints do sistema
- Se a key vazar, geramos uma nova em segundos — sem impacto no sistema
- Todas as chamadas ficam registradas nos logs do OpenClaw com o label da key
- **HTTPS obrigatório** — nunca usar HTTP

---

## Dúvidas

Qualquer questão sobre a integração, entrar em contato via canal direto com a equipe OpenClaw — Grupo Facebrasil.

---

*OpenClaw Sprint API v1.0 · Grupo Facebrasil · Abril 2026*
