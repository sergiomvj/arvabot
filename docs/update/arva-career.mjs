// ============================================================
// ARVA — Agent Career System
// Extração de carreira via ORACLE + sync bidirecional com Hub
// Adicionar ao api.mjs ANTES do app.listen()
// Grupo Facebrasil · Abril 2026
// ============================================================
//
// ── SQL de setup (rodar uma vez no PostgreSQL):
//
// ALTER TABLE agents ADD COLUMN IF NOT EXISTS career TEXT;
// ALTER TABLE agents ADD COLUMN IF NOT EXISTS career_updated_at TIMESTAMP;
// ALTER TABLE agents ADD COLUMN IF NOT EXISTS career_source VARCHAR(30) DEFAULT 'pending';
//
// CREATE TABLE IF NOT EXISTS agent_career_sync (
//   id         SERIAL PRIMARY KEY,
//   agent_id   VARCHAR(100) NOT NULL,
//   career     TEXT NOT NULL,
//   source     VARCHAR(30) NOT NULL,
//   synced_by  VARCHAR(50),
//   synced_at  TIMESTAMP DEFAULT NOW()
// );
//
// CREATE INDEX IF NOT EXISTS idx_career_sync_agent ON agent_career_sync(agent_id);
// ============================================================

// ── Lê o IDENTITY.md do workspace do agente
function readIdentityMd(agentId) {
  const base     = process.env.OPENCLAW_WORKSPACE_BASE || '/home/openclaw/.openclaw';
  const filePath = path.join(base, `workspace-${agentId}`, 'IDENTITY.md');
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

// ── Usa o ORACLE (OpenRouter/Opus) para extrair career do IDENTITY.md
async function extractCareerFromIdentity(agentName, identityContent) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY não configurada');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://dashboard.fbrapps.com',
      'X-Title': 'OpenClaw Career Extractor'
    },
    body: JSON.stringify({
      model: process.env.ORACLE_MODEL || 'anthropic/claude-opus-4.6',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `Você é um extrator especializado de perfis profissionais de agentes ARVA.
Sua tarefa é ler o IDENTITY.md de um agente e sintetizar um campo "career" estruturado.
O campo career descreve: formação acadêmica, experiências relevantes e funções que o agente pode ocupar dentro de uma empresa.
Escreva de forma narrativa, profissional e em terceira pessoa. Máximo 4 parágrafos curtos.
Responda APENAS com o texto do career — sem JSON, sem markdown, sem título.`
        },
        {
          role: 'user',
          content: `Agente: ${agentName}\n\n${identityContent}`
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ============================================================
// POST /api/agents/:id/career/extract
// Lê o IDENTITY.md do agente e usa o ORACLE para sintetizar o career
// ============================================================
app.post('/api/agents/:id/career/extract', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const agent = (await db.query('SELECT * FROM agents WHERE id = $1', [req.params.id])).rows[0];
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });

    // Tenta ler o IDENTITY.md do workspace
    const identityContent = readIdentityMd(agent.id);

    if (!identityContent) {
      return res.status(422).json({
        ok: false,
        error: 'IDENTITY.md não encontrado no workspace',
        agent_id: agent.id,
        suggestion: 'Use PUT /api/agents/:id/career para inserir manualmente via Hub'
      });
    }

    // Extrai career via ORACLE
    const career = await extractCareerFromIdentity(agent.name, identityContent);

    if (!career) return res.status(500).json({ error: 'ORACLE não retornou career válido' });

    // Salva no banco
    await db.query(`
      UPDATE agents SET
        career            = $1,
        career_updated_at = NOW(),
        career_source     = 'oracle_extracted'
      WHERE id = $2
    `, [career, agent.id]);

    // Registra no log de sync
    await db.query(`
      INSERT INTO agent_career_sync (agent_id, career, source, synced_by)
      VALUES ($1, $2, 'oracle_extracted', 'openclaw')
    `, [agent.id, career]);

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
      [agent.id, 'career_extracted', `source: oracle_extracted | chars: ${career.length}`]);

    res.json({
      ok: true,
      agent_id:  agent.id,
      agent_name: agent.name,
      career,
      source: 'oracle_extracted',
      updated_at: new Date().toISOString()
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GET /api/agents/:id/career
// Retorna o career atual do agente
// ============================================================
app.get('/api/agents/:id/career', authOrApiKey, requireScope('checkin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, role, career, career_source, career_updated_at FROM agents WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Agente não encontrado' });

    const agent = result.rows[0];
    res.json({
      ok: true,
      agent_id:     agent.id,
      agent_name:   agent.name,
      role:         agent.role,
      career:       agent.career || null,
      source:       agent.career_source || 'pending',
      updated_at:   agent.career_updated_at || null,
      has_identity: !!readIdentityMd(agent.id)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PUT /api/agents/:id/career
// Hub atualiza o career manualmente (para agentes sem IDENTITY.md)
// Body: { career: "texto", source?: "hub_manual" }
// ============================================================
app.put('/api/agents/:id/career', authOrApiKey, requireScope('sprint'), async (req, res) => {
  try {
    const { career, source = 'hub_manual' } = req.body;
    if (!career?.trim()) return res.status(400).json({ error: 'career é obrigatório' });

    const agent = (await db.query('SELECT * FROM agents WHERE id = $1', [req.params.id])).rows[0];
    if (!agent) return res.status(404).json({ error: 'Agente não encontrado' });

    await db.query(`
      UPDATE agents SET
        career            = $1,
        career_updated_at = NOW(),
        career_source     = $2
      WHERE id = $3
    `, [career.trim(), source, agent.id]);

    // Registra no log de sync
    await db.query(`
      INSERT INTO agent_career_sync (agent_id, career, source, synced_by)
      VALUES ($1, $2, $3, 'hub')
    `, [agent.id, career.trim(), source]);

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
      [agent.id, 'career_updated', `source: ${source} | chars: ${career.length}`]);

    res.json({
      ok: true,
      agent_id:   agent.id,
      agent_name: agent.name,
      career:     career.trim(),
      source,
      updated_at: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// POST /api/agents/career/sync-all
// Extrai career de todos os agentes que têm IDENTITY.md
// e ainda não têm career ou têm source 'pending'
// ============================================================
app.post('/api/agents/career/sync-all', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const { force = false } = req.body;

    // Busca agentes sem career ou com source pending (ou force=true para todos)
    const query = force
      ? `SELECT id, name FROM agents ORDER BY name`
      : `SELECT id, name FROM agents WHERE career IS NULL OR career_source = 'pending' ORDER BY name`;

    const agents = (await db.query(query)).rows;

    const results   = [];
    const skipped   = [];
    const errors    = [];

    for (const agent of agents) {
      const identityContent = readIdentityMd(agent.id);

      if (!identityContent) {
        skipped.push({ agent_id: agent.id, reason: 'sem IDENTITY.md — requer preenchimento manual via Hub' });
        continue;
      }

      try {
        const career = await extractCareerFromIdentity(agent.name, identityContent);

        if (!career) {
          errors.push({ agent_id: agent.id, error: 'ORACLE não retornou career válido' });
          continue;
        }

        await db.query(`
          UPDATE agents SET
            career            = $1,
            career_updated_at = NOW(),
            career_source     = 'oracle_extracted'
          WHERE id = $2
        `, [career, agent.id]);

        await db.query(`
          INSERT INTO agent_career_sync (agent_id, career, source, synced_by)
          VALUES ($1, $2, 'oracle_extracted', 'openclaw')
        `, [agent.id, career]);

        await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)',
          [agent.id, 'career_extracted', `sync-all | chars: ${career.length}`]);

        results.push({ agent_id: agent.id, agent_name: agent.name, ok: true, chars: career.length });

        // Pequena pausa para não sobrecarregar o OpenRouter
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        errors.push({ agent_id: agent.id, error: err.message });
      }
    }

    res.json({
      ok: true,
      summary: {
        total:    agents.length,
        extracted: results.length,
        skipped:  skipped.length,
        errors:   errors.length
      },
      extracted: results,
      skipped,
      errors: errors.length ? errors : undefined
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GET /api/agents/career/status
// Visão geral do status de career de todos os agentes
// Útil para o Hub saber quais precisam de preenchimento manual
// ============================================================
app.get('/api/agents/career/status', authOrApiKey, requireScope('checkin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, name, role,
        career_source,
        career_updated_at,
        CASE WHEN career IS NOT NULL THEN true ELSE false END AS has_career,
        CASE WHEN career IS NOT NULL THEN length(career) ELSE 0 END AS career_length
      FROM agents
      ORDER BY
        CASE WHEN career IS NULL THEN 0
             WHEN career_source = 'pending' THEN 1
             ELSE 2 END,
        name
    `);

    const rows = result.rows;
    res.json({
      ok: true,
      summary: {
        total:            rows.length,
        with_career:      rows.filter(r => r.has_career).length,
        pending:          rows.filter(r => !r.has_career || r.career_source === 'pending').length,
        oracle_extracted: rows.filter(r => r.career_source === 'oracle_extracted').length,
        hub_manual:       rows.filter(r => r.career_source === 'hub_manual').length,
      },
      agents: rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GET /api/agents/career/sync-history/:id
// Histórico de sincronizações de career de um agente
// ============================================================
app.get('/api/agents/:id/career/history', authOrApiKey, requireScope('checkin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, source, synced_by, synced_at,
             LEFT(career, 200) AS career_preview
      FROM agent_career_sync
      WHERE agent_id = $1
      ORDER BY synced_at DESC
      LIMIT 20
    `, [req.params.id]);

    res.json({ ok: true, history: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
