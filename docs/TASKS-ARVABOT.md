# TASKS.md — ARVAbot Execução Completa
> Plataforma Multi-Tenant Next.js + Supabase + OpenClaw. Tasklist priorizada por fases. Ciclos 15min. Anti-abandono ativo.

## Status Geral
- 📊 Progresso: 5% (analise.md pronto)
- ⏳ Tempo estimado total: 20h (4 semanas)
- 🟢 Dependências: Supabase project, VPS1 nginx, OpenClaw api.mjs CORS

## Fase 1: Infra Supabase (2h | Prioridade Máxima)
✅ [x] Criar projeto Supabase (url/anokey/servicekey)
✅ [x] Executar SQL: organizations, organization_members, profiles, agents_cache, agent_status, invitations (RLS + indexes)
✅ [x] Configurar Auth Hook (org_id/org_role no JWT)
✅ [x] Inserir org Facebrasil (slug=facebrasil), user Sergio (admin/owner)
✅ [x] Popular agents_cache com 13 agentes atuais via script sync
- [ ] Test RLS: query agents_cache como user normal → só Facebrasil
⏭️ Next: Fase 1 completa → report HTML

## Fase 2: Next.js MVP (4h)
- [ ] `npx create-next-app@latest arvabot --ts --tailwind --app --src-dir --eslint`
- [ ] `npm i @supabase/supabase-js @supabase/ssr lucide-react clsx tailwind-merge`
- [ ] Middleware: Supabase SSR auth + org_id from JWT
- [ ] Layout: Sidebar (org switcher + nav: agents/tasks/oracle/orgs)
- [ ] /login: Supabase AuthHelpers
- [ ] /dashboard: Stats bar (agents online, tasks, etc.) + agents grid (de HTML)
- [ ] Deploy VPS1: `npm run build` → /var/www/arva.fbrapps.com
⏭️ Next: Nginx SSL + teste login

## Fase 3: Agents Page + Realtime (4h)
- [ ] /agents/page.tsx: Query agents_cache + agent_status (useAgents hook)
- [ ] Cards: Clone HTML (header/metrics/MD-pills/SMT/IRO/SAPP/actions)
- [ ] Realtime: Supabase channel('agent-status') → update cards
- [ ] MD Editor modal: Fetch/PUT via OpenClaw API (/api/agents/{id}/workspace/{file})
- [ ] Chat modal: POST /api/chat/{id} (OpenClaw)
- [ ] The Call wizard: 9 steps (clone JS do HTML)
⏭️ Next: Sync endpoints

## Fase 4: OpenClaw Sync (3h)
- [ ] api.mjs (VPS2): CORS arva.fbrapps.com + tenant middleware (organization_id filter)
- [ ] POST /api/supabase/sync-agents: Upsert agents_cache (service_key)
- [ ] arva-checkin.mjs: Update agent_status realtime no Supabase
- [ ] GET /api/organizations/{id}/agents: Filtrado por tenant
- [ ] Test: Criar agente via The Call → sync no Supabase
⏭️ Next: Multi-tenant features

## Fase 5: Multi-Tenant + Orgs (3h)
- [ ] /organizations: List + create + invite (email token)
- [ ] OrgSwitcher: Select current_org_id → refresh data
- [ ] Invite accept: /invite/[token] → join org
- [ ] Roles: owner/admin/member/viewer (RLS)
- [ ] Migrate Bia/Gabe/Giorgian para orgs separadas
⏭️ Next: Oracle/Tasks

## Fase 6: Oracle + Tasks (3h)
- [ ] /oracle/page.tsx: Chat ORACLE + ranking (OpenClaw endpoints)
- [ ] /tasks: Kanban filtrado por org/agent
- [ ] Sprint API: POST /api/sprint (tenant-scoped)
⏭️ Next: Deploy prod + polish

## Fase 7: Deploy + Testes (1h)
- [ ] Nginx VPS1: arva.fbrapps.com → /var/www/arvabot/dist
- [ ] Env: SUPABASE_URL/KEYS + OPENCLAW_API_URL/KEY
- [ ] E2E: Login → create agent → realtime → edit MD → chat
- [ ] Docs: UPDATE PRDs com links reais

## Protocolo Execução (BOOT)
1. Confirmar escopo
2. Loop 15min: ✅ AÇÃO | 📊 % | ⏭️ Next
3. Bloqueio → @chiara em 15min
4. HTML report cada fase via save-html.sh

*Iniciando Fase 1 · Cinthia · 2026*
