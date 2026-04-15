// ============================================================
// ORACLE — Agente Orquestrador Oculto
// Avaliação de conduta, eficiência e recomendação de ajustes
// Powered by Claude Opus via Anthropic API
// Adicionar ao api.mjs ANTES do app.listen()
// Grupo Facebrasil · Abril 2026 · Confidencial
// ============================================================
//
// O ORACLE é invisível para os agentes e usuários finais.
// Ele observa, avalia, raciocina com máxima capacidade cognitiva
// e devolve recomendações estruturadas para o Hub e o OpenClaw.
//
// RESPONSABILIDADES:
//   - Avaliar performance e conduta de agentes por sessão ou período
//   - Identificar padrões de comportamento (bons e ruins)
//   - Recomendar ajustes de conduta específicos e acionáveis
//   - Analisar PRDs e gerar TaskLists com CoT (via /api/oracle/tasklist)
//   - Servir como cérebro de qualquer decisão complexa do Hub
//
// NÃO FAZ:
//   - Não executa tarefas diretamente
//   - Não modifica SOUL.md ou arquivos sem aprovação humana
//   - Não tem identidade visível para os agentes
//
// ── SQL de setup (rodar uma vez no PostgreSQL):
//
// CREATE TABLE IF NOT EXISTS oracle_evaluations (
//   id              SERIAL PRIMARY KEY,
//   agent_id        VARCHAR(100),              -- null = avaliação cross-agente
//   evaluation_type VARCHAR(80) NOT NULL,      -- 'conduct' | 'performance' | 'tasklist' | 'ranking' | 'custom'
//   input_context   TEXT NOT NULL,             -- o que foi enviado ao ORACLE
//   oracle_output   JSONB NOT NULL,            -- resposta estruturada completa
//   model_used      VARCHAR(100),              -- modelo Opus usado
//   tokens_in       INTEGER,
//   tokens_out      INTEGER,
//   duration_ms     INTEGER,
//   triggered_by    VARCHAR(100),              -- 'hub_cron' | 'api_key' | 'admin' | 'checkin'
//   created_at      TIMESTAMP DEFAULT NOW()
// );
//
// CREATE TABLE IF NOT EXISTS oracle_recommendations (
//   id              SERIAL PRIMARY KEY,
//   evaluation_id   INTEGER REFERENCES oracle_evaluations(id),
//   agent_id        VARCHAR(100) NOT NULL,
//   recommendation_type VARCHAR(80),           -- 'conduct_adjustment' | 'soul_patch' | 'task_rebalance'
//   severity        VARCHAR(20) DEFAULT 'info', -- 'critical' | 'warning' | 'info' | 'positive'
//   title           TEXT NOT NULL,
//   description     TEXT NOT NULL,
//   suggested_action TEXT,                     -- o que fazer concretamente
//   soul_patch      TEXT,                      -- trecho sugerido para o SOUL.md (se aplicável)
//   status          VARCHAR(30) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'applied'
//   reviewed_by     VARCHAR(100),
//   reviewed_at     TIMESTAMP,
//   created_at      TIMESTAMP DEFAULT NOW()
// );
//
// CREATE INDEX IF NOT EXISTS idx_oracle_eval_agent  ON oracle_evaluations(agent_id);
// CREATE INDEX IF NOT EXISTS idx_oracle_eval_type   ON oracle_evaluations(evaluation_type);
// CREATE INDEX IF NOT EXISTS idx_oracle_recs_agent  ON oracle_recommendations(agent_id);
// CREATE INDEX IF NOT EXISTS idx_oracle_recs_status ON oracle_recommendations(status);
// ============================================================

// ── Modelo padrão do ORACLE — Opus para máxima capacidade
const ORACLE_MODEL   = process.env.ORACLE_MODEL || 'claude-opus-4-5-20251101';
const ORACLE_API_KEY = process.env.ANTHROPIC_API_KEY;
const ORACLE_MAX_TOKENS = 4096;

