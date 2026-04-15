# Implementation Plan — Incorporação de Recursos do OpenSquad no ArvaBot

## Premissas

Este plano foi elaborado com base em:

- `docs/comparativo-opensquad-arvabot.md`
- `docs/PRD-ARVABOTS-supabase.md`
- `docs/PRD-ARVABOTS-multitenant.md`
- estrutura atual do projeto Next.js + Supabase + Prisma

Arquivos canônicos FBR esperados pelo workflow de planejamento não foram encontrados no workspace:

- `fbr-arquitetura.md`
- `securitycoderules.md`
- `DESIGN_STANDARDS.md`

Por isso, este plano assume como invariantes de arquitetura:

- multi-tenancy continua sendo garantido por `organization_id` + RLS no Supabase
- OpenClaw permanece como runtime operacional e source of truth para execução do agente
- ArvaBot continua como camada SaaS administrativa, de orquestração e observabilidade
- nenhum recurso novo pode quebrar as rotas existentes de `agents`, `tasks`, `organizations`, `oracle` e `invite`
- toda feature nova deve nascer tenant-aware
- toda execução multiagente relevante deve ser auditável

---

## Documento de Algoritmo

### 1. Definição de Sistema

SISTEMA: ArvaBot Orchestration Layer  
PROPOSITO: adicionar orquestração multiagente, checkpoints, skills e observabilidade operacional ao ArvaBot sem romper a arquitetura multi-tenant existente  
TIPO: Hub Central  
CANAL FBR-CLICK: N/A  
OWNER: Tech Lead Plataforma ArvaBot

### 2. Entidades Centrais

ENTIDADE: FlowDefinition  
ATRIBUTOS OBRIGATORIOS: `id: uuid`, `organization_id: uuid`, `slug: string`, `name: string`, `status: enum`, `autonomy_mode: enum`, `created_at: timestamptz`  
ATRIBUTOS OPCIONAIS: `description?: string`, `icon?: string`, `metadata?: jsonb`  
INVARIANTES:
- `organization_id` é obrigatório
- `slug` é único por organização
- `autonomy_mode` pertence a `interactive | autonomous`
- flow arquivado não aceita novas execuções
RELACIONAMENTOS:
- `FlowDefinition ->[1:N]-> FlowStep via flow_id`
- `FlowDefinition ->[1:N]-> FlowRun via flow_id`
CICLO DE VIDA: `[DRAFT -> ACTIVE -> ARCHIVED]`

ENTIDADE: FlowStep  
ATRIBUTOS OBRIGATORIOS: `id: uuid`, `flow_id: uuid`, `step_order: integer`, `name: string`, `step_type: enum`, `agent_ref: string`, `checkpoint_type: enum`  
ATRIBUTOS OPCIONAIS: `prompt_template?: text`, `skill_bindings?: jsonb`, `timeout_seconds?: integer`, `config?: jsonb`  
INVARIANTES:
- `step_order` é único dentro do flow
- último step de flow `interactive` deve ter `checkpoint_type = approve`
- `checkpoint_type` pertence a `approve | select | skip`
RELACIONAMENTOS:
- `FlowStep ->[N:1]-> FlowDefinition via flow_id`
CICLO DE VIDA: `[CREATED -> CONFIGURED -> ACTIVE -> DISABLED]`

ENTIDADE: FlowRun  
ATRIBUTOS OBRIGATORIOS: `id: uuid`, `organization_id: uuid`, `flow_id: uuid`, `status: enum`, `started_by: uuid`, `started_at: timestamptz`  
ATRIBUTOS OPCIONAIS: `current_step?: integer`, `completed_at?: timestamptz`, `failed_at?: timestamptz`, `input_payload?: jsonb`, `output_summary?: jsonb`  
INVARIANTES:
- toda run pertence a um flow da mesma organização
- `status` pertence a `queued | running | checkpoint | completed | failed | aborted`
- `completed_at` só pode existir quando `status = completed`
RELACIONAMENTOS:
- `FlowRun ->[1:N]-> FlowRunStep via flow_run_id`
- `FlowRun ->[1:N]-> FlowCheckpoint via flow_run_id`
CICLO DE VIDA: `[QUEUED -> RUNNING -> CHECKPOINT -> COMPLETED]` ou `[QUEUED -> RUNNING -> FAILED]` ou `[QUEUED -> RUNNING -> ABORTED]`

ENTIDADE: FlowCheckpoint  
ATRIBUTOS OBRIGATORIOS: `id: uuid`, `organization_id: uuid`, `flow_run_id: uuid`, `flow_run_step_id: uuid`, `checkpoint_type: enum`, `status: enum`, `prompt: text`, `created_at: timestamptz`  
ATRIBUTOS OPCIONAIS: `feedback_text?: text`, `selection_payload?: jsonb`, `resolved_by?: uuid`, `resolved_at?: timestamptz`  
INVARIANTES:
- checkpoint aberto bloqueia avanço automático da run
- `status` pertence a `open | approved | feedback | aborted | selected`
- feedback só pode existir quando `status = feedback`
RELACIONAMENTOS:
- `FlowCheckpoint ->[N:1]-> FlowRun`
- `FlowCheckpoint ->[N:1]-> FlowRunStep`
CICLO DE VIDA: `[OPEN -> APPROVED]` ou `[OPEN -> FEEDBACK]` ou `[OPEN -> SELECTED]` ou `[OPEN -> ABORTED]`

ENTIDADE: SkillDefinition  
ATRIBUTOS OBRIGATORIOS: `id: uuid`, `code: string`, `name: string`, `type: enum`, `status: enum`, `scope: enum`  
ATRIBUTOS OPCIONAIS: `description?: text`, `provider?: string`, `config_schema?: jsonb`, `plan_gate?: string`  
INVARIANTES:
- `code` é globalmente único
- `type` pertence a `mcp | script | hybrid | internal-api`
- skill inativa não pode ser vinculada a novo flow
RELACIONAMENTOS:
- `SkillDefinition ->[1:N]-> OrganizationSkillBinding`
CICLO DE VIDA: `[DRAFT -> ACTIVE -> DEPRECATED -> DISABLED]`

