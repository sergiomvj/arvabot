export type TaskStatus = 
  | 'backlog' 
  | 'assigned' 
  | 'in_progress' 
  | 'blocked' 
  | 'completed';

export type TaskCriticality = 'low' | 'medium' | 'high' | 'critical';
export type TaskComplexity = 'simple' | 'standard' | 'complex' | 'exceptional';

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  documentation?: string | null;
  status: 'draft' | 'active' | 'finished' | 'archived';
  createdByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  tasks?: ProjectTask[];
  members?: Agent[];
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  criticality: TaskCriticality;
  complexity: TaskComplexity;
  assignedAgentId?: string | null;
  assignedTeamId?: string | null;
  dependencyId?: string | null;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
  assignedAgent?: Agent | null;
  assignedTeam?: Team | null;
}

export interface Agent {
  id: string;
  code: string;
  displayName: string;
  description?: string | null;
  primaryFunctionId?: string | null;
  owningTeamId?: string | null;
}

export interface Team {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface ProjectWithTasks extends Project {
  tasks: ProjectTask[];
}

export interface CreateProjectInput {
  name: string;
  documentation?: string;
  tasklist: string;
}

export interface UpdateTaskStatusInput {
  taskId: string;
  newStatus: TaskStatus;
}

export interface AssignTaskInput {
  taskId: string;
  agentId: string | null;
}
