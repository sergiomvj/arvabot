import { redirect } from "next/navigation";

import { createProjectForOrganization, deleteProjectAction, getAllProjectsWithTasks, setPrismaClient } from "@agent-hub/task-center/actions";
import { CreateProjectForm, ProjectCard } from "@agent-hub/task-center/components";
import type { CreateProjectInput } from "@agent-hub/task-center/types";
import { prisma } from "@/lib/prisma";
import { getViewerContext } from "@/lib/viewer-context";

export default async function TaskCenterPage() {
  await setPrismaClient(prisma);

  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  if (!viewer.currentOrgId) redirect("/organizations");

  const projects = await getAllProjectsWithTasks(viewer.currentOrgId);

  const handleCreate = async (data: CreateProjectInput) => {
    "use server";
    await setPrismaClient(prisma);
    await createProjectForOrganization({
      organizationId: viewer.currentOrgId!,
      name: data.name,
      documentation: data.documentation,
      tasklist: data.tasklist,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#07090F]">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/7 bg-[#090C16] px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-wide text-white">TASK CENTER</h1>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-500">OPERACIONAL</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-10 overflow-y-auto p-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-white">Projetos Ativos</h2>
            <p className="text-xs text-[#4a5580]">Gerencie as sprints e entregas dos seus agentes ARVA.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-500">Novo Projeto</h3>
              <CreateProjectForm onSubmit={handleCreate} />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {projects.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                  <p className="text-sm text-[#4a5580]">Nenhum projeto encontrado. Comece criando um acima.</p>
                </div>
              ) : (
                projects.map((project) => <ProjectCard key={project.id} project={project} onDelete={deleteProjectAction} />)
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
