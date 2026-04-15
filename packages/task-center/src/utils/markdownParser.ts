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
      const agentMatch = title.match(/@([A-Z0-9-]+)/);
      if (agentMatch) {
        assignedAgentCode = agentMatch[1];
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

export async function injectTasksIntoProject(prisma: any, projectId: string, markdown: string) {
  const parsedTasks = parseTaskListMarkdown(markdown);
  if (parsedTasks.length === 0) return { count: 0 };

  const activeAgents = await prisma.agent.findMany({ select: { id: true, code: true } });
  const getAgentId = (code?: string) => activeAgents.find((a: any) => a.code === code)?.id;

  let injectedCount = 0;

  for (const t of parsedTasks) {
    await prisma.projectTask.create({
      data: {
        projectId,
        title: `[${t.phase}] ${t.title}`,
        status: t.isCompleted ? "completed" : "backlog",
        assignedAgentId: getAgentId(t.assignedAgentCode) || null,
        criticality: "medium",
        complexity: "standard",
      }
    });
    injectedCount++;
  }

  return { count: injectedCount, tasks: parsedTasks };
}
