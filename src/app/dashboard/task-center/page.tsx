import { getAllProjectsWithTasks, createProjectAction, deleteProjectAction } from "@agent-hub/task-center/actions";
import { ProjectCard, CreateProjectForm } from "@agent-hub/task-center/components";
import type { CreateProjectInput } from "@agent-hub/task-center/types";

export default async function TaskCenterPage() {
  const projects = await getAllProjectsWithTasks();

  const handleCreate = async (data: CreateProjectInput) => {
    "use server";
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.documentation) formData.append("documentation", data.documentation);
    formData.append("tasklist", data.tasklist);
    await createProjectAction(formData);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#07090F]">
      <header className="flex-shrink-0 h-14 border-b border-white/7 flex items-center justify-between px-6 bg-[#090C16]">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-white tracking-wide">TASK CENTER</h1>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-500 font-mono font-bold">OPERACIONAL</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 max-w-7xl mx-auto w-full">
        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-white">Projetos Ativos</h2>
            <p className="text-xs text-[#4a5580]">Gerencie as sprints e entregas dos seus agentes ARVA.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
               <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-emerald-500">Novo Projeto</h3>
               <CreateProjectForm onSubmit={handleCreate} />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {projects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-8 text-center bg-white/[0.01]">
                   <p className="text-[#4a5580] text-sm">Nenhum projeto encontrado. Comece criando um acima.</p>
                </div>
              ) : (
                projects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onDelete={deleteProjectAction}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
