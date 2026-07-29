---
description: Investiga e corrige o CI vermelho de um PR, na própria branch. Reconhece o falso-vermelho do impasse D-014. Uso: /fix-ci <numero-do-PR>
argument-hint: <numero-do-PR>
---

Você vai consertar o CI vermelho do PR #$ARGUMENTS.

## Passos
1. `gh pr checks $ARGUMENTS` — veja qual check falhou; `gh pr view $ARGUMENTS` para contexto.
2. Abra os logs do check que falhou: `gh run view <run-id> --log-failed`. Identifique a **causa raiz** (não o sintoma).
3. `gh pr checkout $ARGUMENTS`. Corrija a causa raiz com **mudança mínima**. Rode
   `npm run lint && npm test && npm run build` até passarem.
4. Commit em português referenciando a issue; push na **MESMA branch** (nunca em `main`, nunca abrir PR novo).
5. Reporte: causa raiz, o que mudou, e confirme os checks verdes.

## Regras / ciladas conhecidas
- **Impasse D-014:** se o vermelho for `Workflow validation failed ... identical content to the
  default branch` E o diff tocar `review.yml`/`security.yml`, isso **NÃO é falha real** — é o
  impasse (a action se recusa a rodar). PARE e avise que é caso de **merge manual**, não de correção.
- Não reestruturar comportamento padrão do Svelte/SvelteKit para "passar" o CI.
- Se a correção exigir uma decisão de produto, abra `decision-needed` em vez de adivinhar.
- Sem segredos; mudança mínima e focada.
