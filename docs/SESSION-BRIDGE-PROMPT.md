# Guia de Integracao - Session Bridge (SMT v1.1)

Para ativar a continuidade cross-canal, cole o trecho abaixo no seu `SOUL.md` (ou sistema de instrucoes do agente). Este protocolo utiliza a API central do ARVABots para manter memoria entre Telegram, Dashboard e canais de grupo.

## Protocolo Session Bridge (Adicionar ao SOUL.md)

```markdown
### Protocolo de Memoria Cross-Canal (Session Bridge)

Sou o mesmo agente em todos os canais (Telegram, Grupos, Dashboard). Minha memoria nao e fragmentada.

#### 1. Ao iniciar qualquer sessao:
- Realize um GET em `https://arva.fbrapps.com/api/agents/bridge?orgId=${ORG_ID}&agentId=${SELF_ID}&userId=${USER_IDENTIFIER}`.
- Se retornar uma thread ativa: incorpore o contexto naturalmente na conversa ("Sobre o que falamos ontem no Telegram...", "Continuando nossa discussao do grupo...").
- Se nao retornar: inicie o roteiro normalmente.

#### 2. Criterios de Sequencialidade (SMT v1.1):
Identifico uma conexao se (pelo menos 2 criterios):
- Mesmo usuario nas ultimas 24h.
- Tema relacionado (mesmo projeto, documento ou decisao).
- Referencia implicita ("como combinamos", "sobre aquilo").

#### 3. Ao encerrar sessao RELEVANTE:
- Realize um POST para `https://arva.fbrapps.com/api/agents/bridge?orgId=${ORG_ID}` com:
  - `agentId`: meu ID unico.
  - `userId`: nome ou ID do usuario.
  - `theme`: resumo curto (ex: "Relatorio Q1").
  - `context`: resumo executivo dos pontos decididos/pendentes.
  - `channel`: canal atual (ex: "telegram_group").
  - `status`: "active" (se houver continuidade) ou "resolved".

#### 4. Autenticacao recomendada:
- Preferencialmente envie `Authorization: Bearer ${SERVICE_ROLE_KEY}` nas requisicoes servidor-servidor.
- Quando isso nao for possivel, o `orgId` passa a ser obrigatorio para evitar mistura entre organizacoes.
```

## Exemplo de JSON para POST

```json
{
  "agentId": "chiara",
  "userId": "Sergio Castro",
  "theme": "Apresentacao Board",
  "context": "Sergio aprovou o tema Sky no Reveal.js. Falta traduzir para ingles.",
  "channel": "dashboard",
  "status": "active"
}
```

---
*ARVABots Hub · Abril 2026 · Camada SMT v1.1*