ENTIDADE: OrganizationSkillBinding  
ATRIBUTOS OBRIGATORIOS: `id: uuid`, `organization_id: uuid`, `skill_id: uuid`, `status: enum`, `enabled_at: timestamptz`  
ATRIBUTOS OPCIONAIS: `secret_ref?: string`, `config?: jsonb`, `enabled_by?: uuid`  
INVARIANTES:
- binding é único por `organization_id + skill_id`
- segredos nunca são persistidos em plaintext em coluna de uso geral
RELACIONAMENTOS:
- `OrganizationSkillBinding ->[N:1]-> SkillDefinition`
- `OrganizationSkillBinding ->[N:1]-> Organization`
CICLO DE VIDA: `[ENABLED -> DISABLED]`

### 3. Fluxos Algorítmicos

FLUXO: CriarFlow  
TRIGGER: request HTTP `POST /api/flows`  
PRE-CONDICOES:
- usuário autenticado
- usuário pertence à organização ativa
- usuário possui role `owner | admin`
PASSOS:
1. RECEBER payload com `name`, `slug`, `autonomy_mode`, `steps[]`
2. VALIDAR que `slug` não existe para `organization_id`
3. VALIDAR que `steps.length >= 1`
4. VALIDAR que cada `step_order` é único
5. SE `autonomy_mode = interactive`, VALIDAR que o último step possui `checkpoint_type = approve`
6. INSERT em `flow_definitions`
7. INSERT em lote em `flow_steps`
8. RETURN `201` com `flow_id`
POS-CONDICOES:
- flow persistido com steps ordenados
CASOS DE FALHA:
- SE `slug` duplicado: RETURN `409`
- SE role insuficiente: RETURN `403`
- SE payload inválido: RETURN `422`
INVARIANTES DE SEGURANCA:
- escopo sempre filtrado por `organization_id`
- nenhuma criação sem usuário autenticado

FLUXO: IniciarRun  
TRIGGER: request HTTP `POST /api/flows/:id/runs`  
PRE-CONDICOES:
- flow existe e pertence à organização atual
- flow está `ACTIVE`
- usuário possui permissão para executar
PASSOS:
1. BUSCAR flow e steps ordenados
2. INSERT em `flow_runs` com status `queued`
3. INSERT do primeiro `flow_run_step` com status `pending`
4. ENFILEIRAR job interno ou iniciar executor server-side
5. TRANSICIONAR run para `running`
6. EXECUTAR step atual usando `agent_ref` + `skill_bindings` + `input_payload`
7. PERSISTIR `output_artifact` do step
8. SE `checkpoint_type = skip`, avançar para próximo step
9. SE `checkpoint_type != skip`, abrir registro em `flow_checkpoints` e pausar run
10. SE não houver próximo step, marcar run `completed`
POS-CONDICOES:
- run criada e auditável
- status refletido em backend e UI
CASOS DE FALHA:
- SE execução falhar: marcar step `failed` e run `failed`
- SE flow não encontrado: RETURN `404`
INVARIANTES DE SEGURANCA:
- executor nunca pode avançar run entre organizações
- artefatos devem carregar referência de `organization_id`

FLUXO: ResolverCheckpoint  
TRIGGER: request HTTP `POST /api/flow-checkpoints/:id/resolve`  
PRE-CONDICOES:
- checkpoint pertence à organização atual
- checkpoint está `open`
- usuário possui role `owner | admin | member` conforme política do flow
PASSOS:
1. RECEBER ação `approve | feedback | abort | select`
2. VALIDAR ação compatível com `checkpoint_type`
3. SE `approve`, marcar checkpoint `approved`
4. SE `feedback`, persistir `feedback_text`, marcar checkpoint `feedback`, recriar execução do mesmo step
5. SE `select`, persistir `selection_payload`, marcar checkpoint `selected`, filtrar saída para próximo step
6. SE `abort`, marcar checkpoint `aborted` e run `aborted`
7. SE ação permitir continuidade, reativar run e avançar executor
POS-CONDICOES:
- checkpoint sai do estado `open`
- run é retomada ou encerrada
CASOS DE FALHA:
- SE checkpoint não pertence à org: RETURN `404`
- SE ação inválida: RETURN `422`
INVARIANTES DE SEGURANCA:
- toda ação de checkpoint registra `resolved_by`
- toda ação irreversível é auditada

FLUXO: HabilitarSkillNaOrganizacao  
TRIGGER: request HTTP `POST /api/organization-skills`  
PRE-CONDICOES:
- usuário autenticado
- role `owner | admin`
- skill existe e está `ACTIVE`
PASSOS:
1. BUSCAR skill por `code`
2. VALIDAR plano da organização contra `plan_gate`
3. VALIDAR config recebida contra `config_schema`
4. PERSISTIR binding em `organization_skill_bindings`
5. REGISTRAR evento de auditoria
POS-CONDICOES:
- organização passa a poder vincular a skill a flows
CASOS DE FALHA:
- SE plano não permite: RETURN `403`
- SE binding já existe: RETURN `409`
INVARIANTES DE SEGURANCA:
- secrets externos não retornam no payload de leitura

