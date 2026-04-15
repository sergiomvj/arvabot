"use server";

import { revalidatePath } from "next/cache";
import { injectTasksIntoProject } from "../utils/markdownParser";
import { dispatchToOpenClawSprint } from "../utils/openclawIntegration";
import { serializePrisma } from "../utils/serialization";
import type { CreateProjectInput, ProjectWithTasks, TaskStatus } from "../types";

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

export async function createProjectAction(formData: FormData) {
  const prisma = getPrisma();
  const name = formData.get("name") as string;
  const documentation = formData.get("documentation") as string;
  const tasklist = formData.get("tasklist") as string;

  if (!name || !tasklist) {
    throw new Error("Name and Tasklist are required");
  }

  const code = name.toUpperCase().replace(/\s+/g, "_").slice(0, 20) + "_" + Date.now();

  const project = await prisma.project.create({
    data: {
      name,
      code,
      documentation,
      status: "active",
    }
  });

  await injectTasksIntoProject(prisma, project.id, tasklist);
  await dispatchToOpenClawSprint(prisma, project.id);

  revalidatePath("/task-center");
}

export async function updateProjectDocAction(projectId: string, newDoc: string) {
  const prisma = getPrisma();
  await prisma.project.update({
    where: { id: projectId },
    data: { documentation: newDoc }
  });
  revalidatePath(`/task-center`);
  revalidatePath(`/task-center/project/${projectId}`);
}

export async function addProjectMemberAction(projectId: string, agentId: string) {
  const prisma = getPrisma();
  await prisma.project.update({
    where: { id: projectId },
    data: {
      members: {
        connect: { id: agentId }
      }
    }
  });
  revalidatePath(`/task-center/project/${projectId}`);
}

export async function removeProjectMemberAction(projectId: string, agentId: string) {
  const prisma = getPrisma();
  await prisma.project.update({
    where: { id: projectId },
    data: {
      members: {
        disconnect: { id: agentId }
      }
    }
  });
  revalidatePath(`/task-center/project/${projectId}`);
}

export async function deleteProjectAction(projectId: string) {
  const prisma = getPrisma();
  await prisma.project.delete({
    where: { id: projectId }
  });
  revalidatePath("/task-center");
}

export async function getAllProjectsWithTasks(): Promise<ProjectWithTasks[]> {
  const prisma = getPrisma();
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tasks: {
        include: {
          assignedAgent: true,
          assignedTeam: true,
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  return serializePrisma(projects);
}

export async function updateTaskStatusAction(taskId: string, newStatus: TaskStatus) {
  const prisma = getPrisma();
  const task = await prisma.projectTask.update({
    where: { id: taskId },
    data: { status: newStatus },
    select: { projectId: true }
  });
  
  revalidatePath("/task-center");
  revalidatePath(`/task-center/project/${task.projectId}`);
}

export async function assignTaskToAgentAction(taskId: string, agentId: string | null) {
  const prisma = getPrisma();
  const task = await prisma.projectTask.update({
    where: { id: taskId },
    data: { assignedAgentId: agentId },
    select: { projectId: true }
  });

  revalidatePath("/task-center");
  revalidatePath(`/task-center/project/${task.projectId}`);
}
