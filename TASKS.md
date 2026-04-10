# Efficient Hub Core - TASKS.md
> Tasklist completa para construção da aplicação core. Execução em ciclos de 15min. Atualizada dinamicamente.

## Fase 1: Setup Projeto (Target: 30min)
- [ ] Init Next.js 14 app: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [ ] Instalar deps core: `npm i prisma @prisma/client recharts lucide-react date-fns clsx tailwind-merge @types/node`
- [ ] Setup git branch: `git checkout -b feature/efficient-hub-core`
- [ ] Configurar Tailwind config para dark mode + custom colors (agents: #0EA5E9 cinthia, etc.)
- [ ] Criar estrutura dirs: `src/app/(dashboard)/(agents|tasks|alerts)/page.tsx` + `src/lib/` (utils/db/types)

## Fase 2: Database Schema (Target: 45min)
- [ ] Init Prisma: `npx prisma init`
- [ ] Schema models:
  ```
  model Agent {
    id        String   @id @default(uuid())
    name      String   @unique
    color     String
    tasks     Task[]
    delays    Delay[]
    sessions  Session[]
  }
  model Task {
    id         String @id @default(uuid())
    agentId    String
    title      String
    status     String // pending|in-progress|done|blocked
    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt
    agent      Agent   @relation(fields: [agentId], references: [id])
  }
  model Delay {
    id        String @id @default(uuid())
    agentId   String
    ms        Int
    reason    String?
    timestamp DateTime @default(now())
    agent     Agent   @relation(fields: [agentId], references: [id])
  }
  model Session {
    id        String @id @default(uuid())
    agentId   String
    key       String @unique
    lastSeen  DateTime @default(now())
    messages  Int
    agent     Agent   @relation(fields: [agentId], references: [id])
  }
  ```
- [ ] Migração: `npx prisma db push` (local SQLite init, migrate to Postgres deploy)
- [ ] Seed inicial: agents fixos (chiara, cinthia, david, etc.)

## Fase 3: Backend APIs (Target: 60min)
- [ ] API route `/api/agents`: List agents + metrics (tasks count, avg delay)
- [ ] API `/api/track`: POST ingest session_list output → parse delays/tasks
- [ ] API `/api/score`: GET efficiency score (e.g. tasks_done / total * 100 - delay_penalty)
- [ ] Cron job (via Vercel cron): Poll OpenClaw sessions_list a cada 5min → ingest DB
- [ ] Alert webhook: POST para Telegram/OpenClaw se delay >15min

## Fase 4: Frontend Dashboard (Target: 90min)
- [ ] Layout root: Sidebar agents + header metrics global
- [ ] Page /agents: Tabela real-time (Recharts: delay trends, tasks backlog)
- [ ] Page /tasks: Kanban pendentes/bloqueadas (drag-drop optional)
- [ ] Page /alerts: Lista delays críticos + auto-escala (@chiara)
- [ ] Real-time: Supabase Realtime ou SWR + polling 30s
- [ ] Auth middleware: Apenas Sergio/Cinthia (hardcoded JWT ou Clerk dev)

## Fase 5: Integração OpenClaw (Target: 45min)
- [ ] Script ingest.py: Parse sessions_list JSON → Prisma upsert
- [ ] OpenClaw tool mock: Endpoint simula sessions_list output
- [ ] Efficiency calc: Delay ms = (updatedAt - createdAt) - expected_15min

## Fase 6: Deploy & Auth (Target: 30min)
- [ ] Vercel deploy: `vercel --prod` (env: DATABASE_URL)
- [ ] Postgres: Supabase/Railway free tier
- [ ] Auth: NextAuth/JWT secret, roles: ['sergio', 'cinthia']
- [ ] Access: openclaw.fbrapps.com/efficient-hub (iframe ou direct)

## Fase 7: Monitoring & Polish (Target: 60min)
- [ ] HTML Report generator: save-html.sh → dashboard screenshot
- [ ] Mobile responsive + dark mode toggle
- [ ] Error boundaries + logging Sentry
- [ ] Push to main + PR review

## Protocolo Execução
- Ciclo 15min: ✅ AÇÃO: [descrição] | 📊 Progresso: X% | ⏭️ Next: [task]
- Bloqueio: Escala Sergio imediato
- Preview: Cada fase → HTML output

Total estimado: 5h. Início Fase 1 agora.

