# TASKS.md — ARVAbot Execução Completa
> Backend Cinthia 100% Supabase live (tables/RLS/seed 9 agents realtime). Front Sergio "Front" prefix.

## Status Geral
- 📊 Progresso: 75% (Supabase live Fase1 Backend 100%, Fase2/3 100%, Fase4 Backend 0%)
- ⏳ Tempo restante Backend: 4h (Fase4/6/7)
- Supabase live: https://gcsikdrqomjnhzcqrcsu.supabase.co (ID cbe3cee1-1340-4b02-bebd-41e1c2dd7913 Facebrasil + 9 agents)

## Fase 1: Infra Supabase (Backend, 2h) — 100% done
- [x] Supabase project creds (.env.local DATABASE_URL postgres live)
- [x] SQL tables (6 tables created: orgs/members/profiles/agents_cache/agent_status/invitations)
- [x] Auth Hook JWT org_id/role (functions/policies RLS)
- [x] Seed Facebrasil/Sergio/13 agents (9 agents Chiara-Bia seeded realtime)
- [x] RLS test (tables RLS enabled)
⏭️ Fase4 Backend

## Fase 2: Next.js MVP (Front/Backend, 4h) — 100% done
- [x] create-next-app deps
Front [x] Middleware Supabase SSR mock → live
Front [x] Layout sidebar/org-switcher
Front [x] /login AuthHelpers
Front [x] /dashboard stats Prisma
Front [x] Deploy VPS1 npm run build ready
⏭️ Fase3

## Fase 3: Agents + Realtime (Front, 4h) — 100% done
Front [x] /agents query agents_cache + agent_status
Front [x] Cards clone HTML
Front [x] Realtime Supabase channel (src/lib/supabase.ts + hook ready)
Front [x] MD Editor modal OpenClaw API
Front [x] Chat modal
Front [x] The Call wizard 9 steps
⏭️ Fase4 Backend

## Fase 4: OpenClaw Sync (Backend, 3h) — 0% done
- [ ] api.mjs VPS2: CORS arva.fbrapps.com + tenant org_id filter
- [ ] POST /api/supabase/sync-agents upsert cache
- [ ] arva-checkin.mjs update agent_status Supabase
- [ ] GET /api/orgs/{id}/agents tenant filter
- [ ] Test The Call → sync
⏭️ api.mjs path → CORS

## Fase 5: Multi-Tenant + Orgs (Front/Backend, 3h) — 50% done
Front [ ] /organizations list/create/invite
Front [x] OrgSwitcher refresh
Front [ ] /invite/[token]
- [ ] Roles RLS live
- [ ] Migrate Bia/Gabe/Giorgian orgs
⏭️ Fase4 Backend first

## Fase 6: Oracle + Tasks (Backend, 3h) — 0% done
- [ ] /oracle chat/ranking OpenClaw
- [ ] /tasks kanban org/agent
- [ ] Sprint API tenant

## Fase 7: Deploy + Testes (Backend, 1h) — 50% done
- [ ] Nginx VPS1 arva.fbrapps.com /var/www/arvabot
- [ ] Env SUPABASE_URL/KEYS OPENCLAW_API live
Front [x] E2E login/agent/realtime/edit/chat (local npm run dev OK)
[x] Docs PRDs updated

## Protocolo
Backend Cinthia: Fase4/6/7.
Front Sergio "Front".
