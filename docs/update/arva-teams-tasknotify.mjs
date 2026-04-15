// ============================================================
// ARVA — Teams & Task Notification System
// Adicionar ao api.mjs ANTES do app.listen()
// Grupo Facebrasil · Abril 2026
// ============================================================
//
// BLOCO 1 — TEAMS (entidade + CRUD + membros)
// BLOCO 2 — TASK NOTIFY (atribuição de tarefa → TASKS.md imediato)
//
// ── SQL de setup (rodar uma vez no PostgreSQL):
//
// CREATE TABLE IF NOT EXISTS teams (
//   id          SERIAL PRIMARY KEY,
//   slug        VARCHAR(80) UNIQUE NOT NULL,
//   name        VARCHAR(200) NOT NULL,
//   description TEXT,
//   color       VARCHAR(20) DEFAULT '#6366F1',
//   icon        VARCHAR(10) DEFAULT '👥',
//   created_at  TIMESTAMP DEFAULT NOW(),
//   updated_at  TIMESTAMP DEFAULT NOW()
// );
//
// CREATE TABLE IF NOT EXISTS team_members (
//   id         SERIAL PRIMARY KEY,
//   team_id    INTEGER REFERENCES teams(id) ON DELETE CASCADE,
//   agent_id   VARCHAR(100) NOT NULL,
//   role       VARCHAR(80) DEFAULT 'member',   -- 'lead' | 'member' | 'observer'
//   joined_at  TIMESTAMP DEFAULT NOW(),
//   UNIQUE(team_id, agent_id)
// );
//
// -- Índices para performance
// CREATE INDEX IF NOT EXISTS idx_team_members_agent ON team_members(agent_id);
// CREATE INDEX IF NOT EXISTS idx_team_members_team  ON team_members(team_id);
//
// -- Coluna extra em tasks para suportar atribuição a time
// ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
// ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint   VARCHAR(100);
// ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
// ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(100);
// ============================================================

import fs   from 'fs';
import path from 'path';

// Helper: caminho do TASKS.md de um agente no workspace OpenClaw
function tasksPath(agentSlug) {
  const base = process.env.OPENCLAW_WORKSPACE_BASE || '/home/openclaw/.openclaw';
  return path.join(base, `workspace-${agentSlug}`, 'TASKS.md');
}

// Helper: gerar bloco markdown de uma tarefa atribuída
function taskBlock(task, agentSlug) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const due  = task.due_date ? `\n- **Prazo:** ${task.due_date}` : '';
  const sprint = task.sprint ? `\n- **Sprint:** ${task.sprint}` : '';
  const team = task.team_name ? `\n- **Time:** ${task.team_name}` : '';
  const by   = task.assigned_by ? `\n- **Atribuído por:** ${task.assigned_by}` : '';
  const prio = task.priority || 'normal';
  const prioIcon = { high: '🔴', normal: '🟡', low: '🟢' }[prio] || '🟡';

  return `
## [TASK-${task.id}] ${task.title}
> Adicionada automaticamente em ${now}

- **Status:** ${task.status || 'pending'}
- **Prioridade:** ${prioIcon} ${prio}${due}${sprint}${team}${by}

### Descrição
${task.description || '_Sem descrição adicional._'}

---
`;
}

// Helper: sobrescrever / acrescentar ao TASKS.md do agente
async function appendToTasksMd(agentSlug, task, taskContent) {
  const filePath = tasksPath(agentSlug);

  // Se o arquivo não existe, cria com cabeçalho
  if (!fs.existsSync(filePath)) {
    const header = `# TASKS.md — ${agentSlug}\n> Gerenciado automaticamente pelo OpenClaw · Não editar manualmente\n\n---\n`;
    fs.writeFileSync(filePath, header, 'utf8');
  }

  // Acrescenta o bloco da nova tarefa
  fs.appendFileSync(filePath, taskContent, 'utf8');
}

// ============================================================
// BLOCO 1 — TEAMS
// ============================================================