FLUXO: ObservarRunsEmTempoReal  
TRIGGER: subscribe client + atualização backend  
PRE-CONDICOES:
- usuário autenticado
- usuário pertence à organização
PASSOS:
1. FRONT carrega lista de runs por `organization_id`
2. FRONT assina canal realtime filtrado por `organization_id`
3. BACKEND emite atualização ao alterar `flow_runs`, `flow_run_steps`, `flow_checkpoints`
4. FRONT reconcilia estado local
5. SE socket falhar, entrar em polling com backoff
POS-CONDICOES:
- usuário vê run, step atual, checkpoint e status final sem refresh manual
CASOS DE FALHA:
- SE realtime indisponível: polling mantém leitura
INVARIANTES DE SEGURANCA:
- nenhum canal compartilha dados entre organizações

### 4. Contratos de Interface

CONTRATO: CreateFlow  
TIPO: REST  
DIRECAO: Frontend ArvaBot -> API ArvaBot  
AUTENTICACAO: JWT Supabase  
PAYLOAD:
```json
{
  "name": "string",
  "slug": "string",
  "description": "string?",
  "autonomy_mode": "interactive | autonomous",
  "steps": [
    {
      "step_order": 1,
      "name": "string",
      "step_type": "agent_task",
      "agent_ref": "string",
      "checkpoint_type": "approve | select | skip",
      "skill_bindings": []
    }
  ]
}
```
RESPOSTA_SUCESSO: `201 { id, slug, status }`  
RESPOSTA_ERRO: `403 | 409 | 422`  
IDEMPOTENTE: NAO  
RATE_LIMIT: SIM - 30 req/min por usuário

CONTRATO: StartFlowRun  
TIPO: REST  
DIRECAO: Frontend ArvaBot -> API ArvaBot  
AUTENTICACAO: JWT Supabase  
PAYLOAD:
```json
{
  "input_payload": {},
  "execution_label": "string?"
}
```
RESPOSTA_SUCESSO: `201 { run_id, status }`  
RESPOSTA_ERRO: `403 | 404 | 422`  
IDEMPOTENTE: NAO  
RATE_LIMIT: SIM - 10 req/min por usuário

CONTRATO: ResolveCheckpoint  
TIPO: REST  
DIRECAO: Frontend ArvaBot -> API ArvaBot  
AUTENTICACAO: JWT Supabase  
PAYLOAD:
```json
{
  "action": "approve | feedback | abort | select",
  "feedback_text": "string?",
  "selection_payload": {}
}
```
RESPOSTA_SUCESSO: `200 { checkpoint_id, status, run_status }`  
RESPOSTA_ERRO: `403 | 404 | 422`  
IDEMPOTENTE: NAO  
RATE_LIMIT: SIM - 20 req/min por usuário

CONTRATO: RunsRealtimeFeed  
TIPO: WebSocket | Supabase Realtime  
DIRECAO: API/DB ArvaBot -> Frontend ArvaBot  
AUTENTICACAO: JWT Supabase  
PAYLOAD:
```json
{
  "organization_id": "uuid",
  "run_id": "uuid",
  "status": "running | checkpoint | completed | failed | aborted",
  "current_step": 2,
  "updated_at": "iso-date"
}
```
RESPOSTA_SUCESSO: evento entregue ao cliente autorizado  
RESPOSTA_ERRO: conexão negada ou stream vazia  
IDEMPOTENTE: SIM  
RATE_LIMIT: NAO

### 5. Invariantes Globais

- toda tabela nova relevante possui `organization_id` quando aplicável
- RLS deve existir em todas as tabelas de leitura direta pelo frontend
- nenhum secret externo pode ser salvo em plaintext visível em queries client-side
- nenhum fluxo pode executar ou ler dados de outra organização
- toda run multiagente deve ser auditável por status, step e timestamps
- todo checkpoint deve registrar quem resolveu e qual ação tomou
- flow `interactive` deve terminar com `checkpoint approve`
- nenhuma skill inativa pode ser usada em novo flow
- frontend deve possuir fallback de observabilidade quando realtime falhar
- nenhum recurso novo deve quebrar rotas atuais de `agents`, `tasks`, `oracle` e `organizations`

---

## Plano de Batches

### Matriz de Foco dos Batches

| Entregável | Batch principal |
|---|---|
| Arquitetura de Squads | Batch 2 |
| Agente Arquiteto | Batch 3 |
| Checkpoints de Aprovação | Batch 4 |
| Sistema de Skills Modular | Batch 5 |
| Sherlock (Investigation) | Batch 6 |
| Sessões de Navegador Persistentes | Batch 6 |
| Refatoração de Conteúdo | Batch 7 |
| Escritório Virtual (2D) | Batch 8 |

### BATCH: 1 - Fundação Técnica e Guardrails
DIAS: 1-4  
PARALELO_COM: N/A  
OBJETIVO_ALGORITMICO: preparar a fundação técnica que viabiliza todos os entregáveis sem quebrar o ArvaBot atual

PRE-REQUISITOS:
- validação do modelo de dados
- definição dos nomes finais de tabelas e enums

ESCOPO:
- schema de flows, steps, runs, run_steps, checkpoints, skills e bindings
- migrations SQL e Prisma
- tipos TypeScript e contratos de API
- políticas RLS e índices mínimos

FORA DE ESCOPO:
- comportamento final dos squads
- browser automation
- UI de cliente final

CRITERIOS DE DONE DO BATCH:
- [ ] tabelas e índices existem em migration reproduzível
- [ ] RLS e filtros por organização estão definidos nas tabelas novas
- [ ] tipos e contratos de API estão versionados no código

### BATCH: 2 - Arquitetura de Squads
DIAS: 5-8  
PARALELO_COM: N/A  
OBJETIVO_ALGORITMICO: entregar a capacidade de orquestrar múltiplos agentes em pipeline sequencial

PRE-REQUISITOS:
- Batch 1 completo

ESCOPO:
- endpoints CRUD de flows
- modelagem de steps sequenciais
- criação manual de squads/flows por organização
- execução inicial de runs
- read models básicos de runs

FORA DE ESCOPO:
- checkpoints humanos completos
- skill catalog
- browser investigation

