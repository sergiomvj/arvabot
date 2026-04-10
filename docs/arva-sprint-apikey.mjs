// ============================================================
// ARVA — Sprint Simplified Intake + API Key System
// Adicionar ao api.mjs ANTES do app.listen()
// Grupo Facebrasil · Abril 2026
// ============================================================
//
// NOVIDADES NESTE MÓDULO:
//   1. POST /api/sprint  → payload simplificado (formato do dev)
//   2. Sistema de API Keys administrativas para integração externa
//      (alternativa ao Bearer JWT para machine-to-machine)
//
// ── SQL de setup (rodar uma vez no PostgreSQL):
//
// -- Tabela de API Keys administrativas
// CREATE TABLE IF NOT EXISTS api_keys (
//   id          SERIAL PRIMARY KEY,
//   key_hash    VARCHAR(128) UNIQUE NOT NULL,   -- SHA-256 da key real
//   key_prefix  VARCHAR(12) NOT NULL,            -- ex: "oc_live_abc1" (exibição)
//   label       VARCHAR(200) NOT NULL,           -- ex: "Integração Dev Externo"
//   created_by  VARCHAR(100),                    -- admin que gerou
//   scopes      TEXT[] DEFAULT ARRAY['sprint'],  -- ['sprint','tasks','agents','all']
//   last_used   TIMESTAMP,
//   revoked     BOOLEAN DEFAULT false,
//   created_at  TIMESTAMP DEFAULT NOW()
// );
//
// -- Índice para lookup rápido
// CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
//
// -- Coluna assigned_by_key em tasks (registra qual key criou)
// ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_key VARCHAR(12);
// ============================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ── Helper: path do TASKS.md de um agente
function tasksPath(agentId) {
  const base = process.env.OPENCLAW_WORKSPACE_BASE || '/home/openclaw/.openclaw';
  return path.join(base, `workspace-${agentId}`, 'TASKS.md');
}

// ── Helper: bloco markdown de uma tarefa para TASKS.md
function buildTaskBlock(task) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const prio = task.priority || 'normal';
  const prioIcon = { high: '🔴', normal: '🟡', low: '🟢' }[prio] || '🟡';
  const due  = task.due_date   ? `\n- **Prazo:** ${task.due_date}` : '';
  const team = task.team_name  ? `\n- **Time:** ${task.team_name}` : '';
  const by   = task.assigned_by ? `\n- **Atribuído por:** ${task.assigned_by}` : '';

  return `
## [TASK-${task.id}] ${task.title}
> Sprint: **${task.sprint}** · Adicionada em ${now}

- **Status:** pending
- **Prioridade:** ${prioIcon} ${prio}${due}${team}${by}

### Ação
${task.description || '_Nenhuma descrição adicional._'}

### Contexto do Projeto
${task.context || '_Sem contexto adicional._'}

---
`;
}

// ── Helper: escreve no TASKS.md (cria se não existir)
function appendTasksMd(agentId, content) {
  const filePath = tasksPath(agentId);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath,
      `# TASKS.md — ${agentId}\n> Gerenciado automaticamente pelo OpenClaw\n\n---\n`,
      'utf8'
    );
  }
  fs.appendFileSync(filePath, content, 'utf8');
}

// ── Helper: hash de uma API key
function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