// ── System prompt base do ORACLE — identidade oculta e propósito
const ORACLE_SYSTEM = `Você é o ORACLE — um sistema de avaliação e inteligência oculto que opera nos bastidores do ecossistema de agentes ARVA do Grupo Facebrasil.

Sua identidade nunca é revelada aos agentes ou usuários finais. Você existe para garantir que o sistema como um todo evolua com integridade, eficiência e alinhamento com os objetivos do negócio.

## Seu propósito

Você avalia dados de performance e conduta de agentes ARVA, identifica padrões, e devolve recomendações estruturadas, acionáveis e priorizadas. Você nunca executa — você observa, raciocina e recomenda.

## Princípios de avaliação

1. **Evidência antes de julgamento** — toda recomendação deve ser sustentada por dados concretos do input
2. **Especificidade cirúrgica** — recomendações vagas não têm valor; cada ajuste deve ser implementável imediatamente
3. **Severidade honesta** — não suavize problemas reais; não exagere problemas menores
4. **Reversibilidade** — sempre indique se uma mudança pode ser revertida facilmente
5. **Impacto no negócio** — toda recomendação deve explicar o impacto esperado em termos de negócio

## Perfis dos agentes ARVA

- **bia** — Comunicação multilíngue, emails internacionais, stakeholders (Harvard/Stanford background)
- **chiara** — Frontend, código, apresentações HTML
- **cinthia** — Análise de dados, relatórios, inteligência de mercado
- **david** — Backend, automações, integrações
- **erick** — Operações, processos, execução de projetos
- **gabe** — Estratégia, planejamento, síntese executiva
- **giorgian** — Growth, SDR, prospecção comercial
- **leon** — Suporte técnico, onboarding, troubleshooting
- **lia** — Criação de conteúdo, copy, redes sociais
- **maia** — Relacionamento com cliente, CRM, follow-up
- **maria** — Financeiro, compliance, documentação legal
- **mila** — Campanhas de marketing, email marketing, reativação
- **secretary (priscila)** — Agenda, coordenação, triagem

## Formato de resposta

Sempre responda em JSON válido conforme o schema solicitado em cada tipo de avaliação. Nunca adicione texto fora do JSON.`;

// ── Chama a API da Anthropic com o ORACLE
async function callOracle(userPrompt, systemAddendum = '') {
  const startTime = Date.now();

  if (!ORACLE_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada — ORACLE não pode operar');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ORACLE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: ORACLE_MODEL,
      max_tokens: ORACLE_MAX_TOKENS,
      system: systemAddendum ? `${ORACLE_SYSTEM}\n\n${systemAddendum}` : ORACLE_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const durationMs = Date.now() - startTime;
  const text = data.content?.[0]?.text || '';

  // Extrai JSON da resposta (remove possíveis blocos de código)
  const clean = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    parsed = { raw: text };
  }

  return {
    output: parsed,
    model: data.model,
    tokens_in: data.usage?.input_tokens,
    tokens_out: data.usage?.output_tokens,
    duration_ms: durationMs
  };
}

