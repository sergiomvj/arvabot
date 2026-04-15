"use server";

import { revalidatePath } from "next/cache";
import { injectTasksIntoProject } from "../utils/markdownParser";
import { dispatchToOpenClawSprint } from "../utils/openclawIntegration";
import { serializePrisma } from "../utils/serialization";
import type { ProjectWithTasks, TaskStatus } from "../types";

let prismaInstance: any = null;

function getPrisma() {
  if (!prismaInstance) {
    throw new Error("Prisma client not initialized. Call setPrismaClient() first.");
  }
  return prismaInstance;
}

export async function setPrismaClient(client: any) {
  prismaInstance = client;
}

export async function getAllProjectsWithTasks(organizationId?: string): Promise<ProjectWithTasks[]> {
  const prisma = getPrisma();
  const projects = await prisma.project.findMany({
    where: organizationId ? { organization_id: organizationId } : undefined,
    orderBy: { created_at: "desc" },
    include: {
      tasks: {
        orderBy: { created_at: "asc" },
      },
    },
  });

  const agentIds = projects
    .flatMap((project: any) => project.tasks)
    .map((task: any) => task.assigned_agent_id)
    .filter((value: string | null | undefined): value is string => Boolean(value));

  const uniqueAgentIds = [...new Set(agentIds)];
  const assignedAgents =
    uniqueAgentIds.length > 0
      ? await prisma.agents_cache.findMany({
          where: { id: { in: uniqueAgentIds } },
          select: {
            id: true,
            openclaw_id: true,
            name: true,
            role: true,
          },
        })
      : [];

  const agentMap = new Map(
    assignedAgents.map((agent: any) => [
      agent.id,
      {
        id: agent.id,
        code: agent.openclaw_id,
        displayName: agent.name,
        description: agent.role ?? null,
      },
    ]),
  );

  const normalizedProjects = projects.map((project: any) => ({
    ...project,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    tasks: project.tasks.map((task: any) => ({
      ...task,
      projectId: task.project_id,
      assignedAgentId: task.assigned_agent_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      assignedAgent: task.assigned_agent_id ? agentMap.get(task.assigned_agent_id) ?? null : null,
      assignedTeam: null,
    })),
    members: [],
  }));

  return serializePrisma(normalizedProjects);
}

export async function deleteProjectAction(projectId: string) {
  const prisma = getPrisma();
  await prisma.project.delete({
    where: { id: projectId },
  });
  revalidatePath("/dashboard/task-center");
}

export async function updateProjectDocAction(projectId: string, newDoc: string) {
  const prisma = getPrisma();
  await prisma.project.update({
    where: { id: projectId },
    data: { documentation: newDoc },
  });
  revalidatePath("/dashboard/task-center");
}

export async function updateTaskStatusAction(taskId: string, newStatus: TaskStatus) {
  const prisma = getPrisma();
  await prisma.project_task.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  revalidatePath("/dashboard/task-center");
}

export async function assignTaskToAgentAction(taskId: string, agentId: string | null) {
  const prisma = getPrisma();
  await prisma.project_task.update({
    where: { id: taskId },
    data: { assigned_agent_id: agentId },
  });

  revalidatePath("/dashboard/task-center");
}

export async function addProjectMemberAction() {
  return;
}

export async function removeProjectMemberAction() {
  return;
}

export async function createProjectForOrganization(input: {
  organizationId: string;
  name: string;
  documentation?: string;
  tasklist: string;
}) {
  const prisma = getPrisma();
  const name = input.name?.trim();
  const tasklist = input.tasklist?.trim();

  if (!name || !tasklist) {
    throw new Error("Name and tasklist are required");
  }

  const code = `${name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 20)}_${Date.now()}`;

  const project = await prisma.project.create({
    data: {
      organization_id: input.organizationId,
      name,
      code,
      documentation: input.documentation?.trim() || null,
      status: "active",
    },
  });

  await injectTasksIntoProject(prisma, project.id, tasklist, input.organizationId);
  await dispatchToOpenClawSprint(prisma, project.id);

  revalidatePath("/dashboard/task-center");

  return project;
}

export async function createProjectAction(formData: FormData) {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) {
    throw new Error("Organization is required");
  }

  return createProjectForOrganization({
    organizationId,
    name: String(formData.get("name") || ""),
    documentation: String(formData.get("documentation") || ""),
    tasklist: String(formData.get("tasklist") || ""),
  });
}