// ── Middleware: aceita Bearer JWT (padrão existente) OU API Key (novo)
async function authOrApiKey(req, res, next) {
  const header = req.headers['authorization'] || '';

  // 1) API Key no header: "ApiKey oc_live_xxxx"
  if (header.startsWith('ApiKey ')) {
    const rawKey = header.slice(7).trim();
    const hash   = hashKey(rawKey);
    try {
      const row = (await db.query(
        `SELECT * FROM api_keys WHERE key_hash = $1 AND revoked = false`,
        [hash]
      )).rows[0];

      if (!row) return res.status(401).json({ error: 'API Key inválida ou revogada' });

      // Atualiza last_used sem await para não bloquear
      db.query('UPDATE api_keys SET last_used = NOW() WHERE id = $1', [row.id]).catch(() => {});

      req.apiKey  = row;
      req.apiKeyPrefix = row.key_prefix;
      return next();
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 2) Bearer JWT padrão — delega ao middleware auth existente
  return auth(req, res, next);
}

// ── Escopo mínimo exigido
function requireScope(scope) {
  return (req, res, next) => {
    if (req.apiKey) {
      const scopes = req.apiKey.scopes || [];
      if (!scopes.includes('all') && !scopes.includes(scope)) {
        return res.status(403).json({ error: `API Key sem escopo '${scope}'` });
      }
    }
    next();
  };
}

// ============================================================
// BLOCO 1 — GERENCIAMENTO DE API KEYS (admin only)
// ============================================================

// ── Gerar nova API Key
app.post('/api/admin/api-keys', auth, async (req, res) => {
  try {
    const { label, scopes = ['sprint'] } = req.body;
    if (!label) return res.status(400).json({ error: 'label é obrigatório' });

    // Gera key: oc_live_ + 32 bytes random
    const rawKey    = 'oc_live_' + crypto.randomBytes(32).toString('hex');
    const keyHash   = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 16); // "oc_live_" + 8 chars

    await db.query(`
      INSERT INTO api_keys (key_hash, key_prefix, label, created_by, scopes)
      VALUES ($1, $2, $3, $4, $5)
    `, [keyHash, keyPrefix, label, req.user?.email || 'admin', scopes]);

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
      ['system', 'api_key_created', `Label: ${label} | Escopos: ${scopes.join(',')} | Prefix: ${keyPrefix}`]);

    // ⚠️ Única vez que a key completa é retornada — não é armazenada
    res.json({
      ok: true,
      api_key: rawKey,         // ← guardar agora, nunca mais será mostrada
      key_prefix: keyPrefix,
      label,
      scopes,
      warning: 'Guarde esta chave agora. Ela não será exibida novamente.'
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Listar API Keys (sem mostrar a key real)
app.get('/api/admin/api-keys', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, key_prefix, label, created_by, scopes, last_used, revoked, created_at
      FROM api_keys
      ORDER BY created_at DESC
    `);
    res.json({ ok: true, keys: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Revogar API Key
app.delete('/api/admin/api-keys/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE api_keys SET revoked = true WHERE id = $1 RETURNING key_prefix, label`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Key não encontrada' });

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
      ['system', 'api_key_revoked', `Key: ${result.rows[0].key_prefix} — ${result.rows[0].label}`]);

    res.json({ ok: true, revoked: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// BLOCO 2 — POST /api/sprint (payload simplificado do dev)
// ============================================================
//
// Payload esperado:
// {
//   "sprintName": "Campanha Alpha",
//   "context": "Briefing e diretrizes do projeto...",
//   "tasks": [
//     { "agent": "MILA-01", "action": "Enviar email pra base inativa" },
//     { "agent": "DAVID-01", "action": "Ativar automação de recarga" }
//   ]
// }
//
// Campos opcionais por tarefa:
//   priority: "high" | "normal" | "low"  (default: "normal")
//   due_date: "2026-04-30"

app.post('/api/sprint', authOrApiKey, requireScope('sprint'), async (req, res) => {
  try {
    const { sprintName, context, tasks, team_id } = req.body;

    // Validações básicas
    if (!sprintName?.trim())
      return res.status(400).json({ error: '"sprintName" é obrigatório' });
    if (!Array.isArray(tasks) || tasks.length === 0)
      return res.status(400).json({ error: '"tasks" deve ser um array não vazio' });

    const results   = [];
    const errors    = [];
    const sprint    = sprintName.trim();
    const assignedBy = req.apiKey?.label || req.user?.email || 'system';

    // Busca o time (se informado)
    let team = null;
    if (team_id) {
      team = (await db.query('SELECT * FROM teams WHERE id = $1', [team_id])).rows[0] || null;
    }

    for (const t of tasks) {
      // Valida campos mínimos por tarefa
      if (!t.agent || !t.action) {
        errors.push({ task: t, error: '"agent" e "action" são obrigatórios por tarefa' });
        continue;
      }

      // Resolve o agente — aceita slug, id ou nome parcial (case-insensitive)
      const agentRow = (await db.query(`
        SELECT * FROM agents
        WHERE LOWER(id) = LOWER($1)
           OR LOWER(name) = LOWER($1)
        LIMIT 1
      `, [t.agent.trim()])).rows[0];

      if (!agentRow) {
        errors.push({ task: t, error: `Agente "${t.agent}" não encontrado` });
        continue;
      }

      // Insere a tarefa no banco
      const taskResult = await db.query(`
        INSERT INTO tasks
          (title, description, agent_id, team_id, priority, sprint, due_date, assigned_by, assigned_by_key, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING *
      `, [
        t.action.trim(),                          // title = action
        context?.trim() || '',                    // description = contexto global
        agentRow.id,
        team?.id || null,
        t.priority || 'normal',
        sprint,
        t.due_date || null,
        assignedBy,
        req.apiKeyPrefix || null
      ]);

      const task = {
        ...taskResult.rows[0],
        context: context?.trim() || '',
        team_name: team?.name || null
      };

      // Atualiza TASKS.md imediatamente
      let workspaceUpdated = false;
      let workspaceError   = null;
      try {
        appendTasksMd(agentRow.id, buildTaskBlock(task));
        workspaceUpdated = true;
      } catch (fsErr) {
        workspaceError = fsErr.message;
        console.warn(`[sprint] TASKS.md de ${agentRow.id} não atualizado: ${fsErr.message}`);
      }

      // Log
      await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)', [
        agentRow.id,
        'sprint_task_assigned',
        `Sprint "${sprint}" · "${t.action.trim()}" · ws:${workspaceUpdated}`
      ]);

      results.push({
        ok: true,
        agent: agentRow.id,
        agent_name: agentRow.name,
        task_id: task.id,
        title: task.title,
        workspace_updated: workspaceUpdated,
        workspace_error: workspaceError || undefined
      });
    }

    // Log global do sprint
    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)', [
      'system',
      'sprint_created',
      `Sprint "${sprint}" · ${results.length} tarefas criadas · ${errors.length} erros · via ${assignedBy}`
    ]);

    res.json({
      ok: true,
      sprint: sprintName,
      summary: {
        total:   tasks.length,
        created: results.length,
        failed:  errors.length
      },
      results,
      errors: errors.length ? errors : undefined
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});