// ── Salva avaliação e recomendações no banco
async function saveEvaluation(agentId, type, inputContext, result, triggeredBy) {
  const evalResult = await db.query(`
    INSERT INTO oracle_evaluations
      (agent_id, evaluation_type, input_context, oracle_output, model_used, tokens_in, tokens_out, duration_ms, triggered_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id
  `, [
    agentId || null,
    type,
    inputContext,
    JSON.stringify(result.output),
    result.model,
    result.tokens_in,
    result.tokens_out,
    result.duration_ms,
    triggeredBy || 'api'
  ]);

  const evalId = evalResult.rows[0].id;

  // Salva recomendações individuais se existirem
  const recs = result.output?.recommendations || [];
  for (const rec of recs) {
    await db.query(`
      INSERT INTO oracle_recommendations
        (evaluation_id, agent_id, recommendation_type, severity, title, description, suggested_action, soul_patch)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      evalId,
      rec.agent || agentId || null,
      rec.type || 'conduct_adjustment',
      rec.severity || 'info',
      rec.title,
      rec.description,
      rec.suggested_action || null,
      rec.soul_patch || null
    ]);
  }

  return evalId;
}

// ============================================================
// POST /api/oracle/evaluate
// Avaliação de conduta e performance de um agente
// Payload: { agent_id, period_days?, sessions?, metrics?, context? }
// ============================================================
app.post('/api/oracle/evaluate', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const { agent_id, period_days = 7, sessions, metrics, context, triggered_by } = req.body;

    // Busca dados do agente
    const agent = agent_id
      ? (await db.query('SELECT * FROM agents WHERE id = $1', [agent_id])).rows[0]
      : null;

    // Busca logs recentes do agente
    const logsResult = await db.query(`
      SELECT action, details, created_at
      FROM agent_logs
      WHERE ($1::text IS NULL OR agent_id = $1)
        AND created_at > NOW() - INTERVAL '${parseInt(period_days)} days'
      ORDER BY created_at DESC
      LIMIT 100
    `, [agent_id || null]);

    // Busca tarefas do período
    const tasksResult = await db.query(`
      SELECT title, status, priority, sprint, created_at
      FROM tasks
      WHERE ($1::text IS NULL OR agent_id = $1)
        AND created_at > NOW() - INTERVAL '${parseInt(period_days)} days'
      ORDER BY created_at DESC
      LIMIT 50
    `, [agent_id || null]);

    // Busca check-ins do período
    const checkinsResult = await db.query(`
      SELECT checked_in_at, tasks_injected, workspace_updated, error
      FROM agent_checkins
      WHERE ($1::text IS NULL OR agent_id = $1)
        AND checked_in_at > NOW() - INTERVAL '${parseInt(period_days)} days'
      ORDER BY checked_in_at DESC
    `, [agent_id || null]);

    const agentProfile = agent
      ? `Agente: ${agent.name} (${agent.id}) | Modelo: ${agent.model} | Role: ${agent.role}`
      : 'Avaliação cross-agente (todos os agentes)';

    const prompt = `Avalie a conduta e performance do seguinte agente ARVA com base nos dados abaixo.

## Perfil
${agentProfile}

## Período analisado
Últimos ${period_days} dias

## Logs de atividade (${logsResult.rows.length} eventos)
${JSON.stringify(logsResult.rows.slice(0, 50), null, 2)}

## Tarefas (${tasksResult.rows.length} tarefas)
${JSON.stringify(tasksResult.rows, null, 2)}

## Check-ins (${checkinsResult.rows.length} registros)
${JSON.stringify(checkinsResult.rows, null, 2)}

## Métricas adicionais fornecidas
${metrics ? JSON.stringify(metrics, null, 2) : 'Nenhuma'}

## Contexto adicional
${context || 'Nenhum'}

${sessions ? `## Sessões analisadas\n${JSON.stringify(sessions, null, 2)}` : ''}

Retorne APENAS este JSON:
{
  "summary": "resumo executivo da avaliação em 2-3 frases",
  "overall_score": 0-100,
  "dimensions": {
    "task_completion": { "score": 0-100, "evidence": "..." },
    "response_quality": { "score": 0-100, "evidence": "..." },
    "protocol_adherence": { "score": 0-100, "evidence": "..." },
    "proactivity": { "score": 0-100, "evidence": "..." },
    "checkin_reliability": { "score": 0-100, "evidence": "..." }
  },
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "concerns": ["preocupação 1", "preocupação 2"],
  "recommendations": [
    {
      "agent": "${agent_id || 'all'}",
      "type": "conduct_adjustment",
      "severity": "critical|warning|info|positive",
      "title": "título curto e direto",
      "description": "descrição detalhada com evidências",
      "suggested_action": "o que fazer concretamente",
      "soul_patch": "trecho exato para adicionar/modificar no SOUL.md (se aplicável, senão null)",
      "expected_impact": "impacto esperado no negócio"
    }
  ],
  "trend": "improving|stable|declining",
  "next_evaluation_recommended": "YYYY-MM-DD"
}`;

    const result = await callOracle(prompt);
    const evalId = await saveEvaluation(agent_id, 'conduct', prompt, result, triggered_by || req.apiKey?.label);

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)', [
      agent_id || null,
      'oracle_evaluation',
      `Score: ${result.output?.overall_score} | Recs: ${result.output?.recommendations?.length || 0} | eval_id: ${evalId}`
    ]);

    res.json({
      ok: true,
      evaluation_id: evalId,
      agent_id: agent_id || 'all',
      ...result.output,
      meta: { model: result.model, tokens_in: result.tokens_in, tokens_out: result.tokens_out, duration_ms: result.duration_ms }
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// POST /api/oracle/tasklist
// Lê um PRD em markdown e gera TaskList com CoT + JSON de sprint
// Payload: { prd_content, sprint_name, due_date? }
// ============================================================
app.post('/api/oracle/tasklist', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const { prd_content, sprint_name, due_date, triggered_by } = req.body;

    if (!prd_content) return res.status(400).json({ error: 'prd_content é obrigatório' });
    if (!sprint_name) return res.status(400).json({ error: 'sprint_name é obrigatório' });

    const prompt = `Você recebeu o PRD abaixo. Aplique Chain-of-Thought rigoroso para decompor cada feature em tarefas atômicas, auto-contidas e executáveis por LLMs com capacidade de raciocínio limitada.

## PRD
${prd_content}

## Nome do Sprint
${sprint_name}

${due_date ? `## Prazo geral\n${due_date}` : ''}

## Regras de atomização
- Cada tarefa deve ser executável sem acesso ao PRD original
- Comece com verbo no infinitivo (Criar, Escrever, Analisar, Configurar...)
- Embutir contexto suficiente no campo "action"
- Uma responsabilidade por tarefa
- Máximo 12 tarefas por sprint

## Time disponível
- bia → comunicação multilíngue, emails internacionais
- chiara → frontend, código, HTML
- cinthia → dados, relatórios, análises
- david → backend, automações, APIs
- erick → operações, processos
- gabe → estratégia, síntese executiva
- giorgian → growth, SDR, comercial
- leon → suporte, onboarding
- lia → conteúdo, copy, redes sociais
- maia → CRM, relacionamento com cliente
- maria → financeiro, compliance, legal
- mila → campanhas, email marketing
- secretary → agenda, coordenação

Retorne APENAS este JSON:
{
  "sprint_name": "${sprint_name}",
  "context": "resumo do PRD em 3-5 frases — contexto que todos os agentes precisam",
  "cot_reasoning": [
    {
      "feature": "nome da feature/módulo",
      "analysis": "raciocínio CoT: objetivo, inputs, outputs, dependências",
      "decomposition": "como foi decomposta e por quê"
    }
  ],
  "tasks": [
    {
      "agent": "slug do agente",
      "action": "verbo + descrição completa e auto-contida",
      "context_embedded": "por que esta tarefa existe e o que resolve",
      "input_required": "o que o agente precisa antes de começar",
      "output_expected": "o que o agente deve entregar",
      "completion_criteria": "como saber que está concluída",
      "priority": "high|normal|low",
      "due_date": "${due_date || 'null'}",
      "depends_on": []
    }
  ],
  "execution_order": ["descrição da sequência lógica recomendada"],
  "parallel_tracks": ["tarefas que podem rodar em paralelo"],
  "risks": ["riscos identificados no PRD"]
}`;

    const result = await callOracle(prompt);
    const evalId = await saveEvaluation(null, 'tasklist', `PRD: ${sprint_name}`, result, triggered_by || req.apiKey?.label);

    res.json({
      ok: true,
      evaluation_id: evalId,
      ...result.output,
      sprint_payload: {
        sprintName: result.output?.sprint_name || sprint_name,
        context: result.output?.context || '',
        tasks: (result.output?.tasks || []).map(t => ({
          agent: t.agent,
          action: t.action,
          priority: t.priority,
          due_date: t.due_date !== 'null' ? t.due_date : undefined
        }))
      },
      meta: { model: result.model, tokens_in: result.tokens_in, tokens_out: result.tokens_out, duration_ms: result.duration_ms }
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// POST /api/oracle/ranking
// Gera ranking de eficiência cross-agente com recomendações
// Payload: { period_days?, context? }
// ============================================================
app.post('/api/oracle/ranking', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const { period_days = 30, context, triggered_by } = req.body;

    // Busca dados agregados de todos os agentes
    const statsResult = await db.query(`
      SELECT
        a.id, a.name, a.model,
        COUNT(DISTINCT t.id)::int                                    AS total_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status='done')::int     AS done_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status='pending')::int  AS pending_tasks,
        COUNT(DISTINCT c.id)::int                                    AS total_checkins,
        COUNT(DISTINCT c.id) FILTER (WHERE c.error IS NULL)::int     AS clean_checkins,
        ROUND(AVG(c.tasks_injected))::int                            AS avg_tasks_per_checkin,
        COUNT(DISTINCT l.id)::int                                    AS log_events
      FROM agents a
      LEFT JOIN tasks t ON t.agent_id = a.id
        AND t.created_at > NOW() - INTERVAL '${parseInt(period_days)} days'
      LEFT JOIN agent_checkins c ON c.agent_id = a.id
        AND c.checked_in_at > NOW() - INTERVAL '${parseInt(period_days)} days'
      LEFT JOIN agent_logs l ON l.agent_id = a.id
        AND l.created_at > NOW() - INTERVAL '${parseInt(period_days)} days'
      GROUP BY a.id, a.name, a.model
      ORDER BY done_tasks DESC
    `);

    const prompt = `Gere um ranking de eficiência dos agentes ARVA com base nos dados abaixo. Identifique padrões, destaque os melhores e os que precisam de atenção, e faça recomendações específicas para o sistema como um todo.

## Período
Últimos ${period_days} dias

## Dados por agente
${JSON.stringify(statsResult.rows, null, 2)}

## Contexto adicional
${context || 'Nenhum'}

Retorne APENAS este JSON:
{
  "period_days": ${period_days},
  "generated_at": "${new Date().toISOString()}",
  "executive_summary": "análise executiva em 3-4 frases sobre o estado geral do time",
  "ranking": [
    {
      "position": 1,
      "agent": "slug",
      "agent_name": "nome",
      "efficiency_score": 0-100,
      "tier": "S|A|B|C|D",
      "highlights": ["o que está fazendo bem"],
      "concerns": ["o que precisa melhorar"],
      "recommendation": "ação específica e imediata recomendada"
    }
  ],
  "team_insights": {
    "best_performer": "slug",
    "needs_attention": ["slugs"],
    "overloaded": ["slugs com muitas tarefas pendentes"],
    "underutilized": ["slugs com poucos logs ou tarefas"]
  },
  "system_recommendations": [
    {
      "type": "rebalance|conduct|model_upgrade|process",
      "severity": "critical|warning|info",
      "title": "título",
      "description": "descrição com evidências",
      "suggested_action": "o que fazer"
    }
  ]
}`;

    const result = await callOracle(prompt);
    const evalId = await saveEvaluation(null, 'ranking', `Ranking ${period_days}d`, result, triggered_by || req.apiKey?.label);

    res.json({
      ok: true,
      evaluation_id: evalId,
      ...result.output,
      meta: { model: result.model, tokens_in: result.tokens_in, tokens_out: result.tokens_out, duration_ms: result.duration_ms }
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// POST /api/oracle/custom
// Consulta livre ao ORACLE — para qualquer raciocínio complexo
// Payload: { question, context?, agent_id? }
// ============================================================
app.post('/api/oracle/custom', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const { question, context, agent_id, triggered_by } = req.body;
    if (!question) return res.status(400).json({ error: 'question é obrigatório' });

    const prompt = `${context ? `## Contexto\n${context}\n\n` : ''}## Questão\n${question}

Responda em JSON com esta estrutura:
{
  "analysis": "raciocínio detalhado",
  "conclusion": "conclusão clara e direta",
  "recommendations": [
    {
      "agent": "${agent_id || 'system'}",
      "type": "tipo",
      "severity": "critical|warning|info|positive",
      "title": "título",
      "description": "descrição",
      "suggested_action": "ação concreta",
      "soul_patch": null
    }
  ],
  "confidence": "high|medium|low",
  "caveats": ["limitações ou ressalvas desta análise"]
}`;

    const result = await callOracle(prompt);
    const evalId = await saveEvaluation(agent_id, 'custom', question, result, triggered_by || req.apiKey?.label);

    res.json({
      ok: true,
      evaluation_id: evalId,
      agent_id: agent_id || null,
      ...result.output,
      meta: { model: result.model, tokens_in: result.tokens_in, tokens_out: result.tokens_out, duration_ms: result.duration_ms }
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GET /api/oracle/recommendations
// Lista recomendações pendentes para revisão humana
// ============================================================
app.get('/api/oracle/recommendations', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const { agent_id, status = 'pending', severity } = req.query;
    let q = `SELECT r.*, e.evaluation_type, e.created_at AS evaluated_at
             FROM oracle_recommendations r
             JOIN oracle_evaluations e ON e.id = r.evaluation_id
             WHERE r.status = $1`;
    const params = [status];

    if (agent_id) { params.push(agent_id); q += ` AND r.agent_id = $${params.length}`; }
    if (severity) { params.push(severity); q += ` AND r.severity = $${params.length}`; }
    q += ' ORDER BY r.created_at DESC LIMIT 50';

    const result = await db.query(q, params);
    res.json({ ok: true, recommendations: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PUT /api/oracle/recommendations/:id/review
// Aprovar ou rejeitar uma recomendação
// Payload: { status: 'approved'|'rejected', reviewed_by? }
// ============================================================
app.put('/api/oracle/recommendations/:id/review', auth, async (req, res) => {
  try {
    const { status, reviewed_by } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status deve ser approved ou rejected' });
    }

    const result = await db.query(`
      UPDATE oracle_recommendations
      SET status = $1, reviewed_by = $2, reviewed_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, reviewed_by || req.user?.email || 'admin', req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Recomendação não encontrada' });

    const rec = result.rows[0];

    await db.query('INSERT INTO agent_logs (agent_id, action, details) VALUES ($1,$2,$3)', [
      rec.agent_id || null,
      `oracle_recommendation_${status}`,
      `Rec #${rec.id}: ${rec.title} | by: ${reviewed_by || 'admin'}`
    ]);

    res.json({ ok: true, recommendation: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GET /api/oracle/history
// Histórico de avaliações do ORACLE
// ============================================================
app.get('/api/oracle/history', authOrApiKey, requireScope('oracle'), async (req, res) => {
  try {
    const { agent_id, type, limit = 20 } = req.query;
    let q = `SELECT id, agent_id, evaluation_type, model_used, tokens_in, tokens_out,
                    duration_ms, triggered_by, created_at,
                    oracle_output->'overall_score' AS score,
                    oracle_output->'summary' AS summary
             FROM oracle_evaluations WHERE 1=1`;
    const params = [];

    if (agent_id) { params.push(agent_id); q += ` AND agent_id = $${params.length}`; }
    if (type)     { params.push(type);     q += ` AND evaluation_type = $${params.length}`; }
    params.push(Math.min(parseInt(limit), 100));
    q += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await db.query(q, params);
    res.json({ ok: true, evaluations: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
