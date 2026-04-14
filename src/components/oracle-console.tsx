'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Check,
  Clock3,
  Loader2,
  RefreshCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'

type AgentOption = {
  openclaw_id: string
  name: string
  role: string | null
}

type RankingCard = {
  openclaw_id: string
  name: string
  role: string | null
  color: string
  status: {
    status: string
    tasks_done: number
    tasks_pending: number
    updated_at: string | Date
  } | null
}

type OracleRecommendation = {
  id?: number
  agent?: string | null
  severity?: string | null
  title?: string | null
  description?: string | null
  suggested_action?: string | null
  status?: string | null
}

type OracleHistoryItem = {
  id?: number
  evaluation_type?: string | null
  created_at?: string | null
  triggered_by?: string | null
  score?: number | string | null
  summary?: string | null
}

type OracleChatResponse = {
  analysis?: string
  conclusion?: string
  recommendations?: OracleRecommendation[]
  confidence?: string
  caveats?: string[]
  meta?: {
    duration_ms?: number
    tokens_in?: number
    tokens_out?: number
  }
}

type ChatEntry =
  | {
      id: string
      role: 'user'
      question: string
      context?: string
      agentName?: string
    }
  | {
      id: string
      role: 'oracle'
      response: OracleChatResponse
    }

type OracleDashboardPayload = {
  ranking?: RankingCard[]
  recommendations?: OracleRecommendation[]
  history?: OracleHistoryItem[]
}

const PERIOD_OPTIONS = [7, 14, 30]

function getSeverityStyles(severity?: string | null) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    case 'warning':
      return 'bg-amber-500/15 text-amber-200 border-amber-500/30'
    case 'positive':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    default:
      return 'bg-sky-500/15 text-sky-200 border-sky-500/30'
  }
}

function getConfidenceStyles(confidence?: string) {
  switch ((confidence || '').toLowerCase()) {
    case 'high':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    case 'medium':
      return 'text-amber-200 border-amber-500/30 bg-amber-500/10'
    case 'low':
      return 'text-rose-200 border-rose-500/30 bg-rose-500/10'
    default:
      return 'text-slate-300 border-white/10 bg-white/5'
  }
}

function formatMs(durationMs?: number) {
  if (!durationMs) return null
  return `${(durationMs / 1000).toFixed(durationMs > 10000 ? 0 : 1)}s`
}

function parseErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Falha inesperada ao falar com o ORACLE.'
}