CRITERIOS DE DONE DO BATCH:
- [ ] admin cria um squad com múltiplos agentes e steps válidos
- [ ] uma run percorre etapas sequenciais com persistência de estado
- [ ] requests inválidos retornam `403`, `404`, `409` ou `422` conforme contrato

### BATCH: 3 - Agente Arquiteto (The Call 2.0)
DIAS: 9-13  
PARALELO_COM: N/A  
OBJETIVO_ALGORITMICO: evoluir o The Call para um agente que desenha squads dinâmicos com base na dor do cliente

PRE-REQUISITOS:
- Batch 2 completo

ESCOPO:
- fluxo guiado para coletar objetivo, canal, restrições e tipo de entrega
- sugestão automática de squad, etapas e agentes
- geração de flow draft a partir da conversa
- opção de editar/aceitar antes de ativar

FORA DE ESCOPO:
- execução com browser
- Virtual Office
- presets avançados por canal

CRITERIOS DE DONE DO BATCH:
- [ ] The Call gera um flow draft funcional a partir de briefing do cliente
- [ ] usuário consegue aprovar e salvar o draft sem edição manual obrigatória
- [ ] o draft respeita multi-tenancy e catálogo de agentes permitido

### BATCH: 4 - Checkpoints de Aprovação
DIAS: 14-18  
PARALELO_COM: Batch 4A UI de Aprovação  
OBJETIVO_ALGORITMICO: pausar runs em checkpoints, coletar decisão humana e retomar fluxo

PRE-REQUISITOS:
- Batch 2 completo

ESCOPO:
- abertura de checkpoints
- resolução `approve`, `feedback`, `abort`, `select`
- reexecução do mesmo step com feedback
- filtro de saída para `select`

FORA DE ESCOPO:
- Virtual Office
- browser investigation

CRITERIOS DE DONE DO BATCH:
- [ ] run com checkpoint para corretamente em `checkpoint`
- [ ] ação humana altera o estado esperado e audita `resolved_by`
- [ ] feedback reexecuta o step sem duplicar run indevidamente

### BATCH: 5 - Sistema de Skills Modular
DIAS: 19-23  
PARALELO_COM: Batch 5A Admin UX  
OBJETIVO_ALGORITMICO: transformar capacidades opcionais em skills instaláveis/removíveis por organização

PRE-REQUISITOS:
- Batch 1 completo
- Batch 2 completo

ESCOPO:
- catálogo de skills
- binding por organização
- gates por plano
- vinculação de skill a step
- duas ou três skills piloto integradas

FORA DE ESCOPO:
- escritório virtual
- sessões persistentes
- presets de refatoração

CRITERIOS DE DONE DO BATCH:
- [ ] admin habilita e desabilita skills por organização
- [ ] step de squad consegue usar skill habilitada
- [ ] skills indisponíveis por plano são bloqueadas corretamente

### BATCH: 6 - Sherlock + Sessões de Navegador Persistentes
DIAS: 24-28  
PARALELO_COM: N/A  
OBJETIVO_ALGORITMICO: dar ao ArvaBot capacidade real de investigação com browser e continuidade autenticada em plataformas externas

PRE-REQUISITOS:
- Batch 5 completo

ESCOPO:
- skill/browser service com Playwright
- captura de padrões de estilo, referências e dados de URLs
- armazenamento seguro de sessão/cookies por organização
- política de uso explícita para ambientes logados
- integração do Sherlock como step de squad

FORA DE ESCOPO:
- publicação social completa em produção para todos os canais
- suporte universal a qualquer site sem regras

CRITERIOS DE DONE DO BATCH:
- [ ] um squad consegue investigar uma URL usando navegador headless
- [ ] a sessão persistente pode ser reutilizada em nova run da mesma organização
- [ ] cookies e dados sensíveis não vazam para outras organizações ou para a UI

### BATCH: 7 - Refatoração de Conteúdo e Presets
DIAS: 29-34  
PARALELO_COM: Batch 7A Seed Templates  
OBJETIVO_ALGORITMICO: entregar pipelines prontos de transformação de conteúdo por canal e caso de uso

PRE-REQUISITOS:
- Batch 3 completo
- Batch 5 completo

ESCOPO:
- templates de flow
- biblioteca de agentes-base
- presets de refatoração de conteúdo
- presets por canal ou formato, como `youtube -> linkedin`, `video -> roteiro`, `artigo -> carrossel`
- criação guiada a partir de preset

FORA DE ESCOPO:
- editor visual drag-and-drop complexo
- escritório virtual
- browser automation genérica fora dos presets necessários

CRITERIOS DE DONE DO BATCH:
- [ ] usuário cria flow funcional a partir de preset
- [ ] ao menos 3 presets de refatoração executam ponta a ponta
- [ ] biblioteca de agentes-base apoia a criação dos presets

### BATCH: 8 - Escritório Virtual (2D)
DIAS: 35-41  
PARALELO_COM: N/A  
OBJETIVO_ALGORITMICO: traduzir execuções multiagente em visualização operacional de alto impacto

PRE-REQUISITOS:
- Batch 2 completo
- Batch 4 completo
- Batch 6 completo

ESCOPO:
- visualização 2D ou simplificada de agentes e handoffs
- status ao vivo de runs
- seleção de flow ativo
- leitura de checkpoint e conclusão visual

FORA DE ESCOPO:
- refatorar todo dashboard existente
- engine gráfica complexa sem necessidade

CRITERIOS DE DONE DO BATCH:
- [ ] pelo menos uma execução real pode ser acompanhada visualmente em tempo real
- [ ] estados `running`, `checkpoint`, `completed`, `failed` aparecem na visualização
- [ ] visualização não expõe dados entre organizações

---

## Estratégia de Alocação de Vários Devs

