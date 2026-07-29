---
description: Responde um decision-needed do jeito certo — grava no DECISIONS.md, comenta e fecha a issue. Uso: /answer-decision <numero> <opção/decisão>
argument-hint: <numero> <opção/decisão>
---

Você vai responder o `decision-needed` cujo número é o primeiro token de `$ARGUMENTS`,
com a decisão descrita no restante de `$ARGUMENTS` (ex.: `6 A` ou `5 manter guard-rail`).

## Passos
1. `gh issue view <n>` — leia as opções e a recomendação.
2. Interprete a decisão do usuário a partir de `$ARGUMENTS`.
3. **Registre no `docs/DECISIONS.md`** (a resposta REAL): transforme a decisão PENDENTE
   correspondente (D-xxx) em `ACEITA`, com a opção escolhida + 1 linha de motivo + data.
   Commit em português + push na `main`.
4. **Comente na issue** (curto, é só ponteiro):
   `Decisão: <opção> — <motivo em 1 linha>. Registrado em docs/DECISIONS.md (D-xxx), commit <hash>. Fechando.`
   e feche com `gh issue close <n>`.
5. Se a decisão **desbloqueia** alguma issue/task, remova o bloqueio/label pertinente.
6. Reporte o que registrou e fechou.

## Regras
- A resposta REAL é o `DECISIONS.md`; **nunca só comentar** (o comentário sozinho não "pega"
  para os agentes).
- Se a decisão **implicar mudança de código**, NÃO edite código de produto direto na `main`:
  crie uma issue `status:ready` (ou um PR pequeno) para essa mudança e cite na resposta.
- Se tocar preço/pagamento/produção/segredos, **confirme comigo antes** de aplicar qualquer código.