export function OracleConsole({
  initialRanking,
  agents,
  organizationName,
}: {
  initialRanking: RankingCard[]
  agents: AgentOption[]
  organizationName: string
}) {
  const [isPending, startTransition] = useTransition()
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [periodDays, setPeriodDays] = useState(7)
  const [chat, setChat] = useState<ChatEntry[]>([])
  const [ranking, setRanking] = useState<RankingCard[]>(initialRanking)
  const [recommendations, setRecommendations] = useState<OracleRecommendation[]>([])
  const [history, setHistory] = useState<OracleHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [statusText, setStatusText] = useState<string>('Painel conectado ao ORACLE.')

  const selectedAgentName = useMemo(
    () => agents.find((agent) => agent.openclaw_id === selectedAgentId)?.name,
    [agents, selectedAgentId]
  )

  const loadOracleSnapshot = useCallback(async () => {
    const response = await fetch('/api/oracle', {
      method: 'GET',
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as OracleDashboardPayload & {
      error?: string
      details?: string
    } | null

    if (!response.ok) {
      throw new Error(payload?.details || payload?.error || 'Nao foi possivel carregar os dados do ORACLE.')
    }

    setRanking(Array.isArray(payload?.ranking) ? payload.ranking : initialRanking)
    setRecommendations(Array.isArray(payload?.recommendations) ? payload.recommendations : [])
    setHistory(Array.isArray(payload?.history) ? payload.history : [])
  }, [initialRanking])

  useEffect(() => {
    startTransition(() => {
      loadOracleSnapshot()
        .then(() => {
          setStatusText('Ranking, recomendacoes e historico carregados.')
        })
        .catch((loadError) => {
          setError(parseErrorMessage(loadError))
        })
    })
  }, [loadOracleSnapshot])

  async function handleAskOracle() {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      setError('Digite uma pergunta para iniciar a analise do ORACLE.')
      return
    }

    setError(null)
    setStatusText('O ORACLE esta analisando sua pergunta...')

    const userEntry: ChatEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      question: trimmedQuestion,
      context: context.trim() || undefined,
      agentName: selectedAgentName,
    }

    setChat((current) => [...current, userEntry])

    try {
      const response = await fetch('/api/oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'custom',
          question: trimmedQuestion,
          context,
          agentId: selectedAgentId || undefined,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | (OracleChatResponse & { error?: string; details?: string })
        | null

      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || 'Nao foi possivel consultar o ORACLE.')
      }

      setChat((current) => [
        ...current,
        {
          id: `oracle-${Date.now()}`,
          role: 'oracle',
          response: payload || {},
        },
      ])
      setQuestion('')
      setContext('')
      setStatusText('Resposta recebida do ORACLE.')
      await loadOracleSnapshot()
    } catch (requestError) {
      setError(parseErrorMessage(requestError))
      setStatusText('A consulta falhou. Revise a conexao com o ORACLE.')
    }
  }

  async function handleGenerateRanking() {
    setError(null)
    setStatusText('Gerando novo ranking cross-agente...')

    try {
      const response = await fetch('/api/oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'ranking',
          periodDays,
          context,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string
            details?: string
            ranking?: Array<{
              position?: number
              agent?: string
              agent_name?: string
              efficiency_score?: number
              tier?: string
              highlights?: string[]
              concerns?: string[]
              recommendation?: string
            }>
            executive_summary?: string
            system_recommendations?: OracleRecommendation[]
          }
        | null

      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || 'Nao foi possivel gerar o ranking.')
      }

      if (Array.isArray(payload?.ranking) && payload.ranking.length > 0) {
        setRanking(
          payload.ranking.map((item, index) => ({
            openclaw_id: item.agent || `oracle-${index}`,
            name: item.agent_name || item.agent || `Agente ${index + 1}`,
            role: item.tier ? `Tier ${item.tier}` : 'Analise ORACLE',
            color: '#10B981',
            status: {
              status: item.tier || 'ranked',
              tasks_done: item.efficiency_score || 0,
              tasks_pending: item.concerns?.length || 0,
              updated_at: new Date().toISOString(),
            },
          }))
        )
      }

      if (Array.isArray(payload?.system_recommendations) && payload.system_recommendations.length > 0) {
        setRecommendations(payload.system_recommendations)
      } else {
        await loadOracleSnapshot()
      }

      if (payload?.executive_summary) {
        setStatusText(payload.executive_summary)
      } else {
        setStatusText('Novo ranking gerado com sucesso.')
      }
    } catch (requestError) {
      setError(parseErrorMessage(requestError))
      setStatusText('Falha ao gerar o ranking no ORACLE.')
    }
  }

  async function handleReviewRecommendation(recommendationId: number, status: 'approved' | 'rejected') {
    setError(null)

    try {
      const response = await fetch('/api/oracle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendationId,
          status,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string; details?: string } | null
      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || 'Falha ao revisar recomendacao.')
      }

      setRecommendations((current) => current.filter((item) => item.id !== recommendationId))
      setStatusText(`Recomendacao ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`)
    } catch (requestError) {
      setError(parseErrorMessage(requestError))
    }
  }

  const topPerformer = ranking[0]

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),rgba(12,15,26,0.96)_42%,rgba(7,9,15,1)_80%)] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
              <BrainCircuit size={14} />
              Oracle Intelligence Layer
            </div>
            <h1 className="text-3xl font-bold text-white md:text-4xl">Chat operacional com o ORACLE</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Analise estrategica, ranking cross-agente e fila de recomendacoes em um unico painel para {organizationName}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Agentes sincronizados</div>
              <div className="mt-2 text-3xl font-bold text-white">{ranking.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Pendencias ORACLE</div>
              <div className="mt-2 text-3xl font-bold text-white">{recommendations.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Top performer</div>
              <div className="mt-2 text-lg font-bold text-white">{topPerformer?.name || 'Aguardando ranking'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[24px] border border-white/8 bg-[#0C0F1A] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Pergunte ao ORACLE</h2>
              <p className="mt-1 text-xs text-slate-400">
                Use contexto opcional e foque um agente quando quiser uma recomendacao mais cirurgica.
              </p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${getConfidenceStyles(undefined)}`}>
              {isPending ? 'Sincronizando' : 'Online'}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pergunta</label>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-[#07090F] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40"
                placeholder="Ex.: Qual agente deveria liderar a campanha de Black Friday e quais riscos devo mitigar?"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Agente focal</label>
                <select
                  value={selectedAgentId}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-[#07090F] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40"
                >
                  <option value="">Sem filtro</option>
                  {agents.map((agent) => (
                    <option key={agent.openclaw_id} value={agent.openclaw_id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Periodo do ranking</label>
                <div className="mt-3 flex gap-2">
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPeriodDays(option)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        periodDays === option
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {option}d
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contexto adicional</label>
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[#07090F] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40"
              placeholder="Objetivos, restricoes, historico, sinais de risco, urgencia."
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">{statusText}</div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    void handleGenerateRanking()
                  })
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                Gerar ranking
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    void handleAskOracle()
                  })
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Consultar ORACLE
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {chat.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07090F] p-6 text-sm text-slate-400">
                Nenhuma interacao ainda. Envie uma pergunta livre para iniciar o chat com o ORACLE.
              </div>
            ) : null}

            {chat.map((entry) =>
              entry.role === 'user' ? (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-[#07090F] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pergunta enviada</div>
                    {entry.agentName ? (
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                        {entry.agentName}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white">{entry.question}</p>
                  {entry.context ? <p className="mt-3 text-xs leading-5 text-slate-400">{entry.context}</p> : null}
                </div>
              ) : (
                <div key={entry.id} className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                      <Sparkles size={14} />
                      Resposta do ORACLE
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${getConfidenceStyles(entry.response.confidence)}`}>
                      Confianca {entry.response.confidence || 'n/a'}
                    </div>
                    {entry.response.meta?.duration_ms ? (
                      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                        <Clock3 size={12} />
                        {formatMs(entry.response.meta.duration_ms)}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-[#07090F] p-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Analise</div>
                      <p className="mt-3 text-sm leading-6 text-slate-200">{entry.response.analysis || 'Sem analise detalhada.'}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/20 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">Conclusao</div>
                      <p className="mt-3 text-sm leading-6 text-white">{entry.response.conclusion || 'Sem conclusao declarada.'}</p>
                    </div>
                  </div>

                  {Array.isArray(entry.response.recommendations) && entry.response.recommendations.length > 0 ? (
                    <div className="mt-4 grid gap-3">
                      {entry.response.recommendations.map((recommendation, index) => (
                        <div
                          key={`${entry.id}-rec-${recommendation.title || index}`}
                          className="rounded-2xl border border-white/10 bg-[#07090F] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${getSeverityStyles(recommendation.severity)}`}>
                              {recommendation.severity || 'info'}
                            </span>
                            <span className="text-sm font-semibold text-white">{recommendation.title || 'Recomendacao'}</span>
                          </div>
                          {recommendation.description ? (
                            <p className="mt-3 text-sm leading-6 text-slate-300">{recommendation.description}</p>
                          ) : null}
                          {recommendation.suggested_action ? (
                            <p className="mt-3 text-xs leading-5 text-emerald-200">{recommendation.suggested_action}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {Array.isArray(entry.response.caveats) && entry.response.caveats.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
                        <AlertTriangle size={14} />
                        Caveats
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-amber-50">
                        {entry.response.caveats.map((caveat, index) => (
                          <li key={`${entry.id}-caveat-${index}`}>{caveat}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-white/8 bg-[#0C0F1A] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Ranking operacional</h2>
                <p className="mt-1 text-xs text-slate-400">Espelho local dos agentes com leitura priorizada por execucao.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                {ranking.length} agentes
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {ranking.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#07090F] p-5 text-sm text-slate-400">
                  Nenhum agente sincronizado ainda.
                </div>
              ) : (
                ranking.map((agent, index) => (
                  <div key={agent.openclaw_id} className="rounded-2xl border border-white/10 bg-[#07090F] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">#{index + 1}</div>
                        <div className="mt-1 text-sm font-semibold text-white">{agent.name}</div>
                        <div className="mt-1 text-xs text-slate-400">{agent.role || 'Agente'}</div>
                      </div>
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: agent.color || '#10B981' }}
                        aria-hidden
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-white/5 bg-black/20 px-2 py-3">
                        <div className="text-slate-500">Done</div>
                        <div className="mt-1 text-base font-bold text-white">{agent.status?.tasks_done || 0}</div>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-black/20 px-2 py-3">
                        <div className="text-slate-500">Pending</div>
                        <div className="mt-1 text-base font-bold text-white">{agent.status?.tasks_pending || 0}</div>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-black/20 px-2 py-3">
                        <div className="text-slate-500">Status</div>
                        <div className="mt-1 text-base font-bold text-white">{agent.status?.status || 'offline'}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/8 bg-[#0C0F1A] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Fila de recomendacoes</h2>
                <p className="mt-1 text-xs text-slate-400">Itens pendentes gerados pelo ORACLE para revisao administrativa.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                {recommendations.length} pendentes
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recommendations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#07090F] p-5 text-sm text-slate-400">
                  Nenhuma recomendacao pendente no momento.
                </div>
              ) : (
                recommendations.map((recommendation, index) => (
                  <div key={`${recommendation.id || recommendation.title || index}`} className="rounded-2xl border border-white/10 bg-[#07090F] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${getSeverityStyles(recommendation.severity)}`}>
                        {recommendation.severity || 'info'}
                      </span>
                      <span className="text-sm font-semibold text-white">{recommendation.title || 'Recomendacao sem titulo'}</span>
                    </div>
                    {recommendation.description ? (
                      <p className="mt-3 text-sm leading-6 text-slate-300">{recommendation.description}</p>
                    ) : null}
                    {recommendation.suggested_action ? (
                      <p className="mt-3 text-xs leading-5 text-emerald-200">{recommendation.suggested_action}</p>
                    ) : null}

                    {typeof recommendation.id === 'number' ? (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(() => {
                              void handleReviewRecommendation(recommendation.id!, 'approved')
                            })
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-emerald-400"
                        >
                          <Check size={14} />
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(() => {
                              void handleReviewRecommendation(recommendation.id!, 'rejected')
                            })
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                        >
                          <X size={14} />
                          Rejeitar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                        <ArrowUpRight size={14} />
                        Recomendacao vinda do ranking atual, sem id remoto para review.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/8 bg-[#0C0F1A] p-5">
            <div>
              <h2 className="text-lg font-bold text-white">Historico recente</h2>
              <p className="mt-1 text-xs text-slate-400">Ultimas avaliacoes registradas pelo ORACLE.</p>
            </div>

            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#07090F] p-5 text-sm text-slate-400">
                  Sem historico disponivel no momento.
                </div>
              ) : (
                history.map((item, index) => (
                  <div key={`${item.id || index}`} className="rounded-2xl border border-white/10 bg-[#07090F] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.evaluation_type || 'custom'}</div>
                        <div className="mt-2 text-sm text-white">{item.summary || 'Sem resumo registrado.'}</div>
                      </div>
                      {item.score != null ? (
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                          {item.score}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      {item.triggered_by || 'Sistema'} {item.created_at ? `· ${new Date(item.created_at).toLocaleString('pt-BR')}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