### Trilha A - Plataforma e Dados

Ownership recomendado:

- migrations
- Prisma
- RLS
- contratos de API
- serviços de execução

Batches alvo:

- Batch 1
- Batch 3
- Batch 4

### Trilha B - API e Backoffice

Ownership recomendado:

- CRUD flows
- CRUD skills
- páginas admin
- bindings de organização

Batches alvo:

- Batch 2
- Batch 6
- Batch 7

### Trilha C - Observabilidade e UX Operacional

Ownership recomendado:

- listagem de runs
- timeline de execução
- realtime + polling
- Virtual Office

Batches alvo:

- Batch 5
- Batch 8

### Trilha D - Produto e Conteúdo Seed

Ownership recomendado:

- templates de flow
- biblioteca de agentes-base
- skills piloto
- payloads seed e documentação funcional

Batches alvo:

- Batch 6A
- Batch 7A

---

## Tasks Técnicas

### TASK: 1-01 - Modelar entidades de orchestration no banco
BATCH: 1  
DOMINIO: Database  
ESTIMATIVA: 8h  
DEPENDE DE: N/A

OBJETIVO ALGORITMICO:
Implementar as entidades da seção 2.

INPUT:
- `docs/implementation-plan-opensquad-incorporacao.md`
- `prisma/schema.prisma`
- `migrations/schema_now.sql`

OUTPUT ESPERADO:
- `prisma/schema.prisma` atualizado
- migration SQL em `migrations/`

ESPECIFICACAO TECNICA:
- criar tabelas `flow_definitions`, `flow_steps`, `flow_runs`, `flow_run_steps`, `flow_checkpoints`, `skill_definitions`, `organization_skill_bindings`
- criar enums necessários
- criar índices por `organization_id`, `flow_id`, `status`, `updated_at`

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- toda entidade tenant-aware deve persistir `organization_id`
- nenhum nome de tabela conflita com estruturas existentes

CASOS DE BORDA OBRIGATORIOS:
- [ ] `slug` duplicado por organização falha com constraint
- [ ] exclusão de flow não apaga histórico por acidente sem regra explícita
- [ ] índices existem para queries de listagem por org

CRITERIO DE DONE:
- [ ] migration sobe em ambiente limpo
- [ ] schema Prisma compila sem erro
- [ ] constraints e índices aparecem no SQL gerado

NAO FAZER NESTA TASK:
- não criar rotas HTTP
- não implementar UI

### TASK: 1-02 - Definir RLS e políticas de acesso das novas tabelas
BATCH: 1  
DOMINIO: Database  
ESTIMATIVA: 6h  
DEPENDE DE: TASK 1-01

OBJETIVO ALGORITMICO:
Aplicar invariantes globais de isolamento multi-tenant.

INPUT:
- migration do TASK 1-01
- políticas atuais do Supabase

OUTPUT ESPERADO:
- SQL de policies em `migrations/`

ESPECIFICACAO TECNICA:
- habilitar RLS nas tabelas expostas ao frontend
- criar policies de `SELECT`, `INSERT`, `UPDATE` conforme role de org
- garantir que leitura de runs e checkpoints seja sempre filtrada por `organization_id`

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- nenhuma policy pode depender de filtro feito só no frontend

CASOS DE BORDA OBRIGATORIOS:
- [ ] membro de outra org não lê runs alheias
- [ ] usuário sem role admin não cria flow onde política exige admin
- [ ] skill binding de outra org não aparece em listagens

CRITERIO DE DONE:
- [ ] policies foram aplicadas às tabelas definidas
- [ ] teste manual com dois tenants resulta em isolamento binário
- [ ] queries esperadas continuam funcionando com RLS ativo

NAO FAZER NESTA TASK:
- não alterar políticas das tabelas antigas sem necessidade comprovada

### TASK: 1-03 - Criar tipos TypeScript e contratos de domínio
BATCH: 1  
DOMINIO: Backend  
ESTIMATIVA: 5h  
DEPENDE DE: TASK 1-01

OBJETIVO ALGORITMICO:
Materializar os contratos da seção 4 para consumo consistente entre API e UI.

INPUT:
- `src/lib/`
- schema Prisma

OUTPUT ESPERADO:
- `src/lib/types/flows.ts` ou equivalente
- `src/lib/types/skills.ts` ou equivalente

ESPECIFICACAO TECNICA:
- criar tipos para flow, step, run, checkpoint, skill, binding
- criar schemas de request/response
- exportar enums usados por rotas e componentes

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- não duplicar tipos já existentes de org/user

CASOS DE BORDA OBRIGATORIOS:
- [ ] enum inválido quebra no typecheck
- [ ] payload de create flow contempla lista vazia de steps como inválida
- [ ] tipos suportam `checkpoint_type = skip`

CRITERIO DE DONE:
- [ ] `npm run typecheck` passa com os novos tipos
- [ ] contratos cobrem create flow, start run e resolve checkpoint
- [ ] enums usados pelas rotas vêm de um único módulo

NAO FAZER NESTA TASK:
- não implementar lógica de execução

### TASK: 2-01 - Implementar API de criação e listagem de flows
BATCH: 2  
DOMINIO: Backend  
ESTIMATIVA: 8h  
DEPENDE DE: TASK 1-01, TASK 1-02, TASK 1-03

OBJETIVO ALGORITMICO:
Implementar `CriarFlow`.

INPUT:
- `src/app/api/`
- `src/lib/actions/organizations.ts`

OUTPUT ESPERADO:
- `src/app/api/flows/route.ts`

ESPECIFICACAO TECNICA:
- implementar `GET /api/flows`
- implementar `POST /api/flows`
- validar org atual, role e payload
- persistir flow e steps em transação

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- slug único por organização
- último step de flow interactive deve aprovar

