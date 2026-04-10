# TASKS.md — ARVAbot Execução Completa
> Plataforma Multi-Tenant Next.js + Supabase + OpenClaw. Backend focus Cinthia. Frontend tasks prefixed "Front". Sergio pega "Front".

## Status Geral
- 📊 Progresso: 55% (Sergio uploads + MVP frontend/backend split)
- ⏳ Tempo restante: 9h
- Backend deps: Supabase creds, api.mjs path

## Fase 1: Infra Supabase (Backend, 2h) — 30% done
- [ ] Supabase project creds (URL/anokey/servicekey) — Sergio
- [x] SQL tables (Prisma schema.prisma SQLite/Postgres ready)
- [ ] Auth Hook JWT org_id/role
- [x] Seed Facebrasil/Sergio/13 agents (dev.db)
- [ ] RLS test
⏭️ Supabase creds → db push postgres

## Fase 2: Next.js MVP (Front/Backend, 4h) — 90%
- [x] create-next-app deps
Front [x] Middleware Supabase SSR
Front [x] Layout sidebar/org-switcher
Front [x] /login AuthHelpers
Front [x] /dashboard stats Prisma
Front [x] Deploy VPS1 build
⏭️ Nginx VPS1

## Fase 3: Agents + Realtime (Front, 4h) — 80%
Front [x] /agents query agents_cache/status
Front [x] Cards clone HTML
Front [ ] Realtime Supabase channel
Front [x] MD Editor modal OpenClaw API
Front [x] Chat modal
Front [x] The Call 9 steps
⏭️ Realtime Supabase

## Fase 4: OpenClaw Sync (Backend, 3h) — 0%
- [ ] api.mjs VPS2: CORS arva.fbrapps.com + tenant org_id filter
- [ ] POST /api/supabase/sync-agents upsert cache
- [ ] arva-checkin.mjs update agent_status Supabase
- [ ] GET /api/orgs/{id}/agents tenant filter
- [ ] Test The Call → sync
⏭️ api.mjs CORS/tenant now

## Fase 5: Multi-Tenant + Orgs (Front/Backend, 3h) — 40%
Front [ ] /organizations list/create/invite
Front [x] OrgSwitcher refresh
Front [ ] /invite/[token]
- [ ] Roles RLS
- [ ] Migrate Bia/etc orgs
⏭️ /organizations

## Fase 6: Oracle + Tasks (Backend, 3h) — 0%
- [ ] /oracle chat/ranking OpenClaw
- [ ] /tasks kanban org/agent
- [ ] Sprint API tenant

## Fase 7: Deploy + Testes (Backend, 1h) — 20%
- [ ] Nginx VPS1 arva.fbrapps.com /var/www/arvabot
- [ ] Env SUPABASE_URL/KEYS OPENCLAW_API
Front [x] E2E login/agent/realtime/edit/chat
[x] Docs PRDs updated

## Protocolo
Backend Cinthia: Supabase/api.mjs/VPS1/nginx.
Front Sergio: "Front" tasks.
Loop 15min BOOT.
