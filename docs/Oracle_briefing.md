⬡ ORACLE
Agente Orquestrador de Inteligência — Briefing de Integração
Para o Dev do Ranking Hub · Abril 2026 · Confidencial
Grupo Facebrasil · dashboard.fbrapps.com

O que é o ORACLE
O ORACLE é um agente de inteligência oculto que opera nos bastidores do ecossistema ARVA. Ele roda Claude Opus 4.6 — o modelo mais capaz da Anthropic — e é ativado sempre que o sistema precisa de raciocínio pesado: avaliações de conduta, rankings de eficiência, decomposição de PRDs, ou qualquer decisão complexa que os agentes menores não conseguem resolver com qualidade.

Ele é invisível para os agentes ARVA e para os usuários finais. Só você (admin) e o Hub têm acesso a ele.

Característica	Valor
Modelo	Claude Opus 4.6 via OpenRouter
Base URL	https://dashboard.fbrapps.com
Latência média	15–45 segundos por chamada
Autenticação	ApiKey no header Authorization
Formato	JSON (Content-Type: application/json)

Credenciais de Acesso
Guarde esta chave com segurança. Use-a em todas as chamadas abaixo.

Authorization: ApiKey oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e

Escopos desta key: oracle · sprint · checkin — a mesma key dá acesso a todos os endpoints do sistema.

Endpoints do ORACLE
1. Avaliar conduta de um agente
POST https://dashboard.fbrapps.com/api/oracle/evaluate

Chama o Opus para avaliar performance e conduta de um agente com base nos logs, tarefas e check-ins do período. Devolve score 0–100, análise por dimensão e recomendações com soul_patch prontos para aplicar.

Body
{
  "agent_id": "mila",
  "period_days": 7,
  "context": "Contexto adicional opcional"
}

Response
{
  "ok": true,
  "evaluation_id": 1,
  "overall_score": 84,
  "summary": "Mila manteve alta taxa de execução...",
  "dimensions": {
    "task_completion":    { "score": 90, "evidence": "..." },
    "response_quality":   { "score": 85, "evidence": "..." },
    "protocol_adherence": { "score": 80, "evidence": "..." },
    "proactivity":        { "score": 78, "evidence": "..." },
    "checkin_reliability":{ "score": 92, "evidence": "..." }
  },
  "strengths": ["Alta taxa de check-in", "Execução rápida"],
  "concerns":  ["Tarefas pendentes acumuladas"],
  "recommendations": [
    {
      "agent": "mila",
      "severity": "warning",
      "title": "Reduzir backlog de tarefas pendentes",
      "description": "...",
      "suggested_action": "...",
      "soul_patch": "Trecho para adicionar ao SOUL.md"
    }
  ],
  "trend": "stable",
  "meta": { "model": "anthropic/claude-opus-4.6", "tokens_in": 600, "tokens_out": 1200, "duration_ms": 28000 }
}

2. Ranking cross-agente
POST https://dashboard.fbrapps.com/api/oracle/ranking

Avalia todos os 13 agentes do time e devolve ranking com tiers S/A/B/C/D, insights de time e recomendações sistêmicas. Ideal para rodar semanalmente no cron do Hub.

Body
{
  "period_days": 30,
  "context": "Contexto do período opcional"
}

Response
{
  "ok": true,
  "executive_summary": "O time manteve performance estável...",
  "ranking": [
    {
      "position": 1,
      "agent": "mila",
      "agent_name": "Mila Castro",
      "efficiency_score": 91,
      "tier": "S",
      "highlights": ["Maior taxa de reativação"],
      "concerns": [],
      "recommendation": "Aumentar volume de campanhas"
    }
  ],
  "team_insights": {
    "best_performer": "mila",
    "needs_attention": ["leon"],
    "overloaded": ["david"],
    "underutilized": ["gabe"]
  },
  "system_recommendations": [...]
}

3. PRD → TaskList com Chain-of-Thought
POST https://dashboard.fbrapps.com/api/oracle/tasklist

Recebe um PRD em markdown e aplica Chain-of-Thought com Opus para decompor cada feature em tarefas atômicas, atribuir ao agente certo e gerar o payload pronto para o POST /api/sprint.

Body
{
  "prd_content": "# PRD\n## Feature 1\n...",
  "sprint_name": "Campanha Alpha",
  "due_date": "2026-04-30"
}

Response — inclui sprint_payload pronto
{
  "ok": true,
  "sprint_name": "Campanha Alpha",
  "context": "Resumo do PRD...",
  "cot_reasoning": [
    { "feature": "Feature 1", "analysis": "...", "decomposition": "..." }
  ],
  "tasks": [...],
  "sprint_payload": {
    "sprintName": "Campanha Alpha",
    "context": "...",
    "tasks": [
      { "agent": "mila", "action": "...", "priority": "high" }
    ]
  }
}

4. Chat — Perguntas livres ao ORACLE
POST https://dashboard.fbrapps.com/api/oracle/custom

Este é o endpoint do chat. Qualquer pergunta complexa — estratégica, operacional, analítica — pode ser enviada aqui. O ORACLE raciocina com Opus e devolve análise estruturada com recomendações.

Este endpoint alimenta o componente de chat no Hub. O usuário digita, o Hub chama este endpoint, o ORACLE responde.