CASOS DE BORDA OBRIGATORIOS:
- [ ] flow sem steps retorna `422`
- [ ] usuário viewer retorna `403`
- [ ] slug duplicado retorna `409`

CRITERIO DE DONE:
- [ ] admin cria flow válido via API
- [ ] `GET` lista apenas flows da org atual
- [ ] erros seguem contrato definido

NAO FAZER NESTA TASK:
- não criar tela final de edição

### TASK: 2-02 - Implementar API de detalhe e atualização de flow
BATCH: 2  
DOMINIO: Backend  
ESTIMATIVA: 8h  
DEPENDE DE: TASK 2-01

OBJETIVO ALGORITMICO:
Completar CRUD de flow sem tocar em execução.

INPUT:
- `src/app/api/flows/`

OUTPUT ESPERADO:
- `src/app/api/flows/[id]/route.ts`

ESPECIFICACAO TECNICA:
- implementar `GET`, `PUT`, `DELETE` lógico ou arquivamento
- atualizar steps em transação
- bloquear alteração destrutiva em flow com runs ativas

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- histórico não pode ser corrompido por update

CASOS DE BORDA OBRIGATORIOS:
- [ ] flow de outra org retorna `404`
- [ ] flow com run ativa não pode ser arquivado sem regra clara
- [ ] reorder de steps mantém unicidade de `step_order`

CRITERIO DE DONE:
- [ ] flow pode ser consultado e alterado pela org dona
- [ ] update inválido falha atomicamente
- [ ] delete lógico não remove histórico

NAO FAZER NESTA TASK:
- não iniciar run

### TASK: 2-03 - Implementar catálogo e binding de skills
BATCH: 2  
DOMINIO: Backend  
ESTIMATIVA: 8h  
DEPENDE DE: TASK 1-01, TASK 1-02, TASK 1-03

OBJETIVO ALGORITMICO:
Implementar `HabilitarSkillNaOrganizacao`.

INPUT:
- `src/app/api/`

OUTPUT ESPERADO:
- `src/app/api/skills/route.ts`
- `src/app/api/organization-skills/route.ts`

ESPECIFICACAO TECNICA:
- listar skills ativas
- criar binding por organização
- validar `plan_gate` e `config_schema`

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- nenhum secret sensível volta para o cliente

CASOS DE BORDA OBRIGATORIOS:
- [ ] binding duplicado retorna `409`
- [ ] skill indisponível por plano retorna `403`
- [ ] payload inválido de config retorna `422`

CRITERIO DE DONE:
- [ ] org consegue listar skills habilitáveis
- [ ] admin consegue habilitar skill
- [ ] dados sensíveis não aparecem na resposta

NAO FAZER NESTA TASK:
- não executar skills em run ainda

### TASK: 3-01 - Criar serviço executor de runs v1
BATCH: 3  
DOMINIO: Backend  
ESTIMATIVA: 10h  
DEPENDE DE: TASK 2-01, TASK 2-02

OBJETIVO ALGORITMICO:
Implementar `IniciarRun`.

INPUT:
- `src/lib/services/`
- rotas de flow

OUTPUT ESPERADO:
- `src/lib/services/flow-runner.ts` ou equivalente

ESPECIFICACAO TECNICA:
- carregar flow e steps
- criar run
- iterar steps
- persistir `flow_run_steps`
- atualizar status

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- executor nunca cruza organizações

CASOS DE BORDA OBRIGATORIOS:
- [ ] step com erro marca run failed
- [ ] flow sem steps ativos não inicia
- [ ] step skip avança automaticamente

CRITERIO DE DONE:
- [ ] serviço consegue executar flow de 2 steps em sequência
- [ ] status final é persistido corretamente
- [ ] erro em step encerra run sem orphan state

NAO FAZER NESTA TASK:
- não implementar UI
- não implementar feedback loop

### TASK: 3-02 - Expor endpoint de start de run e consulta de runs
BATCH: 3  
DOMINIO: Backend  
ESTIMATIVA: 6h  
DEPENDE DE: TASK 3-01

OBJETIVO ALGORITMICO:
Expor start e leitura básica de runs.

INPUT:
- executor v1

OUTPUT ESPERADO:
- `src/app/api/flows/[id]/runs/route.ts`
- `src/app/api/runs/route.ts`

ESPECIFICACAO TECNICA:
- `POST /api/flows/:id/runs`
- `GET /api/runs?flow_id=&status=`

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- leitura só da org atual

CASOS DE BORDA OBRIGATORIOS:
- [ ] start de flow arquivado retorna `422`
- [ ] flow inexistente retorna `404`
- [ ] filtros de listagem não vazam runs de outra org

CRITERIO DE DONE:
- [ ] usuário autorizado inicia run
- [ ] listagem retorna runs da org atual
- [ ] contratos batem com os tipos definidos

NAO FAZER NESTA TASK:
- não criar timeline visual ainda

### TASK: 4-01 - Implementar modelo e API de checkpoints
BATCH: 4  
DOMINIO: Backend  
ESTIMATIVA: 8h  
DEPENDE DE: TASK 3-01, TASK 3-02

OBJETIVO ALGORITMICO:
Implementar `ResolverCheckpoint`.

INPUT:
- executor v1

OUTPUT ESPERADO:
- `src/app/api/flow-checkpoints/[id]/resolve/route.ts`

ESPECIFICACAO TECNICA:
- abrir checkpoint quando step exigir
- resolver `approve | feedback | abort | select`
- registrar auditoria da ação

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- checkpoint aberto bloqueia avanço

CASOS DE BORDA OBRIGATORIOS:
- [ ] checkpoint já resolvido retorna `409` ou `422`
- [ ] abort encerra run imediatamente
- [ ] select persiste subset sem apagar saída original

CRITERIO DE DONE:
- [ ] cada ação esperada altera o estado correto
- [ ] `resolved_by` e `resolved_at` são persistidos
- [ ] run retoma ou encerra conforme regra

