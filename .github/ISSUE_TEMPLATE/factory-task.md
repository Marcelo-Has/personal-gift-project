---
name: Tarefa da fábrica
about: Padrão obrigatório para toda issue de trabalho da fábrica (D-017). Especifique o suficiente para que o developer-lead implemente sem adivinhar.
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
- Não tem como preencher tudo sozinho? Use `status:refinement` em vez de `status:ready`:
  o `refiner` (`.claude/agents/refiner.md`) analisa, publica o RELATÓRIO DE REFINAMENTO
  na issue, o dono decide por comentário e a spec volta completa. Preencha a seção
  **Refinamento** dizendo o que ficou em aberto. É opt-in: issue já completa vai direto
  para `status:ready`.
- Preencha todas as seções. Seção que não se aplica: escreva "n/a" e o porquê — não apague.
- **Requisitos visuais é OBRIGATÓRIA quando a issue tem a label `area:frontend`** (D-078):
  sem critérios visuais VERIFICÁVEIS ali, issue de frontend NÃO está pronta para
  `status:ready` — ela volta para especificação, não vai para a fila.
- Apague estes comentários antes de publicar.
-->

## Contexto / Por quê
<!-- Onde isso se encaixa no ROADMAP/PRODUCT, o que já existe, o que motivou a tarefa.
     Cite os documentos a ler antes de implementar. -->

## Objetivo
<!-- Uma frase: o resultado observável quando a issue estiver concluída. -->

## Escopo
<!-- O que esta issue entrega, em itens concretos. PR pequeno e revisável.
     Comece pelo tamanho (D-048): cabe em ~40 turnos de developer-lead? Se não couber,
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

## Requisitos visuais
<!-- OBRIGATÓRIA se a issue tem a label `area:frontend` (D-078). Sem critérios visuais
     VERIFICÁVEIS aqui, a issue de frontend não está pronta para `status:ready`.
     VERIFICÁVEL = alguém consegue REPROVAR o PR olhando o resultado e este texto.
     "Seguir o design", "ficar bonito" e "responsivo" não são requisitos — não dá para
     reprovar contra eles. Preencha os quatro itens; issue que não toca interface escreve
     "n/a — não toca interface" e apaga o resto. -->

- **Telas / componentes e estados entregues:** <!-- quais rotas, telas ou componentes esta
  issue entrega, e em que estado cada um fica ao final (novo, alterado, ainda placeholder). -->
- **Comportamento por viewport (375 / 768 / 1280):** <!-- o que MUDA DE INTENÇÃO em cada uma
  das três larguras do Visual Verification Loop (D-078 §7) — não a consequência de o espaço
  encolher. Derive da §10 do `DESIGN.md`. Diga também o que NÃO muda em nenhuma delas. -->
- **Estados além do feliz:** <!-- para cada componente que carrega dado: vazio, carregando,
  erro, overflow (o pior conteúdo plausível) e offline/degradado — com o texto e a forma de
  cada um, conforme a §11 do `DESIGN.md`. Mais os estados de interação: hover, active,
  disabled, selecionado e FOCO VISÍVEL. Só o estado feliz implementado é achado de revisão. -->
- **Coerência com os contratos:** <!-- que seções do `DESIGN.md` aprovado esta UI deriva
  (tokens §4, tipografia §5, grid §6, assinatura §3) e o que o playbook da categoria
  (`docs/design/playbooks/`) exige a mais. Valor inventado fora do `DESIGN.md` é achado.
  Se a issue precisa desviar do `DESIGN.md`, isso é Decision Gate — não é escopo daqui. -->

## Requisitos técnicos / decisões
<!-- Decisões de docs/DECISIONS.md que se aplicam (D-0XX), rules de .claude/rules/
     relevantes, restrições de segurança/custo/performance. Se a tarefa esbarrar em
     decisão PENDENTE, diga qual e como contorná-la sem decidir por conta própria. -->

## Arquivos prováveis
<!-- Caminhos que a implementação deve tocar (e os que NÃO deve). Ver REPO-STRUCTURE.md. -->

## Testes exigidos
<!-- Quais testes precisam existir/passar: unitário, componente, E2E (Playwright),
     testes de estilo contra golden samples, `npm run lint` / `npm test` / `npm run build`. -->

## Refinamento
<!-- O que você deixou em aberto DE PROPÓSITO — em vez de chutar e passar o chute adiante
     como se fosse spec. Liste as decisões que ainda não são suas para tomar, cada uma com
     o que depende dela. Marque a issue com `status:refinement` e o `refiner` transforma
     esta lista em questões com opções, recomendação e default.
     Nada em aberto? Escreva "nada em aberto — spec completa" e use `status:ready`. -->

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
