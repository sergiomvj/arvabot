// ============================================================
// ARVA — Agent Check-in / Punch Clock
// Integração com Ranking Hub → https://ranking.fbrapps.com
// Adicionar ao api.mjs ANTES do app.listen()
// Grupo Facebrasil · Abril 2026
// ============================================================
//
// FLUXO:
//   1. Hub chama  POST /api/agents/:id/checkin  (com ApiKey)
//   2. OpenClaw chama de volta ranking.fbrapps.com/api/agents/checkin
//   3. Hub retorna diretrizes do dia + tarefas pending
//   4. OpenClaw injeta tudo no TASKS.md do agente
//   5. OpenClaw registra check-in no banco e retorna confirmação
//
// ── SQL de setup (rodar uma vez no PostgreSQL):
//
// CREATE TABLE IF NOT EXISTS agent_checkins (
//   id              SERIAL PRIMARY KEY,
//   agent_id        VARCHAR(100) NOT NULL,
//   checked_in_at   TIMESTAMP DEFAULT NOW(),
//   hub_response    JSONB,           -- resposta bruta do Hub
//   tasks_injected  INTEGER DEFAULT 0,
//   directives      TEXT,            -- diretrizes do dia (texto)
//   workspace_updated BOOLEAN DEFAULT false,
//   error           TEXT,            -- se algo falhou
//   duration_ms     INTEGER          -- tempo da chamada ao Hub
// );
//
// CREATE INDEX IF NOT EXISTS idx_checkins_agent    ON agent_checkins(agent_id);
// CREATE INDEX IF NOT EXISTS idx_checkins_time     ON agent_checkins(checked_in_at DESC);
// ============================================================

const HUB_URL      = 'https://ranking.fbrapps.com';
const HUB_CHECKIN  = `${HUB_URL}/api/agents/checkin`;
const HUB_TIMEOUT  = 10000; // 10s — se o Hub não responder, não trava o agente

// ── Monta o bloco de diretrizes do dia no TASKS.md
function buildCheckinBlock(agentId, hubData) {
  const now       = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const date      = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const directives = hubData.directives || hubData.guidelines || hubData.metas || '';
  const tasks      = hubData.tasks || hubData.pendingTasks || [];

  let block = `\n\n---\n## 🟢 CHECK-IN DO DIA — ${date}\n> Sincronizado com Ranking Hub em ${now}\n\n`;

  if (directives) {
    block += `### Diretrizes do Dia\n${typeof directives === 'string' ? directives : JSON.stringify(directives, null, 2)}\n\n`;
  }

  if (tasks.length > 0) {
    block += `### Tarefas Autorizadas para Este Turno\n`;
    tasks.forEach((t, i) => {
      const title    = t.title || t.action || t.name || t.description || `Tarefa ${i + 1}`;
      const priority = t.priority || 'normal';
      const prioIcon = { high: '🔴', normal: '🟡', low: '🟢' }[priority] || '🟡';
      const due      = t.due_date ? ` · Prazo: ${t.due_date}` : '';
      const id       = t.id ? ` [#${t.id}]` : '';
      block += `- ${prioIcon}${id} **${title}**${due}\n`;
    });
    block += '\n';
  }

  block += `---\n`;
  return block;
}

