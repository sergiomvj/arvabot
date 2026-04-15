# Update Docs Pack

## Objetivo

Esta pasta reúne o pacote de documentação que os devs precisam para implementar a atualização do ArvaBot com foco em:

- arquitetura de squads
- Sherlock / investigation
- checkpoints de aprovação
- agente arquiteto
- escritório virtual
- sistema de skills modular
- refatoração de conteúdo
- sessões persistentes de navegador

Os arquivos aqui foram reunidos para evitar perda de contexto e reduzir dependência de busca no restante do repositório.

---

## Ordem de Leitura Recomendada

1. `plano-de-implementacao-arvabot.md`
2. `comparativo-opensquad-arvabot.md`
3. `comparativo-opensquad-arvabot_gemini.md`
4. `PRD-ARVABOTS-supabase.md`
5. `PRD-ARVABOTS-multitenant.md`
6. `BRIEFING-AGENTE-ARVABOTS.md`
7. `Oracle_briefing.md`
8. `TASKS-ARVABOT.md`

---

## Fonte de Verdade por Tema

- Planejamento de execução: `plano-de-implementacao-arvabot.md`
- Visão comparativa e rationale da atualização: `comparativo-opensquad-arvabot.md`
- Contexto complementar: `comparativo-opensquad-arvabot_gemini.md`
- Arquitetura SaaS / multi-tenant / Supabase: `PRD-ARVABOTS-supabase.md`
- Arquitetura de transição e escopo multi-tenant: `PRD-ARVABOTS-multitenant.md`
- Contexto operacional do projeto: `BRIEFING-AGENTE-ARVABOTS.md`
- Oracle e fluxos de inteligência: `Oracle_briefing.md`
- Status do que já foi entregue: `TASKS-ARVABOT.md`

---

## Arquivos de Referência Técnica

Além dos documentos principais, esta pasta também inclui:

- módulos `.mjs` de referência operacional do ecossistema ARVA
- documentos de Session Bridge e SMT
- briefing da Sprint API
- análise do frontend existente
- HTML legado de referência
- briefing `.docx` de Oracle

Esses arquivos não são necessariamente leitura inicial obrigatória, mas servem como apoio para decisões técnicas e validação de integrações.

---

## Regra Prática para o Time

- Em caso de conflito entre interpretação e plano, seguir `plano-de-implementacao-arvabot.md`
- Em caso de dúvida sobre arquitetura atual, seguir os PRDs
- Em caso de dúvida sobre comportamento operacional existente, seguir o briefing e os módulos `.mjs`
- Evitar criar escopo novo fora dos entregáveis definidos no comparativo atualizado
