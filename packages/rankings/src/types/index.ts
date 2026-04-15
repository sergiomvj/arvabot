export type ScoreStatus = 'provisional' | 'published' | 'reprocessed' | 'revoked';

export type OperationalBand = 'green' | 'yellow' | 'orange' | 'red';

export interface EvaluationPeriod {
  id: string;
  code: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  startsAt: Date;
  endsAt: Date;
  isClosed: boolean;
  closedAt?: Date | null;
  closedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeriodScorecard {
  id: string;
  periodId: string;
  agentId?: string | null;
  teamId?: string | null;
  functionId?: string | null;
  policyVersionId: string;
  scoreValue: number;
  scoreStatus: ScoreStatus;
  sampleSize: number;
  eligibleTaskCount: number;
  confidenceIndex: number;
  rankPosition?: number | null;
  previousRankPosition?: number | null;
  trendDelta?: number | null;
  operationalBand: OperationalBand;
  explanation: Record<string, unknown>;
  publishedAt?: Date | null;
  publicationVersion: number;
  createdAt: Date;
  updatedAt: Date;
  agent?: Agent | null;
}

export interface Agent {
  id: string;
  code: string;
  displayName: string;
  description?: string | null;
  owningTeamId?: string | null;
  primaryFunctionId?: string | null;
}

export interface RankingRow {
  id: string;
  rankPosition: number;
  scoreValue: number;
  confidenceIndex: number;
  operationalBand: OperationalBand;
  sampleSize: number;
  agent?: Agent | null;
}

export interface RankingsResponse {
  period: EvaluationPeriod | null;
  rankings: RankingRow[];
}

export interface GetAgentProfileInput {
  agentCode: string;
  periodCode?: string;
}

export interface AgentProfile {
  agent: Agent;
  teamDesc: string;
  funcDesc: string;
  badgesAwarded: BadgeAward[];
  consequenceEvents: ConsequenceEvent[];
  scorecard: PeriodScorecard | null;
  recentExecutions: TaskExecution[];
}

export interface BadgeAward {
  id: string;
  awardedAt: Date;
  badge: {
    code: string;
    name: string;
    description: string;
    badgeCategory: string;
  };
}

export interface ConsequenceEvent {
  id: string;
  triggeredAt: Date;
  status: string;
  rule: {
    code: string;
    name: string;
    actionType: string;
  };
}

export interface TaskExecution {
  id: string;
  startedAt: Date;
  completedAt?: Date | null;
  executionStatus: string;
  scoreRaw?: number | null;
  scoreFinal?: number | null;
  taskType: {
    code: string;
    name: string;
  };
}