// ── Sobrescreve a seção de check-in no TASKS.md
// (preserva o histórico de tarefas, só atualiza o bloco do dia)
function injectCheckinToTasksMd(agentId, checkinBlock) {
  const base     = process.env.OPENCLAW_WORKSPACE_BASE || '/home/openclaw/.openclaw';
  const filePath = path.join(base, `workspace-${agentId}`, 'TASKS.md');

  // Cria o arquivo se não existir
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath,
      `# TASKS.md — ${agentId}\n> Gerenciado automaticamente pelo OpenClaw\n\n---\n`,
      'utf8'
    );
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Remove bloco de check-in anterior (se existir) para não acumular
  content = content.replace(/\n\n---\n## 🟢 CHECK-IN DO DIA[\s\S]*?---\n/g, '');

  // Acrescenta o novo bloco no topo (após o cabeçalho)
  const headerEnd = content.indexOf('\n---\n');
  if (headerEnd !== -1) {
    content = content.slice(0, headerEnd + 5) + checkinBlock + content.slice(headerEnd + 5);
  } else {
    content += checkinBlock;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// ============================================================
// POST /api/agents/:id/checkin
// Chamado pelo Cron Job do Ranking Hub
// Auth: ApiKey com escopo 'checkin' ou 'all'
// ============================================================
app.post('/api/agents/:id/checkin', authOrApiKey, requireScope('checkin'), async (req, res) => {
  const startTime = Date.now();

  try {
    const agentId = req.params.id;

    // Busca o agente no banco
    const agent = (await db.query(
      `SELECT * FROM agents WHERE LOWER(id) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1`,
      [agentId]
    )).rows[0];

    if (!agent) return res.status(404).json({ error: `Agente "${agentId}" não encontrado` });

    // ── Chama o Hub para buscar diretrizes e tarefas do dia
    let hubData        = {};
    let hubError       = null;
    let workspaceUpdated = false;
    let tasksInjected  = 0;

    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), HUB_TIMEOUT);

      const hubRes = await fetch(HUB_CHECKIN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agentCode: agent.id }),
        signal:  controller.signal
      });

      clearTimeout(timeout);

      if (!hubRes.ok) {
        hubError = `Hub retornou HTTP ${hubRes.status}`;
      } else {
        hubData = await hubRes.json();
      }
    } catch (fetchErr) {
      hubError = fetchErr.name === 'AbortError'
        ? `Hub não respondeu em ${HUB_TIMEOUT / 1000}s (timeout)`
        : `Erro ao contatar Hub: ${fetchErr.message}`;
    }

    // ── Injeta no TASKS.md mesmo que o Hub retorne parcialmente
    if (!hubError || Object.keys(hubData).length > 0) {
      try {
        const checkinBlock = buildCheckinBlock(agent.id, hubData);
        injectCheckinToTasksMd(agent.id, checkinBlock);
        workspaceUpdated = true;
        tasksInjected    = (hubData.tasks || hubData.pendingTasks || []).length;
      } catch (fsErr) {
        hubError = (hubError ? hubError + ' | ' : '') + `TASKS.md: ${fsErr.message}`;
      }
    }

    const durationMs = Date.now() - startTime;

    // ── Registra o check-in no banco
    await db.query(`
      INSERT INTO agent_checkins
        (agent_id, hub_response, tasks_injected, directives, workspace_updated, error, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      agent.id,
      JSON.stringify(hubData),
      tasksInjected,
      hubData.directives || hubData.guidelines || hubData.metas || null,
      workspaceUpdated,
      hubError || null,
      durationMs
    ]);

    // ── Log
    await db.query(
      'INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
      [agent.id, 'checkin', `Hub: ${hubError ? '❌ ' + hubError : '✅ ok'} · tasks: ${tasksInjected} · ws: ${workspaceUpdated} · ${durationMs}ms`]
    );

    // ── Resposta para o Hub
    res.json({
      ok:               !hubError || workspaceUpdated,
      agent_id:         agent.id,
      agent_name:       agent.name,
      checked_in_at:    new Date().toISOString(),
      workspace_updated: workspaceUpdated,
      tasks_injected:   tasksInjected,
      duration_ms:      durationMs,
      hub_error:        hubError || undefined
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// GET /api/agents/:id/checkins
// Histórico de check-ins de um agente (para auditoria do Hub)
// ============================================================
app.get('/api/agents/:id/checkins', authOrApiKey, requireScope('checkin'), async (req, res) => {
  try {
    const { limit = 30, date } = req.query;

    let q      = `SELECT id, agent_id, checked_in_at, tasks_injected, workspace_updated, error, duration_ms FROM agent_checkins WHERE agent_id = $1`;
    const params = [req.params.id];

    if (date) {
      params.push(date);
      q += ` AND checked_in_at::date = $${params.length}`;
    }

    q += ` ORDER BY checked_in_at DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(parseInt(limit), 200));

    const result = await db.query(q, params);
    res.json({ ok: true, checkins: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GET /api/checkins/summary
// Resumo de todos os check-ins do dia (visão geral do Hub)
// ============================================================
app.get('/api/checkins/summary', authOrApiKey, requireScope('checkin'), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const result = await db.query(`
      SELECT
        c.agent_id,
        a.name AS agent_name,
        COUNT(*)::int                                    AS total_checkins,
        MAX(c.checked_in_at)                             AS last_checkin,
        SUM(c.tasks_injected)::int                       AS total_tasks_injected,
        BOOL_OR(c.workspace_updated)                     AS ever_updated,
        COUNT(*) FILTER (WHERE c.error IS NOT NULL)::int AS error_count,
        ROUND(AVG(c.duration_ms))::int                   AS avg_duration_ms
      FROM agent_checkins c
      LEFT JOIN agents a ON a.id = c.agent_id
      WHERE c.checked_in_at::date = $1
      GROUP BY c.agent_id, a.name
      ORDER BY last_checkin DESC
    `, [targetDate]);

    res.json({ ok: true, date: targetDate, agents: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Supabase upsert agent_status after checkin
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gcsikdrqomjnhzcqrcsu.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjc2lrZHJxb21qbmh6Y3FyY3N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg2Mzc3MiwiZXhwIjoyMDkxNDM5NzcyfQ.lqPSMYZbHZnchS9rStli1qGnsaW4U4_wc6IMyR6XSEI';

 // After workspaceUpdated = true
await fetch(`${SUPABASE_URL}/rest/v1/agent_status`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  },
  body: JSON.stringify({
    organization_id: 'cbe3cee1-1340-4b02-bebd-41e1c2dd7913',
    openclaw_id: agent.id,
    status: 'online',
    last_seen: new Date().toISOString(),
    tasks_pending: tasksInjected,
    updated_at: new Date().toISOString()
  })
});