Body
{
  "question": "Qual agente deveria liderar a campanha de Black Friday?",
  "context": "Contexto adicional opcional — histórico, restrições, objetivos",
  "agent_id": "mila"
}

Response
{
  "ok": true,
  "analysis": "Raciocínio detalhado do ORACLE...",
  "conclusion": "Mila é a mais indicada porque...",
  "recommendations": [
    {
      "agent": "mila",
      "severity": "info",
      "title": "Liderar campanha Black Friday",
      "description": "...",
      "suggested_action": "Briefar Mila com: segmento alvo, meta de conversão, prazo"
    }
  ],
  "confidence": "high",
  "caveats": ["Limitação 1", "Limitação 2"],
  "meta": { "duration_ms": 28000, "tokens_in": 598, "tokens_out": 1447 }
}

5. Listar recomendações pendentes
GET https://dashboard.fbrapps.com/api/oracle/recommendations?status=pending

Lista todas as recomendações geradas pelo ORACLE que ainda não foram aprovadas ou rejeitadas. Use para popular a fila de revisão no painel do Hub.

Query param	Descrição
status	pending | approved | rejected (default: pending)
agent_id	Filtrar por agente específico
severity	critical | warning | info | positive

6. Aprovar ou rejeitar recomendação
PUT https://dashboard.fbrapps.com/api/oracle/recommendations/:id/review

Body
{
  "status": "approved",
  "reviewed_by": "sergio@facebrasil.com"
}

7. Histórico de avaliações
GET https://dashboard.fbrapps.com/api/oracle/history?limit=20

Retorna histórico de todas as avaliações do ORACLE com score, modelo, tokens e duração. Útil para o painel de auditoria.

Interface — O que construir no Hub
Tela ORACLE — Visão Geral
Uma página dedicada no Hub (ex: /oracle) com 3 seções principais:

Painel de Ranking — exibe o último ranking gerado com cards por agente, tier S/A/B/C/D e botão "Gerar novo ranking"
Fila de Recomendações — lista de recomendações pendentes com botões Aprovar / Rejeitar por item
Chat com o ORACLE — campo de texto livre onde o admin digita e recebe resposta estruturada

Componente de Chat
O chat é a interface mais importante. Sugestão de implementação:

UX recomendada
Input de texto na parte inferior (como um chat normal)
Campo opcional "Contexto" expansível para adicionar dados antes de enviar
Loading com mensagem "O ORACLE está analisando..." durante os 15–45s de resposta
Resposta exibida em cards estruturados: Análise → Conclusão → Recomendações → Caveats
Badge de confiança (high / medium / low) e tempo de resposta no rodapé

Exemplo de chamada no frontend (Next.js)
async function askOracle(question, context = '') {
  const res = await fetch(
    'https://dashboard.fbrapps.com/api/oracle/custom',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'ApiKey oc_live_6e99...'
      },
      body: JSON.stringify({ question, context })
    }
  );
  return res.json();
}

Renderização da resposta
// Desestruturar o response do ORACLE
const { analysis, conclusion, recommendations, confidence, caveats, meta } = oracleResponse;

// Exibir em cards:
// 1. Card "Análise"     → analysis
// 2. Card "Conclusão"   → conclusion  (destaque visual)
// 3. Cards por rec      → recommendations[] com severity badge
// 4. Footer             → confidence + meta.duration_ms + caveats

Cron de Ranking Automático
Recomendação: rodar toda segunda-feira às 09:00 o endpoint de ranking para todos os agentes.

// src/app/api/cron/oracle-ranking/route.ts
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret !== process.env.INGESTION_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    'https://dashboard.fbrapps.com/api/oracle/ranking',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${process.env.OPENCLAW_API_KEY}`
      },
      body: JSON.stringify({ period_days: 7, triggered_by: 'hub_cron_weekly' })
    }
  );

  const data = await res.json();
  // Salvar no banco do Hub para exibição no painel
  await saveRankingToDb(data);

  return Response.json({ ok: true, agents_ranked: data.ranking?.length });
}

Registrar no cron-job.org: GET https://ranking.fbrapps.com/api/cron/oracle-ranking?secret=SEU_SECRET — toda segunda às 09:00.

Códigos de Erro
HTTP	Descrição
400	Campo obrigatório ausente (question, prd_content, sprint_name)
401	ApiKey inválida ou revogada
403	ApiKey sem escopo oracle
500	Erro interno ou timeout do Opus (>60s) — implementar retry

O Opus pode demorar até 45s em análises complexas. Implemente timeout de 60s e loading visual no frontend. Em caso de 500, aguardar 10s e tentar novamente uma vez.

Checklist de Implementação
Item	Status
Salvar OPENCLAW_API_KEY no .env do Hub	[ ]
Criar rota /oracle no Next.js	[ ]
Componente OracleChat com loading de 60s	[ ]
Componente RankingBoard com tiers S/A/B/C/D	[ ]
Componente RecommendationQueue com aprovar/rejeitar	[ ]
Cron /api/cron/oracle-ranking (semanal)	[ ]
Cron /api/cron/openclaw-checkin (diário 09:00)	[ ]
Testar POST /api/oracle/custom com pergunta livre	[ ]
Testar POST /api/oracle/ranking period_days=7	[ ]
Testar GET /api/oracle/recommendations	[ ]

ORACLE · OpenClaw · Grupo Facebrasil · Abril 2026 · Confidencial
