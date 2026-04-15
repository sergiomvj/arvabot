# @agent-hub/rankings

Pacote standalone para rankings e tiers de agentes.

## Instalação

```bash
npm install @agent-hub/rankings
```

## Uso

### 1. Configure o Prisma Client

```typescript
// app/rankings/provider.tsx
"use client";

import { setPrismaClient } from "@agent-hub/rankings/actions";
import { prisma } from "@/lib/prisma";

export function RankingsProvider({ children }: { children: React.ReactNode }) {
  setPrismaClient(prisma);
  return children;
}
```

### 2. Use os componentes

```tsx
// app/rankings/page.tsx
import { getPeriodRankings } from "@agent-hub/rankings/actions";
import { RankingTable } from "@agent-hub/rankings/components";

export default async function RankingsPage() {
  const { period, rankings } = await getPeriodRankings("monthly-2026-04");

  return (
    <div>
      <RankingTable rankings={rankings} />
    </div>
  );
}
```

## Exports

- `types/` - Tipos TypeScript para RankingRow, PeriodScorecard, etc.
- `components/` - Componentes React (Badge, RankingTable)
- `actions/` - Server Actions (getPeriodRankings, getAgentProfile, etc.)
