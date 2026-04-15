export interface ParsedTask {
  title: string;
  isCompleted: boolean;
  assignedAgentCode?: string;
  assignedTeamCode?: string;
  phase?: string;
}

export function parseTaskListMarkdown(markdown: string): ParsedTask[] {
  const lines = markdown.split("\n");
  const tasks: ParsedTask[] = [];
  let currentPhase = "General";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      currentPhase = trimmed.replace(/^#+\s/, "");
      continue;
    }

    const isTaskItem = trimmed.match(/^- \[([ xX])\] (.*)/);
    if (isTaskItem) {
      const isCompleted = isTaskItem[1].toLowerCase() === "x";
      let title = isTaskItem[2];

      let assignedAgentCode = undefined;
      const agentMatch = title.match(/@([A-Z0-9-]+)/i);
      if (agentMatch) {
        assignedAgentCode = agentMatch[1].toLowerCase();
        title = title.replace(agentMatch[0], "").trim();
      }

      tasks.push({
        title,
        isCompleted,
        assignedAgentCode,
        phase: currentPhase,
      });
    }
  }

  return tasks;
}

export async function injectTasksIntoProject(prisma: any, projectId: string, markdown: string, organizationId?: string) {
  const parsedTasks = parseTaskListMarkdown(markdown);
  if (parsedTasks.length === 0) return { count: 0 };

  const activeAgents = organizationId
    ? await prisma.agents_cache.findMany({
        where: { organization_id: organizationId, active: true },
        select: { id: true, openclaw_id: true },
      })
    : [];

  const getAgentId = (code?: string) =>
    activeAgents.find((agent: any) => agent.openclaw_id.toLowerCase() === code?.toLowerCase())?.id ?? null;

  let injectedCount = 0;

  for (const task of parsedTasks) {
    await prisma.project_task.create({
      data: {
        project_id: projectId,
        title: `[${task.phase}] ${task.title}`,
        status: task.isCompleted ? "completed" : "backlog",
        assigned_agent_id: getAgentId(task.assignedAgentCode),
        criticality: "medium",
        complexity: "standard",
      },
    });
    injectedCount++;
  }

  return { count: injectedCount, tasks: parsedTasks };
}
