---
description: Tria os comentários de revisão de um PR e resolve só o que pertence a ele; o resto vira sub-FU, atualiza issue existente, ou é mantido como default do framework. Mantém defaults do Svelte/SvelteKit. Uso: /triage-pr <numero-do-PR>
argument-hint: <numero-do-PR>
---

Você vai triar e resolver os achados de revisão do PR #$ARGUMENTS.

## Passo 1 — Ler e VERIFICAR (não supor)
- Rode `gh pr view $ARGUMENTS --comments` e `gh pr checks $ARGUMENTS`.
- Leia TODOS os comentários de veredito (review, ai-security-review) e o estado dos checks.
- Para cada achado, VERIFIQUE na fonte (código do projeto, `node_modules` do framework,
  `docs/`, `.claude/rules/`) em vez de assumir. Registre o que confirmou.

## Passo 2 — Triagem (apresente e PARE para aprovação)
Monte uma tabela — para cada achado: severidade · é defeito real OU comportamento PADRÃO do
Svelte/SvelteKit? · classificação:
- **[corrigir nesta PR]** — pequeno, correção real, toca arquivos já no diff.
- **[sub-FU nova]** — escopo novo / hardening.
- **[atualizar issue existente #N]** — pertence a uma issue já aberta.
- **[MANTER — default do framework]** — estrutura/comportamento padrão do Svelte/SvelteKit
  sem defeito real: NÃO alterar.
- **[registrar]** — aviso para o futuro: comentário no código + no PR (não criar issue prematura).

Apresente a tabela e **aguarde minha aprovação explícita** antes de editar qualquer coisa.

## Passo 3 — Execução (só após aprovação)
- **[corrigir nesta PR]:** `gh pr checkout $ARGUMENTS`; aplique mudança MÍNIMA (sem
  reestruturar defaults do framework); rode `npm run lint && npm test && npm run build` até
  passar; commit em português referenciando a issue; push na MESMA branch.
- **[sub-FU nova]:** crie no formato padrão do repo (Contexto/Objetivo/Escopo/Fora de
  escopo/Critérios de aceite/Requisitos/Arquivos/Testes/Dependências/DoD), label `status:ready`.
- **[atualizar issue existente]:** edite a issue acrescentando ao Escopo/Critérios só o ponto pertinente.
- **[MANTER]/[registrar]:** deixe comentário explicando por que é intencional/by-design (no código e/ou no PR).
- Comente no PR resumindo: corrigido aqui · virou FU (links) · entrou em issue existente
  (link) · mantido como default (justificativa) · registrado.

## Regras invioláveis
- NUNCA reestruturar comportamento padrão do Svelte/SvelteKit para satisfazer um nitpick —
  mantenha o default e explique.
- NUNCA editar `review.yml` nem `security.yml` aqui (impasse D-014 — exige merge manual à parte).
- Mudança mínima; sem segredos; PRs e issues pequenos e focados.
- Se um achado exigir decisão de produto, abra `decision-needed` em vez de adivinhar.

## Verificação final
`lint`/`test`/`build` verdes; se o PR mexe em headers/segurança, confirme empiricamente
(`npm run preview` + `curl -I`); CI do PR verde após o push; `gh pr view $ARGUMENTS --comments`
e as issues criadas/atualizadas conferidas.
