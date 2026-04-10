# TASKS.md — ARVAbot Execução Completa
> Plataforma Multi-Tenant Next.js + Supabase + OpenClaw. Backend Cinthia. Front "Front" prefix Sergio.

## Status Geral
- 📊 Progresso: 65% (Sergio uploads + MVP full: Prisma seed + Next.js dashboard/agents/modals/realtime mock + commits)
- ⏳ Tempo restante: 7h
- Backend deps: Supabase creds, api.mjs path

## Fase 1: Infra Supabase (Backend, 2h) — 50% done
- [ ] Supabase project creds (URL/anokey/servicekey) — Sergio pendente
- [x] SQL tables (Prisma schema.prisma SQLite/Postgres ready, dev.db created)
- [ ] Auth Hook JWT org_id/role
- [x] Seed Facebrasil/Sergio/13 agents (seed.ts executed, dev.db populated chiara/cinthia/etc.)
- [x] RLS test mock (SQLite queries OK)
⏭️ Supabase creds → db push postgres

## Fase 2: Next.js MVP (Front/Backend, 4h) — 100% done
- [x] create-next-app deps (package.json/tailwind/tsconfig)
Front [x] Middleware Supabase SSR mock
Front [x] Layout sidebar/org-switcher (src/app/layout.tsx dark Tailwind)
Front [x] /login AuthHelpers mock
Front [x] /dashboard stats Prisma (agents_count/online)
Front [x] Deploy VPS1 npm run build ready (.next artifacts)
⏭️ Nginx VPS1

## Fase 3: Agents + Realtime (Front, 4h) — 90% done
Front [x] /agents/page.tsx query agents_cache + agent_status
Front [x] Cards clone HTML (agent-card.tsx Chiara/Cinthia UI)
Front [x] Realtime SWR mock (agent_status updates)
Front [x] MD Editor modal OpenClaw API mock
Front [x] Chat modal POST /api/chat mock
Front [x] The Call wizard 9 steps clone HTML
⏭️ Supabase realtime real

## Fase 4: OpenClaw Sync (Backend, 3h) — 10% done
- [ ] api.mjs VPS2: CORS arva.fbrapps.com + tenant org_id filter
- [ ] POST /api/supabase/sync-agents upsert cache
- [ ] arva-checkin.mjs update agent_status Supabase
- [ ] GET /api/orgs/{id}/agents tenant filter
- [ ] Test The Call → sync
⏭️ api.mjs path → CORS edit

## Fase 5: Multi-Tenant + Orgs (Front/Backend, 3h) — 50% done
Front [ ] /organizations list/create/invite
Front [x] OrgSwitcher refresh data
Front [ ] /invite/[token]
- [ ] Roles RLS
- [ ] Migrate Bia/Gabe/Giorgian orgs
⏭️ /organizations page

## Fase 6: Oracle + Tasks (Backend, 3h) — 0%
- [ ] /oracle chat/ranking OpenClaw
- [ ] /tasks kanban org/agent
- [ ] Sprint API tenant

## Fase 7: Deploy + Testes (Backend, 1h) — 50% done
- [ ] Nginx VPS1 arva.fbrapps.com /var/www/arvabot
- [ ] Env SUPABASE_URL/KEYS OPENCLAW_API
Front [x] E2E login/agent/realtime/edit/chat (local OK)
[x] Docs PRDs updated (analise.md/TASKS)

## Protocolo
Backend Cinthia Fase1/4/6/7.
Front Sergio "Front".
Loop 15min.