// ── Listar todos os times
app.get('/api/teams', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*,
             COUNT(tm.id)::int AS member_count
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
      GROUP BY t.id
      ORDER BY t.name
    `);
    res.json({ ok: true, teams: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Criar time
app.post('/api/teams', auth, async (req, res) => {
  try {
    const { name, slug, description, color, icon } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name e slug são obrigatórios' });

    const result = await db.query(`
      INSERT INTO teams (slug, name, description, color, icon)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [slug.toLowerCase().replace(/\s+/g, '-'), name, description || '', color || '#6366F1', icon || '👥']);

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
      ['system', 'team_created', `Time criado: ${name} (${slug})`]);

    res.json({ ok: true, team: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Slug já existe' });
    res.status(500).json({ error: e.message });
  }
});

// ── Buscar time por ID (com membros)
app.get('/api/teams/:id', auth, async (req, res) => {
  try {
    const team = (await db.query('SELECT * FROM teams WHERE id = $1', [req.params.id])).rows[0];
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });

    const members = (await db.query(`
      SELECT tm.agent_id, tm.role, tm.joined_at,
             a.name AS agent_name, a.color AS agent_color, a.active
      FROM team_members tm
      LEFT JOIN agents a ON a.id = tm.agent_id
      WHERE tm.team_id = $1
      ORDER BY tm.role DESC, tm.joined_at
    `, [req.params.id])).rows;

    res.json({ ok: true, team: { ...team, members } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Atualizar time
app.put('/api/teams/:id', auth, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    const result = await db.query(`
      UPDATE teams SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        color       = COALESCE($3, color),
        icon        = COALESCE($4, icon),
        updated_at  = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, description, color, icon, req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Time não encontrado' });
    res.json({ ok: true, team: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Deletar time
app.delete('/api/teams/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Adicionar agente ao time
app.post('/api/teams/:id/members', auth, async (req, res) => {
  try {
    const { agent_id, role = 'member' } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id é obrigatório' });

    const agent = (await db.query('SELECT * FROM agents WHERE id = $1', [agent_id])).rows[0];
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });

    const team = (await db.query('SELECT * FROM teams WHERE id = $1', [req.params.id])).rows[0];
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });

    await db.query(`
      INSERT INTO team_members (team_id, agent_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, agent_id) DO UPDATE SET role = $3
    `, [req.params.id, agent_id, role]);

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
      [agent_id, 'team_joined', `Adicionado ao time: ${team.name} como ${role}`]);

    res.json({ ok: true, message: `${agent.name} adicionado ao time ${team.name}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Remover agente do time
app.delete('/api/teams/:id/members/:agentId', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM team_members WHERE team_id = $1 AND agent_id = $2',
      [req.params.id, req.params.agentId]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Listar times de um agente específico
app.get('/api/agents/:id/teams', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, tm.role, tm.joined_at
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.agent_id = $1
      ORDER BY t.name
    `, [req.params.id]);
    res.json({ ok: true, teams: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// BLOCO 2 — TASK NOTIFY (atribuição → TASKS.md imediato)
// ============================================================

// ── Atribuir tarefa a um agente (grava no banco + TASKS.md)
app.post('/api/tasks/assign', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      agent_id,          // agente responsável
      team_id,           // opcional — time associado
      priority = 'normal',
      sprint,
      due_date,
      assigned_by,
      status = 'pending'
    } = req.body;

    if (!title)    return res.status(400).json({ error: 'title é obrigatório' });
    if (!agent_id) return res.status(400).json({ error: 'agent_id é obrigatório' });

    // Busca o agente
    const agent = (await db.query('SELECT * FROM agents WHERE id = $1', [agent_id])).rows[0];
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });

    // Busca o time (se fornecido)
    let team = null;
    if (team_id) {
      team = (await db.query('SELECT * FROM teams WHERE id = $1', [team_id])).rows[0];
    }

    // Grava a tarefa no banco
    const taskResult = await db.query(`
      INSERT INTO tasks (title, description, agent_id, team_id, priority, sprint, due_date, assigned_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [title, description || '', agent_id, team_id || null, priority, sprint || null, due_date || null, assigned_by || null, status]);

    const task = { ...taskResult.rows[0], team_name: team?.name || null };

    // Gera o bloco markdown e atualiza TASKS.md imediatamente
    const mdBlock = taskBlock(task, agent.id);
    let workspaceUpdated = false;
    let workspaceError = null;

    try {
      await appendToTasksMd(agent.id, task, mdBlock);
      workspaceUpdated = true;
    } catch (fsErr) {
      // Não falha a request se o workspace não estiver acessível
      workspaceError = fsErr.message;
      console.warn(`[task-notify] Não foi possível atualizar TASKS.md de ${agent.id}: ${fsErr.message}`);
    }

    // Log da operação
    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)', [
      agent_id,
      'task_assigned',
      `Tarefa "${title}" atribuída${team ? ` (time: ${team.name})` : ''}${sprint ? ` · sprint: ${sprint}` : ''} · workspace_updated: ${workspaceUpdated}`
    ]);

    res.json({
      ok: true,
      task,
      workspace_updated: workspaceUpdated,
      workspace_error: workspaceError || undefined,
      tasks_md_path: tasksPath(agent.id)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Atribuir sprint inteiro a um time (notifica todos os membros)
app.post('/api/tasks/assign-sprint', auth, async (req, res) => {
  try {
    const { sprint, tasks: taskList, team_id, assigned_by } = req.body;
    if (!sprint)    return res.status(400).json({ error: 'sprint é obrigatório' });
    if (!taskList?.length) return res.status(400).json({ error: 'tasks[] é obrigatório' });

    const results = [];

    for (const t of taskList) {
      if (!t.agent_id || !t.title) {
        results.push({ error: 'agent_id e title obrigatórios por tarefa', task: t });
        continue;
      }

      const agent = (await db.query('SELECT * FROM agents WHERE id = $1', [t.agent_id])).rows[0];
      if (!agent) { results.push({ error: 'Agente não encontrado', agent_id: t.agent_id }); continue; }

      let team = null;
      if (team_id) team = (await db.query('SELECT * FROM teams WHERE id = $1', [team_id])).rows[0];

      const taskResult = await db.query(`
        INSERT INTO tasks (title, description, agent_id, team_id, priority, sprint, due_date, assigned_by, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING *
      `, [t.title, t.description || '', t.agent_id, team_id || null, t.priority || 'normal', sprint, t.due_date || null, assigned_by || null]);

      const task = { ...taskResult.rows[0], team_name: team?.name || null };
      const mdBlock = taskBlock(task, agent.id);

      let wsOk = false;
      try { await appendToTasksMd(agent.id, task, mdBlock); wsOk = true; } catch {}

      await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)', [
        t.agent_id, 'sprint_task_assigned', `Sprint "${sprint}" · "${t.title}" · ws: ${wsOk}`
      ]);

      results.push({ ok: true, task, workspace_updated: wsOk });
    }

    res.json({ ok: true, sprint, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Listar tarefas de um time
app.get('/api/teams/:id/tasks', auth, async (req, res) => {
  try {
    const { sprint, status } = req.query;
    let q = 'SELECT t.*, a.name AS agent_name FROM tasks t LEFT JOIN agents a ON a.id = t.agent_id WHERE t.team_id = $1';
    const params = [req.params.id];
    if (sprint) { params.push(sprint); q += ` AND t.sprint = $${params.length}`; }
    if (status) { params.push(status); q += ` AND t.status = $${params.length}`; }
    q += ' ORDER BY t.created_at DESC';

    const result = await db.query(q, params);
    res.json({ ok: true, tasks: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Ver o TASKS.md atual de um agente (debug / leitura)
app.get('/api/agents/:id/tasks-md', auth, async (req, res) => {
  try {
    const agent = (await db.query('SELECT * FROM agents WHERE id = $1', [req.params.id])).rows[0];
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });

    const filePath = tasksPath(agent.id);
    if (!fs.existsSync(filePath)) return res.json({ ok: true, content: '', exists: false });

    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ ok: true, content, exists: true, path: filePath });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
