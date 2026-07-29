---
description: Endurece os GitHub Actions — pina actions por SHA e transforma o npm audit em gate. Exige MERGE MANUAL (impasse D-014). Uso: /harden-workflows
---

Você vai endurecer os workflows. **ATENÇÃO:** este trabalho edita `review.yml`/`security.yml`,
então os checks `review`/`ai-security-review` vão falhar por *workflow validation* — é o
**impasse D-014**, resolvido por **merge manual**. Deixe isso explícito no PR.

## Passos
1. Crie a branch (ex.: `chore/harden-workflows`).
2. Para cada action de terceiros em `.github/workflows/*.yml` (checkout, setup-node, gitleaks, etc.):
   - Resolva o SHA da tag atual: `gh api repos/<owner>/<repo-da-action>/commits/<tag>` (ou `git ls-remote`).
   - Troque `uses: org/action@vX` por `uses: org/action@<sha> # vX.Y.Z`.
3. Em `security.yml`: remova o `|| true` do `npm audit` (ou use `--audit-level=critical` sem `|| true`).
4. Rode o que der localmente; abra o PR referenciando a issue de hardening.
5. No corpo do PR, escreva: **"MERGE MANUAL (D-014): os checks review/ai-security-review falham
   por construção; revisar o diff (limitado a workflows) e mergear por cima."**
6. Reporte o resumo.

## Regras
- Somente arquivos de workflow neste PR (nada de código de produto — se aparecer, separe).
- Sem segredos; comentar a versão ao lado de cada SHA para rastreabilidade.
- Opcional: sugerir Dependabot para manter as SHAs atualizadas.
