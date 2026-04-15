# HUB — Guia Operacional: Session Bridge (SMT v1.1)
> Documentação técnica para gestores e operadores do ARVABots Efficient Hub.

---

## 1. O que é o Session Bridge?
O **Session Bridge** é a camada de memória **cross-canal** do protocolo SMT (Smart Memory Transhipment). Ele permite que um agente reconheça um usuário e mantenha a continuidade de uma conversa mesmo que o canal mude (ex: o usuário começou falando no Telegram PVT e depois enviou uma dúvida no Dashboard ou no Grupo).

### Objetivos Principais:
- Eliminar perguntas repetitivas ("Quem é você?", "O que estávamos falando?").
- Criar a percepção de que o agente é uma "entidade única" onipresente.
- Manter o foco em threads de curto prazo (as últimas 72 horas).

---

## 2. Como o Time do HUB interage com a Memória

### 2.1 Visualização de Contexto (Dashboard)
Ao acessar a página de **Agentes**, cada card agora possui um novo botão: 🧠 **Memória**.

**O que você encontrará lá:**
- **Threads Ativas**: Lista de todos os temas que o agente está "lembrando" no momento.
- **Contexto Acumulado**: O resumo executivo do que foi decidido ou discutido.
- **Identificadores**: De onde veio o usuário (Telegram ID, WhatsApp ou WebID).
- **Última Interação**: Registro temporal exato da última troca de mensagens.

### 2.2 Monitoramento da "Saúde da Memória"
O Dashboard exibe um progresso de **Threads Ativas (0/20)**. 
- **Por que o limite de 20?** Para evitar que o agente carregue lixo cognitivo (contextos irrelevantes ou muito antigos) em sessões novas.
- **O que fazer se estiver cheio?** O sistema resolve automaticamente as threads mais antigas, mas o operador do HUB pode analisar se os temas estão sendo "Resolvidos" corretamente pelos agentes.

---

## 3. Regras de Negócio (O que acontece nos bastidores)

### TTL (Time To Live): 72 Horas
Toda thread que não recebe uma nova interação em 72 horas é automaticamente marcada como **Resolvida**. Ela desaparece da memória ativa do agente, mas permanece visível no histórico do HUB para auditoria.

### Janela de Agrupamento: 24 Horas
Se um usuário volta a falar com o agente sobre o mesmo tema dentro de 24 horas, o sistema não cria uma nova thread, mas **atualiza** a existente, mantendo o histórico conciso.

### Promoção para MEMORY.md
Threads que se mostram recorrentes ou de alta importância (ex: uma preferência de formato do cliente) devem ser promovidas do Session Bridge para o **Short-Term Memory (MEMORY.md)** local do agente. Atualmente, isso acontece na visualização do dashboard para suporte à decisão do operador.

---

## 4. Troubleshooting (O agente esqueceu?)

Se um agente não demonstrar continuidade no atendimento, os operadores do HUB devem verificar:
1.  **O agente está reportando?** Verifique na página de Memória se existe uma entrada recente para aquele usuário.
2.  **O ID do usuário bate?** A ponte depende do identificador (ex: `@sergio_castro` ou `id_123`). Se o usuário trocou de conta, a ponte não será feita automaticamente.
3.  **O tema é similar?** O agente busca por similaridade de tema. Temas completamente novos geram threads novas e ignoram as pontes antigas.

---

## 5. Suporte a Identificadores
O Hub foi projetado para ser agnóstico. Aceitamos:
- **Telegram UUID**: IDs numéricos (ex: `12345678`).
- **WhatsApp Phone**: Números formatados (ex: `5511999...`).
- **OpenClaw WebID**: IDs de sessão direta via chat incorporado.

---
*Equipe de Engenharia ARVA · ARVABots Efficient Hub · Abril 2026*
