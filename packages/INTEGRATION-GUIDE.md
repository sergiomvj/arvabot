# Integração dos Packages @agent-hub

Este documento orienta a integração dos packages `task-center` e `rankings` em um projeto Next.js existente.

---

## 1. Instalação

Copie as pastas `packages/task-center` e `packages/rankings` para a raiz do seu projeto:

```
seu-projeto/
├── packages/
│   ├── task-center/
│   └── rankings/
├── src/
└── ...
```

Em seguida, instale as dependências de cada package:

```bash
cd packages/task-center && npm install
cd packages/rankings && npm install
```

---

## 2. Configuração do Prisma

Os packages precisam do Prisma Client para funcionar. Você deve inicializar o cliente antes de usar as Server Actions.

### Opção A: Provider (Recomendado)

Crie um provider em `src/app/providers.tsx`:

```tsx
"use client";

import { setPrismaClient as setTaskCenterPrisma } from "@agent-hub/task-center/actions";
import { setPrismaClient as setRankingsPrisma } from "@agent-hub/rankings/actions";
import { prisma } from "@/lib/prisma";

export function AgentHubProvider({ children }: { children: React.ReactNode }) {
  setTaskCenterPrisma(prisma);
  setRankingsPrisma(prisma);
  return children;
}
```

Adicione no seu layout principal em `src/app/layout.tsx`:

```tsx
import { AgentHubProvider } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AgentHubProvider>
          {children}
        </AgentHubProvider>
      </body>
    </html>
  );
}
```

### Opção B: Inicialização inline

Se preferir, você pode inicializar em cada página antes de usar as actions:

```tsx
import { setPrismaClient } from "@agent-hub/task-center/actions";
import { prisma } from "@/lib/prisma";

setPrismaClient(prisma);

// Agora pode usar as actions normalmente
```

---

## 3. Uso do Task Center

### Server Actions

```tsx
// src/app/task-center/page.tsx
import { getAllProjectsWithTasks, createProjectAction, deleteProjectAction } from "@agent-hub/task-center/actions";
import { ProjectCard, CreateProjectForm } from "@agent-hub/task-center/components";

export default async function TaskCenterPage() {
  const projects = await getAllProjectsWithTasks();

  const handleCreate = async (data: any) => {
    "use server";
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("documentation", data.documentation);
    formData.append("tasklist", data.tasklist);
    await createProjectAction(formData);
  };

  return (
    <div className="p-8">
      <CreateProjectForm onSubmit={handleCreate} />
      
      <div className="grid grid-cols-2 gap-6 mt-8">
        {projects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onDelete={deleteProjectAction}
          />
        ))}
      </div>
    </div>
  );
}
```

### Componentes Disponíveis

| Componente | Descrição |
|-------------|-----------|
| `Badge` | Badge estilizado para status |
| `TaskCard` | Card individual de tarefa |
| `ProjectCard` | Card de projeto com lista de tarefas |
| `CreateProjectForm` | Formulário para criar novo projeto |

### Tipos

```tsx
import type { Project, ProjectTask, TaskStatus } from "@agent-hub/task-center/types";
```

---

## 4. Uso do Rankings

### Server Actions

```tsx
// src/app/rankings/page.tsx
import { getPeriodRankings, getAgentProfile } from "@agent-hub/rankings/actions";
import { RankingTable } from "@agent-hub/rankings/components";
import Link from "next/link";

export default async function RankingsPage() {
  const periodCode = "monthly-2026-04";
  const { period, rankings } = await getPeriodRankings(periodCode);

  if (!period) {
    return <div>Nenhum ranking disponível</div>;
  }

  return (
    <div className="p-8">
      <h1>Ranking Global - {period.code}</h1>
      <RankingTable 
        rankings={rankings} 
        onAgentClick={(code) => {
          // Redirecionar para página do agente
          window.location.href = `/agents/${code}`;
        }} 
      />
    </div>
  );
}
```

### Componentes Disponíveis

| Componente | Descrição |
|-------------|-----------|
| `Badge` | Badge estilizado para bands (green, yellow, orange, red) |
| `RankingTable` | Tabela de rankings com medalhas |

### Tipos

```tsx
import type { RankingRow, PeriodScorecard, EvaluationPeriod } from "@agent-hub/rankings/types";
```

---

## 5. Configuração Adicional

### Tailwind CSS

Os componentes usam classes do Tailwind. Certifique-se de ter o Tailwind configurado no projeto. As seguintes configurações são usadas:

- Cores: `zinc`, `emerald`, `blue`, `amber`, `red`, `orange`, `yellow`
- Bordas: `border-white/10`, `border-white/5`
- Backgrounds: `bg-black/40`, `bg-white/5`, `bg-zinc-900/50`

### Ícones

Os componentes usam `lucide-react`. Já está incluso como dependência dos packages.

---

## 6. Resolução de Problemas

### "Prisma client not initialized"

Significa que você não chamou `setPrismaClient` antes de usar as actions. Adicione o provider conforme a seção 2.

### Erro de tipagem

Asegure-se de que o `tsconfig.json` do projeto está configurado para resolver os paths dos packages. Adicione se necessário:

```json
{
  "compilerOptions": {
    "paths": {
      "@agent-hub/task-center": ["./packages/task-center/src/index.ts"],
      "@agent-hub/rankings": ["./packages/rankings/src/index.ts"]
    }
  }
}
```

---

## 7. Customização

Os componentes são completamente customizáveis via props e className. Você pode:

- Sobrescrever estilos com a prop `className`
- Adicionar handlers para ações via props (`onDelete`, `onAgentClick`, etc.)
- Usar apenas os tipos sem os componentes se preferir

---

Dúvidas? Entre em contato com o time de desenvolvimento.
