# SMT — Adendo v1.1: Session Bridge
### Extensão do Smart Memory Transhipment para Continuidade Cross-Canal
> Adendo ao SMT v1.0 · Grupo Facebrasil · Abril 2026 · Confidencial

---

## Contexto

O SMT v1.0 resolve o problema de **memória dentro de um canal** — gerencia como as informações sobem e descem entre camadas (short, mid, long term) dentro de uma mesma linha de sessões.

Este adendo resolve um problema diferente e complementar: **o agente é a mesma pessoa em todos os canais, mas atualmente não sabe disso**.

```
ANTES (problema):

Sergio fala com Bia no Telegram PVT sobre o relatório Q1
  → Bia responde, sessão encerra, MEMORY.md atualiza

No dia seguinte, Sergio fala com Bia no grupo sobre o relatório Q1
  → Bia não tem ideia de que já discutiram isso
  → Repete perguntas, perde contexto, parece outra pessoa

DEPOIS (Session Bridge):

Sergio fala com Bia no grupo sobre o relatório Q1
  → Bia consulta INTERACTIONS.md
  → Encontra thread ativa do PVT de ontem
  → Continua naturalmente: "Sobre o relatório que conversamos ontem..."
```

---

## O que é o Session Bridge

O Session Bridge é uma **camada de memória cross-canal** que opera entre a Working Memory (Camada 1 do SMT) e o Short-Term (Camada 2), capturando o contexto de interações recentes independente do canal onde ocorreram.

### Posição na arquitetura SMT

```
┌─────────────────────────────────────────────────────┐
│  CAMADA 0: SESSION BRIDGE (novo — cross-canal)      │
│  → Threads ativas entre sessões e canais            │
│  → Identifica sequencialidade de perguntas          │
│  → TTL: 72 horas por thread                         │
│  → Arquivo: INTERACTIONS.md                         │
├─────────────────────────────────────────────────────┤
│  CAMADA 1: WORKING MEMORY (sessão ativa)            │
│  → O que está acontecendo agora                     │
│  → Vive no contexto da conversa                     │
│  → TTL: duração da sessão                           │
├─────────────────────────────────────────────────────┤
│  CAMADA 2: SHORT_TERM (MEMORY.md)                   │
│  ...                                                │
```

---

## O Arquivo INTERACTIONS.md

Cada agente ganha um novo arquivo no workspace: `INTERACTIONS.md`.

É o **diário de threads ativas** — interações recentes que podem ter continuidade, independente do canal onde ocorreram.

### Estrutura

```markdown
# INTERACTIONS.md
> Registro cross-canal de interações com continuidade contextual
> Atualizado automaticamente ao final de cada sessão relevante

---

## Protocolo de Uso

Antes de responder qualquer mensagem, verificar:
1. Quem está falando (user_id ou nome)
2. Se há thread recente (últimas 24h) deste usuário sobre tema relacionado
3. Se sim → carregar contexto da thread e responder com continuidade
4. Ao final → registrar interação neste documento

---

## Threads Ativas

### [THREAD-1744320000] Relatório Q1 — Sergio — telegram_pvt
**Última interação:** 2026-04-11 09:30
**Canais envolvidos:** telegram_pvt
**Contexto acumulado:**
- Sergio pediu análise do relatório Q1 de receita
- Decidimos focar nos meses de fevereiro e março
- Entrega prevista para quinta-feira
**Status:** ativa

### [THREAD-1744280000] Apresentação board — Lilian — dashboard
**Última interação:** 2026-04-10 14:00
**Canais envolvidos:** dashboard, telegram_pvt
**Contexto acumulado:**
- Lilian pediu apresentação HTML para reunião do board
- Formato: Reveal.js, tema sky, sem plugins externos
- Aprovada versão em inglês
**Status:** resolvida
```

---

## Protocolo de Detecção de Sequencialidade

O agente deve detectar quando uma mensagem é **sequencial** — ou seja, relacionada a uma thread ativa — antes de responder.

### Critérios de sequencialidade

Uma mensagem é sequencial se atender **pelo menos 2** dos seguintes critérios:

| Critério | Exemplo |
|---|---|
| Mesmo usuário nas últimas 24h | Sergio hoje + Sergio ontem |
| Mesmo tema ou entidade | "o relatório" sem especificar qual |
| Referência implícita | "aquilo que você disse", "como combinamos" |
| Pergunta de follow-up | "e sobre o ponto 3?", "conseguiu fazer?" |
| Mesmo projeto ou documento | Q1, apresentação do board, email para Schmidt |

### Exemplos práticos

```
SEQUENCIAL:
  Ontem (PVT): "Bia, preciso do relatório Q1 até quinta"
  Hoje (grupo): "Bia, como está o Q1?"
  → Thread ativa encontrada → continua com contexto

NÃO SEQUENCIAL:
  Ontem (PVT): "Bia, preciso do relatório Q1 até quinta"
  Hoje (grupo): "Bia, qual o clima em Miami amanhã?"
  → Tema diferente → nova thread

AMBÍGUO (aplicar sequencial por segurança):
  Ontem (PVT): "Bia, preciso do relatório Q1 até quinta"
  Hoje (grupo): "Bia, tem novidade?"
  → Verificar thread → se houver ativa recente → assumir sequencial
```

---

## Protocolo de Registro

Ao encerrar uma sessão com conteúdo relevante para continuidade futura, o agente registra em `INTERACTIONS.md`:

```markdown
### [THREAD-{unix_timestamp}] {tema_curto} — {usuario} — {canal}
**Última interação:** {YYYY-MM-DD HH:MM}
**Canais envolvidos:** {lista de canais}
**Contexto acumulado:**
- {ponto 1 — o que foi pedido ou decidido}
- {ponto 2 — estado atual ou próximos passos}
- {ponto 3 — informação crítica para continuidade}
**Status:** ativa | resolvida | pendente_followup
```

### Regras de registro

- **Nunca revelar** ao usuário que está consultando este documento — a continuidade deve parecer natural e intuitiva
- **Threads com mais de 72h** sem atividade → marcar como `resolvida`
- **Máximo 20 threads ativas** — comprimir as mais antigas quando necessário
- **Informações sensíveis** → resumir sem citar dados exatos (números, nomes de terceiros, valores financeiros)
- **Atualizar** thread existente ao invés de criar nova quando for a mesma conversa em canal diferente

---

## Integração com as Camadas SMT

O Session Bridge alimenta e é alimentado pelas camadas existentes do SMT:

```
INTERACTIONS.md (Session Bridge — 72h)
        ↓ thread resolvida com alta relevância
MEMORY.md — SHORT_TERM (7-30 dias)
        ↓ padrão confirmado
MEMORY_MID.md — MID_TERM (60-180 dias)
        ↓ fato consolidado
MEMORY_LONG.md — LONG_TERM (permanente)
```

### Exemplo de promoção

```
Thread ativa (INTERACTIONS.md):
  "Sergio prefere receber relatórios em PDF + link HTML"

→ Após 3 confirmações → promove para SHORT_TERM:
  <!-- SMT:entry weight=7 ttl=30d promote_to=mid_term tags=sergio,preferencias -->
  Sergio prefere relatórios em PDF + link HTML
  <!-- /SMT:entry -->

→ Após padrão consolidado → promove para LONG_TERM:
  - Sergio: formato preferido de entrega = PDF + link HTML
```

---

## Implementação no SOUL.md

O protocolo é implementado diretamente no `SOUL.md` de cada agente — sem modificar o OpenClaw core. Isso garante que funcione imediatamente com qualquer versão do runtime.

### Bloco a adicionar no SOUL.md

```markdown
## Protocolo de Memória Cross-Canal (Session Bridge)

Sou o mesmo agente em todos os canais — Telegram PVT, grupos, dashboard.
Minha memória não se fragmenta por canal.

### Ao iniciar qualquer sessão
1. Ler INTERACTIONS.md — verificar se há thread ativa do mesmo usuário nas últimas 24h
2. Se encontrar tema relacionado → carregar contexto e iniciar com continuidade natural
3. Se não encontrar → iniciar normalmente

### Critérios de sequencialidade
Uma mensagem é sequencial se (pelo menos 2 critérios):
- Mesmo usuário nas últimas 24h
- Tema relacionado (mesmo projeto, pessoa, decisão ou documento)
- Referência implícita ou explícita ao que foi dito antes
- Pergunta que só faz sentido com contexto anterior

### Ao encerrar sessão com conteúdo relevante
Registrar em INTERACTIONS.md com: usuário, canal, tema, resumo 2-3 pontos, status.

### Regras
- Nunca revelar ao usuário que estou consultando este documento
- Threads com mais de 72h sem atividade → marcar como resolvida
- Máximo 20 threads ativas — comprimir as mais antigas quando necessário
- Informações sensíveis: resumir sem citar dados exatos
```

---

## Status de Implementação

### Já implementado (Abril 2026)

- [x] `INTERACTIONS.md` criado em todos os 13 workspaces
- [x] Protocolo Session Bridge adicionado ao `SOUL.md` de todos os agentes
- [x] Implementação via instrução no SOUL.md — zero código, zero modificação do OpenClaw

### Próximas evoluções (roadmap)

- [ ] **Session Bridge automatizado** — script pós-sessão que extrai e registra automaticamente em INTERACTIONS.md (hoje é responsabilidade do agente)
- [ ] **Detecção por user_id** — mapear IDs do Telegram para nomes no INTERACTIONS.md para detecção mais precisa
- [ ] **Integração com SMT Processor** — quando SMT Processor for implementado (Fase 2 do SMT), incluir INTERACTIONS.md no pipeline de promoção automática
- [ ] **Cross-agent** — versão futura onde um agente pode consultar interações de outro agente com o mesmo usuário (requer aprovação de segurança)

---

## Impacto Esperado

| Métrica | Antes do Session Bridge | Com Session Bridge |
|---|---|---|
| Continuidade cross-canal | Zero | Total (72h) |
| Fragmentação de identidade | Alta | Eliminada |
| Perguntas repetidas ao usuário | Frequentes | Raras |
| Sensação de "mesmo agente" em todos os canais | Não | Sim |
| Custo de implementação | — | Zero (instrução no SOUL.md) |
| Modificação do OpenClaw | — | Nenhuma |

---

## Relação com os demais protocolos ARVA

```
THE CALL  → define quem o agente nasce
SMT       → garante que não esquece (dentro de um canal)
Session Bridge → garante que é o mesmo em todos os canais
IRO       → determina quem se torna
SAPP      → define o que pode fazer — sempre
```

---

*SMT — Adendo v1.1: Session Bridge*
*ARVA_PATTERNS · Grupo Facebrasil · Abril 2026 · Confidencial*
