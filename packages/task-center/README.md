# @agent-hub/task-center

Pacote standalone para gerenciamento de projetos e tarefas.

## Instalação

```bash
npm install @agent-hub/task-center
```

## Uso

### 1. Configure o Prisma Client

No seu projeto Next.js, inicialize o cliente Prisma no package:

```typescript
// app/task-center/provider.tsx
"use client";

import { setPrismaClient } from "@agent-hub/task-center/actions";
import { prisma } from "@/lib/prisma";

export function TaskCenterProvider({ children }: { children: React.ReactNode }) {
  setPrismaClient(prisma);
  return children;
}
```

### 2. Use os componentes

```tsx
// app/task-center/page.tsx
import { getAllProjectsWithTasks, deleteProjectAction } from "@agent-hub/task-center/actions";
import { ProjectCard, CreateProjectForm, TaskCard } from "@agent-hub/task-center/components";

export default async function TaskCenterPage() {
  const projects = await getAllProjectsWithTasks();

  return (
    <div>
      <CreateProjectForm onSubmit={async (data) => {
        // Crie um FormData e chame createProjectAction
      }} />
      
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

## Exports

- `types/` - Tipos TypeScript para Project, ProjectTask, etc.
- `components/` - Componentes React (Badge, TaskCard, ProjectCard, CreateProjectForm)
- `actions/` - Server Actions (createProjectAction, getAllProjectsWithTasks, etc.)