NAO FAZER NESTA TASK:
- não construir tela final de aprovação

### TASK: 4-02 - Implementar reexecução de step com feedback
BATCH: 4  
DOMINIO: Backend  
ESTIMATIVA: 8h  
DEPENDE DE: TASK 4-01

OBJETIVO ALGORITMICO:
Completar o loop de supervisão humana.

INPUT:
- API de checkpoints
- executor v1

OUTPUT ESPERADO:
- atualização em `src/lib/services/flow-runner.ts`

ESPECIFICACAO TECNICA:
- ao receber feedback, gerar novo ciclo do mesmo step
- anexar `previous_output` + `feedback_text` ao contexto do step
- limitar número de ciclos se configurado

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- reexecução não cria nova run independente

CASOS DE BORDA OBRIGATORIOS:
- [ ] múltiplos feedbacks não duplicam step_order
- [ ] feedback vazio retorna `422`
- [ ] limite de ciclos encerra com erro controlado ou decisão obrigatória

CRITERIO DE DONE:
- [ ] step reexecuta no contexto da mesma run
- [ ] output antigo e novo ficam auditáveis
- [ ] limite de feedback é respeitado

NAO FAZER NESTA TASK:
- não redesenhar o modelo de execução inteiro

### TASK: 5-01 - Criar páginas de flows e runs no dashboard
BATCH: 5  
DOMINIO: Frontend  
ESTIMATIVA: 10h  
DEPENDE DE: TASK 2-01, TASK 3-02

OBJETIVO ALGORITMICO:
Expor leitura operacional de flows e runs.

INPUT:
- `src/app/dashboard/`

OUTPUT ESPERADO:
- `src/app/dashboard/flows/page.tsx`
- `src/app/dashboard/runs/page.tsx`

ESPECIFICACAO TECNICA:
- listar flows
- listar runs
- filtros por status, flow e data
- cards com step atual e status

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- frontend nunca assume dados cross-tenant

CASOS DE BORDA OBRIGATORIOS:
- [ ] estado vazio da organização sem flows
- [ ] run failed aparece com erro legível
- [ ] loading e erro de rede não quebram a página

CRITERIO DE DONE:
- [ ] usuário autenticado navega e visualiza flows/runs da própria org
- [ ] filtros funcionam
- [ ] typecheck passa

NAO FAZER NESTA TASK:
- não implementar Virtual Office

### TASK: 5-02 - Implementar timeline de run e status em tempo real
BATCH: 5  
DOMINIO: Frontend  
ESTIMATIVA: 10h  
DEPENDE DE: TASK 5-01, TASK 4-01

OBJETIVO ALGORITMICO:
Implementar `ObservarRunsEmTempoReal`.

INPUT:
- Supabase client/server

OUTPUT ESPERADO:
- componentes em `src/components/flows/`

ESPECIFICACAO TECNICA:
- mostrar steps, timestamps, checkpoint aberto, handoff summary
- assinar realtime
- fallback para polling

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- fallback polling não pode gerar tempestade de requests

CASOS DE BORDA OBRIGATORIOS:
- [ ] socket indisponível ativa polling
- [ ] run concluída para de atualizar corretamente
- [ ] run de outra org nunca aparece no feed

CRITERIO DE DONE:
- [ ] timeline atualiza sem refresh manual em cenário saudável
- [ ] polling substitui socket em cenário de falha
- [ ] usuário vê checkpoint e step atual corretamente

NAO FAZER NESTA TASK:
- não construir animação 2D ainda

### TASK: 6-01 - Entregar catálogo de skills no dashboard
BATCH: 6  
DOMINIO: Frontend  
ESTIMATIVA: 8h  
DEPENDE DE: TASK 2-03

OBJETIVO ALGORITMICO:
Transformar skill em recurso operacional de produto.

INPUT:
- endpoints de skills e organization-skills

OUTPUT ESPERADO:
- `src/app/dashboard/skills/page.tsx`

ESPECIFICACAO TECNICA:
- listar skills disponíveis
- exibir tipo, provider, plano, status
- permitir binding habilitar/desabilitar

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- UI não exibe secret raw

CASOS DE BORDA OBRIGATORIOS:
- [ ] skill indisponível por plano aparece bloqueada
- [ ] erro de binding é mostrado com contexto
- [ ] skill já habilitada mostra estado correto

CRITERIO DE DONE:
- [ ] admin habilita/desabilita skill pela UI
- [ ] estado reflete backend
- [ ] usuário sem permissão não vê ações de admin

NAO FAZER NESTA TASK:
- não construir marketplace público

### TASK: 6-02 - Implementar 2 a 3 skills piloto integradas
BATCH: 6  
DOMINIO: Integracao  
ESTIMATIVA: 12h  
DEPENDE DE: TASK 2-03, TASK 3-01

OBJETIVO ALGORITMICO:
Provar a camada de extensibilidade em execução real.

INPUT:
- skills alvo definidas pelo produto

OUTPUT ESPERADO:
- módulos internos ou bindings para skills piloto

ESPECIFICACAO TECNICA:
- selecionar 2 ou 3 skills de alto valor, por exemplo `oracle`, `canva`, `email` ou `scraping`
- integrar ao executor para steps específicos
- persistir resultado em `output_artifact`

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- falha de integração externa não derruba a plataforma inteira

CASOS DE BORDA OBRIGATORIOS:
- [ ] timeout externo marca step failed com erro auditável
- [ ] credencial ausente bloqueia execução antes do step
- [ ] skill desabilitada não é executada

CRITERIO DE DONE:
- [ ] pelo menos 2 skills funcionam em flow real
- [ ] erros de integração são persistidos e legíveis
- [ ] credenciais não aparecem em logs de resposta

