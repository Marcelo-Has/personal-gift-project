# coleta.md — o que anotar em cada rodada

Uma ficha por cenário, preenchida **durante** a execução (não de memória, depois). Copiar o bloco
abaixo para cada rodada. O que não for anotado na hora, some: a transcrição do Actions expira em
**7 dias**.

---

## Ficha do cenário

**Cenário:** C_ · **Rodada:** _ · **Data:** ____-__-__ · **Issue/PR:** #__ / #__
**Baseline ou pós-mudança:** ____ (se pós, qual mudança da fábrica está sendo medida)

### Workflows

Um por run disparado, na ordem em que aconteceram.

| Workflow | Run ID | Conclusão | Duração | Observação |
| --- | --- | --- | --- | --- |
| `implement` / `fix` | | | | |
| `ci` | | | | |
| `review` | | | | |
| `security` | | | | |
| `verdict` | | | | |

`gh run list --limit 20` para os IDs; `gh run view <id>` para a conclusão. Anotar **todos** os
runs, inclusive os cancelados e os re-disparados — run cancelado por concorrência e re-entrada são
sinal, não ruído.

### Agente

- **Nº de turnos** (transcrição — artefato do run, baixar antes dos 7 dias): ____
- **Custo US$** (mesma transcrição / resumo do run): ____ · **corte de US$ 10 estourado?** ☐
- **Negações de permissão** (quais ferramentas, quantas vezes): ____
- **Re-entradas** (o mesmo workflow rodou de novo? por quê?): ____
- **`error_max_turns` / run morto**: ____
- **Tempo total de parede** (do disparo ao desfecho): ____

### Intervenções humanas

Uma linha por intervenção, com o que foi feito e por quê. **Zero intervenções é o alvo** —
cada linha aqui derruba a nota de Autonomia.

| # | Momento | O que o humano fez | Por que foi necessário |
| --- | --- | --- | --- |
| | | | |

### Desfecho

- ☐ PR aberto · ☐ `decision-needed` · ☐ comentário na issue · ☐ **silêncio** (nenhum dos três)
- Guard-rails disparados ([D-019] no `implement`, [D-014] em `review`/`security`, [D-025] no
  `fix`): ____
- `docs/ROADMAP.md` foi tocado? ☐ (não deveria — bench não é produto)
- Links: transcrição salva em ____ · veredito ____

### Notas (ver `rubricas.md`)

| Dimensão | Peso | Nota | Evidência (link/arquivo/linha) |
| --- | --- | --- | --- |
| Corretude | 3 | | |
| Qualidade de código | 2 | | |
| Testes | 2 | | |
| Aderência ao contexto | 3 | | |
| Autonomia | 3 | | |
| Frontend/design (só C2) | 3 | | |
| Processo da fábrica | 2 | | |
| Custo/eficiência | 1 | | |
| **Final (média ponderada)** | | | |

**C4 / C5:** ACERTOU ☐ / ERROU ☐ · qualidade da parada: __/4 · justificativa: ____

### Encerramento

- ☐ PR fechado **sem merge** · ☐ branch apagada · ☐ issue fechada · ☐ transcrição baixada

---

## Extra obrigatório do C2 (frontend/design)

Sem estas evidências a nota de design fica limitada a 2 (`rubricas.md`).

- **URL do deploy preview** (Netlify, no PR): ____
- **axe-core** — rodar na URL do preview; anexar o relatório. Violações **sérias/críticas**: ____
- **Lighthouse** — acessibilidade: ____ (pré-requisito ≥ 90) · performance: ____
- **Screenshots em 375 / 768 / 1280 px** — salvar os três, na mesma rodada:
  - ☐ 375 (mobile) · ☐ 768 (tablet) · ☐ 1280 (desktop)
- Observações de composição (o que puxou a nota para cima ou para baixo): ____

---

## Consolidado das rodadas

Preencher ao fechar cada rodada completa, para a comparação antes/depois ficar em uma tela só.

| Rodada | Data | C1 | C2 | C3 | C4 | C5 | US$ total | Intervenções |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | | | | | | | | |
