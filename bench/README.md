# bench/ — harness de avaliação da fábrica (EV1.2)

**O que é:** o conjunto de cenários, rubricas e planilhas de coleta usados para **medir a
fábrica** — não o produto. Cada cenário é uma tarefa realista que a fábrica executa de ponta a
ponta (issue → developer-lead → PR → CI → revisões → veredito) enquanto a gente cronometra, conta
turnos, mede custo e pontua o resultado.

**Para que serve:** ter um número de **baseline** antes de mexer na fábrica, e o mesmo número
depois. Sem isso, toda mudança de processo (prompt, workflow, rule, agente) é opinião. O par
documental é o `docs/FACTORY-INVENTORY.md` (o "antes" estrutural, tag
`fabrica-baseline-2026-08`); o bench é o "antes" **de desempenho**.

**O que o bench NÃO é:** não é produto, não entra no `docs/ROADMAP.md`, e nada que ele produz é
mergeado. É instrumento de medição.

---

## Princípios

1. **Repetível.** Os cenários ficam versionados aqui, com o texto exato da issue. Rodar de novo
   daqui a três meses tem que dar uma comparação justa, não uma tarefa nova.
2. **Poucos cenários (≤ 6).** Cobrir dimensões diferentes vale mais que cobrir volume. Hoje são
   cinco: C1 (backend bem especificado), C2 (frontend/design), C3 (correção de bug), C4
   (armadilha de Decision Gate), C5 (armadilha de ambiguidade).
3. **Custo medido por rodada.** Cada cenário registra US$ e nº de turnos em `coleta.md`. Uma
   fábrica que acerta gastando 4× mais não melhorou.
4. **Cenários-armadilha medem o que a fábrica NÃO deve fazer.** C4 e C5 são reprovados por
   *entregar*. Uma fábrica que implementa tudo que pedem é uma fábrica que vai implementar a
   coisa errada quando o pedido for perigoso — retenção de foto (LGPD), preço, catálogo.
5. **PRs de bench NUNCA são mergeados.** Nenhum código de cenário entra na `main`. O valor está
   na transcrição, não no diff.
6. **Right-sizing vale aqui também** (`.claude/rules/right-sizing.md`): o harness é planilha e
   markdown. Não construir ferramenta de medição antes de ter o que medir.

---

## Protocolo de execução

- **Disparo controlado, um cenário por vez, pelo dono.** A fábrica fica dormente entre cenários
  (`/pause`). Rodar dois em paralelo contamina a medição de custo e embaralha os `run` do
  Actions.
- **Corte de US$ 10 por cenário.** Estourou, interrompe, anota onde parou e pontua o que houve —
  o estouro é o resultado.
- **Nada de ajudar no meio.** Toda intervenção humana é anotada em `coleta.md` e derruba a nota
  de Autonomia. Se você precisou explicar algo ao agente, esse é o achado.
- **Ao final de cada cenário:** exportar a transcrição (artefato do Actions, 7 dias de retenção —
  baixar antes de expirar), preencher `coleta.md`, pontuar por `rubricas.md`.
- **Encerramento:** PRs de bench **fechados sem merge**, branches `bench/*` apagadas, issues
  `[BENCH-*]` fechadas. O que fica é o registro em `coleta.md` e as notas.

## Ordem sugerida

**C1 → C4 → C5 → C3 → C2.**

Começa pelo caminho feliz bem especificado (C1) para ter certeza de que a fábrica está de pé;
depois as duas armadilhas (C4, C5), que são baratas e dizem mais sobre o processo do que sobre o
código; depois o bug plantado (C3), que exige preparo de branch; e por último C2, o mais caro e o
único com avaliação de design.

## Arquivos

| Arquivo | O que tem | Issue |
| --- | --- | --- |
| `cenarios/C1-catalogo.md` | Backend bem especificado: endpoint público do catálogo. | #163 |
| `cenarios/C2-como-funciona.md` | Frontend/design: página `/como-funciona`. | #164 |
| `cenarios/C3-bug-plantado.md` | Protocolo do bug plantado — mede o `fix.yml`. | não tem |
| `cenarios/C4-gate-trap.md` | Armadilha de Decision Gate (LGPD/retenção, D-100). | #165 |
| `cenarios/C5-ambigua.md` | Armadilha de ambiguidade (issue vaga de propósito). | #166 |
| `rubricas.md` | Escala 0–4, dimensões e pesos. | — |
| `coleta.md` | Checklist do que anotar em cada rodada. | — |

## Estado atual (EV1.2-preparo, 2026-08-11)

As issues **#163, #164, #165 e #166 estão abertas e SEM label**, de propósito: `status:ready` é o
gatilho do `implement.yml` e aplicá-lo dispara o developer-lead. O cenário só começa quando o dono
aplicar a label (C1/C2/C4/C5) ou abrir o PR (C3). A branch `bench/c3-bug` já está no remoto com o
bug plantado, **sem PR aberto** — e branch sozinha não dispara nada (`ci.yml` só roda em push na
`main` e em `pull_request`).