NAO FAZER NESTA TASK:
- não tentar suportar todas as skills possíveis

### TASK: 7-01 - Criar biblioteca de templates de flow
BATCH: 7  
DOMINIO: Backend  
ESTIMATIVA: 8h  
DEPENDE DE: TASK 2-01, TASK 6-02

OBJETIVO ALGORITMICO:
Permitir criação acelerada de flows reutilizáveis.

INPUT:
- flows piloto já validados

OUTPUT ESPERADO:
- tabela ou seed de templates
- endpoint de listagem/aplicação

ESPECIFICACAO TECNICA:
- criar templates seed para conteúdo, SDR, suporte ou onboarding
- permitir clonar template para flow da organização

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- template nunca compartilha dados de run entre orgs

CASOS DE BORDA OBRIGATORIOS:
- [ ] slug derivado do template não conflita
- [ ] template inativo não pode ser usado
- [ ] org sem skill necessária recebe aviso ou bloqueio

CRITERIO DE DONE:
- [ ] org cria flow a partir de template
- [ ] flow criado mantém steps e defaults corretos
- [ ] templates seed estão documentados

NAO FAZER NESTA TASK:
- não construir editor visual avançado

### TASK: 7-02 - Criar biblioteca de agentes-base
BATCH: 7  
DOMINIO: Backend  
ESTIMATIVA: 6h  
DEPENDE DE: TASK 7-01

OBJETIVO ALGORITMICO:
Padronizar papéis usados em flows.

INPUT:
- papéis ARVA existentes
- agentes observados no OpenSquad

OUTPUT ESPERADO:
- seed ou catálogo de agentes-base

ESPECIFICACAO TECNICA:
- modelar catálogo leve de agente-base
- exibir `role`, `skills sugeridas`, `casos de uso`
- permitir uso como referência em criação de flow

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- catálogo não substitui os agentes reais existentes

CASOS DE BORDA OBRIGATORIOS:
- [ ] agente-base desativado não aparece como opção
- [ ] flow existente não quebra se catálogo mudar
- [ ] vínculo a skill inexistente não é gerado

CRITERIO DE DONE:
- [ ] catálogo está disponível para criação de flow
- [ ] pelo menos 5 agentes-base seedados
- [ ] fluxo de criação consegue referenciar um agente-base

NAO FAZER NESTA TASK:
- não migrar todos os agentes atuais para esse catálogo

### TASK: 8-01 - Implementar visualização operacional estilo Virtual Office
BATCH: 8  
DOMINIO: Frontend  
ESTIMATIVA: 16h  
DEPENDE DE: TASK 5-02

OBJETIVO ALGORITMICO:
Transformar dados de run em visualização de alto impacto.

INPUT:
- runs timeline
- handoff summary

OUTPUT ESPERADO:
- `src/app/dashboard/office/page.tsx` ou equivalente
- componentes em `src/components/office/`

ESPECIFICACAO TECNICA:
- renderizar agentes participantes
- mostrar step atual, status e handoff
- atualizar em tempo real
- permitir selecionar run ativa

INVARIANTES QUE ESTA TASK DEVE RESPEITAR:
- visualização deve funcionar em desktop sem depender de engine pesada obrigatória

CASOS DE BORDA OBRIGATORIOS:
- [ ] nenhuma run ativa mostra estado vazio claro
- [ ] run failed exibe estado terminal
- [ ] troca rápida de run não mantém estado fantasma

CRITERIO DE DONE:
- [ ] uma run real pode ser acompanhada visualmente
- [ ] status muda ao vivo
- [ ] sem vazamento de dados entre organizações

NAO FAZER NESTA TASK:
- não refatorar o dashboard inteiro
- não introduzir engine gráfica complexa se um canvas leve resolver

---

## Ordem Recomendada de Execução Compartilhada

### Semana 1

- Dev A: `1-01`
- Dev B: `1-02`
- Dev C: `1-03`

### Semana 2

- Dev A: `2-01`
- Dev B: `2-02`
- Dev C: `2-03`

### Semana 3

- Dev A: `3-01`
- Dev B: `3-02`
- Dev C: suporte em testes de integração + preparação do `5-01`

### Semana 4

- Dev A: `4-01`
- Dev B: `4-02`
- Dev C: `5-01`

### Semana 5

- Dev A: `5-02`
- Dev B: `6-01`
- Dev C: `6-02`

### Semana 6

- Dev A: `7-01`
- Dev B: `7-02`
- Dev C: estabilização e hardening de batches 5 e 6

### Semana 7

- Dev A + Dev B: `8-01`
- Dev C: QA integrado, documentação final e seed flows piloto

---

## Riscos de Complexidade e Antídotos

### Risco: tentar entregar tudo como um único recurso
Antídoto:
- flows, runs, checkpoints, skills e office entram em batches separados

### Risco: UI avançar antes de o modelo de execução estar estável
Antídoto:
- nenhum trabalho de Virtual Office começa antes do Batch 5

### Risco: perder isolamento multi-tenant nas novas entidades
Antídoto:
- Batch 1 força `organization_id`, RLS e testes manuais com dois tenants

### Risco: skills virarem um buraco sem fundo
Antídoto:
- Batch 6 limita explicitamente o piloto a 2 ou 3 skills

### Risco: checkpoint virar fluxo confuso
Antídoto:
- suportar só `approve`, `feedback`, `abort`, `select` na v1

---

## Checklist Final de Qualidade

- [x] toda entidade possui invariantes
- [x] todo fluxo possui pre-condições, pós-condições e falhas
- [x] todo contrato possui autenticação explícita
- [x] todo batch possui escopo e fora de escopo
- [x] toda task possui done binário
- [x] toda task possui casos de borda
- [x] dependências entre tasks formam grafo acíclico
- [x] requisitos de segurança aparecem em tasks afetadas

---
