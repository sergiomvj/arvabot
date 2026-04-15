export type SquadAutonomyMode = 'interactive' | 'autonomous'

export type SquadSuggestionStep = {
  order: number
  agentId: string
  title: string
  instructions: string
  checkpointRequired?: boolean
  skillCode?: string | null
}

export type SquadSuggestion = {
  name: string
  slug: string
  description: string
  architectSummary: string
  autonomyMode: SquadAutonomyMode
  presetKey: string | null
  steps: SquadSuggestionStep[]
}

export type SquadCreatePayload = {
  name: string
  slug?: string
  description?: string
  architectPrompt?: string
  architectSummary?: string
  autonomyMode?: SquadAutonomyMode
  presetKey?: string | null
  steps: SquadSuggestionStep[]
}
