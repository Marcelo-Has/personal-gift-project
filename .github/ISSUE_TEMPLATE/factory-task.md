---
name: Tarefa da fábrica
about: Padrão obrigatório para toda issue de trabalho da fábrica (D-017). Especifique o suficiente para que o Developer implemente sem adivinhar.
title: "[F?] "
labels: ""
assignees: ""
---

<!--
Como usar (humano ou Supervisor):
- Troque o `?` do título pelo número da fase (ex.: `[F1] Scaffold do app SvelteKit`).
- Label: `status:ready` quando a tarefa está pronta para implementar; `decision-needed`
  quando ela toca um Decision Gate ou uma decisão PENDENTE (D-100..D-106) de
  `docs/DECISIONS.md` — nesse caso a issue traz Opções + Recomendação + o que bloqueia,
  e NÃO recebe `status:ready`.
- Preencha todas as seções. Seção que não se aplica: escreva "n/a" e o porquê — não apague.
- Apague estes comentários antes de publicar.
-->

## Contexto / Por quê
<!-- Onde isso se encaixa no ROADMAP/PRODUCT, o que já existe, o que motivou a tarefa.
     Cite os documentos a ler antes de implementar. -->

## Objetivo
<!-- Uma frase: o resultado observável quando a issue estiver concluída. -->

## Escopo
<!-- O que esta issue entrega, em itens concretos. PR pequeno e revisável.
     Comece pelo tamanho (D-048): cabe em ~40 turnos de Developer? Se não couber,
     decomponha em issues ordenadas em vez de estimar G. -->

**Tamanho estimado:** <!-- P | M | G + uma frase de justificativa -->

## Fora de escopo
<!-- O que NÃO deve ser feito aqui (e para qual issue/fase fica). Explícito, não implícito. -->

## Critérios de aceite
<!-- Checklist verificável: cada item precisa ser conferível por alguém lendo o PR
     ou rodando um comando. Nada de "funciona bem". -->
- [ ]
- [ ]
- [ ]

## Requisitos técnicos / decisões
<!-- Decisões de docs/DECISIONS.md que se aplicam (D-0XX), rules de .claude/rules/
     relevantes, restrições de segurança/custo/performance. Se a tarefa esbarrar em
     decisão PENDENTE, diga qual e como contorná-la sem decidir por conta própria. -->

## Arquivos prováveis
<!-- Caminhos que a implementação deve tocar (e os que NÃO deve). Ver REPO-STRUCTURE.md. -->

## Testes exigidos
<!-- Quais testes precisam existir/passar: unitário, componente, E2E (Playwright),
     testes de estilo contra golden samples, `npm run lint` / `npm test` / `npm run build`. -->

## Dependências
<!-- Issues que precisam estar fechadas antes, Decision Gates que precisam de resposta,
     segredos/contas externas necessários. "Nenhuma" se estiver desbloqueada. -->

## Definition of Done
- [ ] Critérios de aceite todos marcados
- [ ] Testes novos/atualizados passando; `lint`, `test` e `build` verdes no CI
- [ ] Revisão (`review`) e revisão de segurança (`ai-security-review`) sem pendência bloqueante
- [ ] Sem segredos commitados e sem PII em logs (regra inviolável nº 3 do `CLAUDE.md`)
- [ ] PR pequeno, em português, referenciando a issue com `Closes #<n>`
- [ ] Documentação atualizada quando o comportamento muda (`README.md`, `docs/`)
- [ ] Decisão nova registrada em `docs/DECISIONS.md`, se houve
