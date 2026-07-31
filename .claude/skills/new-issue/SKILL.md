---
description: Cria uma issue no padrão do repo, verificando dependências e decision gates antes. Uso: /new-issue <código> <título curto>
argument-hint: <código> <título curto>
---

Você vai criar uma issue bem especificada. Argumentos: `$ARGUMENTS` (ex.: `F2-06 motor de geração`).

## Passos
1. Leia `docs/ROADMAP.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` e `docs/DECISIONS.md`
   para o contexto do item.
2. **Decision gate:** se o item toca uma decisão PENDENTE (D-100..D-106) ou está marcado
   `[gate]` no ROADMAP, crie como **`decision-needed`** (Opções + Recomendação + o que
   bloqueia), NÃO como `status:ready`.
3. Caso contrário, redija no **formato padrão**:
   Contexto/Por quê · Objetivo · Escopo · Fora de escopo · Critérios de aceite (verificáveis) ·
   Requisitos técnicos/decisões · Arquivos prováveis · Testes exigidos · Dependências
   (bloqueada por / bloqueia) · Definition of Done.
   **Linha do ROADMAP** (FU-16, [D-045]): se o código do item **não existe** em
   `docs/ROADMAP.md` — decomposição de um item ou tarefa de produto não prevista —, o Escopo
   traz a **linha exata** a acrescentar (código, fase e posição). Quem escreve o arquivo é o
   Developer, no PR. `FU-xx` não vira linha de ROADMAP.
4. Aplique os labels certos (`status:ready` ou `decision-needed`; `fase-N`; `area:*`).
5. **Mostre-me o rascunho e PARE** para aprovação antes de criar.
6. Após aprovado, crie com `gh issue create` e me devolva o link.

## Regras de ouro
- Uma issue = unidade pequena e coesa (PR revisável em poucos minutos).
- Critérios sempre verificáveis; sempre declarar "Fora de escopo"; sempre apontar arquivos prováveis.
- Não inflar escopo; se forem duas coisas, são duas issues.
