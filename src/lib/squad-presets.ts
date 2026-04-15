import type { SquadSuggestion, SquadSuggestionStep } from '@/lib/types/squads'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function buildSuggestion(
  name: string,
  description: string,
  architectSummary: string,
  presetKey: string | null,
  steps: SquadSuggestionStep[],
): SquadSuggestion {
  return {
    name,
    slug: slugify(name),
    description,
    architectSummary,
    autonomyMode: 'interactive',
    presetKey,
    steps,
  }
}

export function buildArchitectSuggestion(prompt: string, availableAgentIds: string[]): SquadSuggestion {
  const normalized = prompt.toLowerCase()
  const hasAgent = (candidate: string, fallbackIndex: number) =>
    availableAgentIds.includes(candidate) ? candidate : availableAgentIds[fallbackIndex] ?? availableAgentIds[0] ?? 'secretary'

  if (normalized.includes('youtube') || normalized.includes('linkedin') || normalized.includes('refator')) {
    return buildSuggestion(
      'Refatorador de Conteúdo Multicanal',
      'Pipeline para transformar um conteúdo-base em uma nova peça orientada a canal.',
      'O arquiteto identificou uma necessidade de reaproveitamento de conteúdo em múltiplas etapas, começando por análise, adaptação de linguagem e revisão final.',
      'youtube-to-linkedin',
      [
        {
          order: 1,
          agentId: hasAgent('david', 0),
          title: 'Diagnóstico do material-base',
          instructions: 'Analise o conteúdo original, identifique os melhores ganchos, pontos fortes e quais trechos têm maior potencial de reaproveitamento.',
          checkpointRequired: true,
        },
        {
          order: 2,
          agentId: hasAgent('chiara', 1),
          title: 'Adaptação para o canal alvo',
          instructions: 'Reescreva o conteúdo no formato solicitado, adequando tom, abertura, cadência e CTA ao canal escolhido.',
          skillCode: 'oracle-analysis',
        },
        {
          order: 3,
          agentId: hasAgent('leon', 2),
          title: 'Revisão de consistência',
          instructions: 'Faça revisão final garantindo clareza, consistência de voz, fluidez e aderência ao objetivo da peça.',
          checkpointRequired: true,
        },
      ],
    )
  }

  if (normalized.includes('site') || normalized.includes('instagram') || normalized.includes('refer') || normalized.includes('concorr')) {
    return buildSuggestion(
      'Sherlock de Referências',
      'Pipeline para estudar referências públicas do cliente e transformar isso em briefing acionável.',
      'O arquiteto priorizou um fluxo de investigação com navegador, seguido de síntese estratégica e revisão humana antes do uso em produção.',
      'site-style-investigation',
      [
        {
          order: 1,
          agentId: hasAgent('david', 0),
          title: 'Investigação de referências',
          instructions: 'Use navegação headless para estudar as referências fornecidas, coletando padrões de estilo, formatos, temas recorrentes e sinais de posicionamento.',
          checkpointRequired: true,
          skillCode: 'browser-investigation',
        },
        {
          order: 2,
          agentId: hasAgent('chiara', 1),
          title: 'Síntese estratégica',
          instructions: 'Transforme a investigação em um briefing claro com padrões observados, oportunidades e recomendações práticas para o time.',
          skillCode: 'oracle-analysis',
        },
      ],
    )
  }

  return buildSuggestion(
    'Squad de Campanha',
    'Pipeline genérico para pesquisa, copy e acabamento de entrega.',
    'O arquiteto entendeu que a dor principal pede coordenação entre pesquisa, desenvolvimento de mensagem e fechamento com validação humana.',
    'campaign-squad',
    [
      {
        order: 1,
        agentId: hasAgent('david', 0),
        title: 'Pesquisa e contexto',
        instructions: 'Levante contexto, dores, argumentos, concorrência e oportunidades para o objetivo descrito pelo cliente.',
        checkpointRequired: true,
      },
      {
        order: 2,
        agentId: hasAgent('chiara', 1),
        title: 'Construção da mensagem',
        instructions: 'Produza a mensagem principal, proposta de valor e estrutura da peça ou campanha com base na pesquisa.',
      },
      {
        order: 3,
        agentId: hasAgent('leon', 2),
        title: 'Revisão final',
        instructions: 'Revise coerência, clareza, aderência ao objetivo e prepare a entrega final para aprovação.',
        checkpointRequired: true,
      },
    ],
  )
}
