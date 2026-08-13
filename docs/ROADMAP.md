# ROADMAP.md — Personal Gift Project

> Plano em fases, decomposto em **tarefas pequenas e coesas** (uma unidade por item) para
> a fábrica produzir com menos iterações e mais qualidade. Prioridade: montar a fábrica
> primeiro, depois o produto. O Supervisor usa este arquivo para saber a próxima fronteira.
>
> **Legenda:** `[ ]` pendente · `[x]` feito · **Fx-yy** = código da tarefa (vira uma issue) ·
> **[gate D-xxx]** = toca uma decisão PENDENTE → criar como `decision-needed`, não `status:ready`.
> Detalhe de cada issue no padrão de `FASE-1-issues.md`.

## Quem mantém este arquivo (FU-16, [D-045])

Este arquivo **não é histórico**: o Supervisor decide a próxima fronteira lendo-o. Um ROADMAP
defasado faz a fábrica planejar contra um mapa errado. Por isso a manutenção é obrigação de
quem entrega, no mesmo PR — não tarefa separada que alguém precisa lembrar:

- **Marcar `[x]` é do developer-lead**, no PR que fecha a issue. Issue com código `Fx-yy` no título
  → a linha correspondente vira `[x]` no mesmo commit. Nunca antes: `[x]` significa
  *mergeado*, e é o merge do PR que torna a marca verdadeira.
- **Item novo é do Supervisor propor, do developer-lead escrever.** O Supervisor é read-only por
  desenho ([D-031]); quando decompõe um item (F1-05 → F1-05a/b/c) ou descobre trabalho de
  produto que o plano não previa, ele declara na issue a **linha exata** a acrescentar, e o
  developer-lead a escreve no PR. Item pai só vira `[x]` quando todos os sub-itens estiverem `[x]`.
- **FU-xx NÃO entra aqui.** Follow-up de revisão e conserto de fábrica vive como issue e como
  entrada em `DECISIONS.md`. Este arquivo é o plano de fases do **produto**; encher de FU
  transforma o mapa em log e o Supervisor perde a fronteira de vista. A exceção é quando um
  FU conclui um item que já estava no plano — aí a linha existente é marcada (foi o caso do
  F5-04, concluído pelo FU-15).
- **A deriva é medida sem IA:** `daily-report.yml` cruza as issues fechadas com código `Fx-yy`
  contra este arquivo e denuncia no relatório diário o que ficou por marcar.

---

## FASE 0 — A fábrica de IA  ✅ concluída
Ciclo issue → PR → review → CI → merge rodando de ponta a ponta por IA, com guardrails.

- [x] Repositório, Blueprint (`docs/`, `CLAUDE.md`, `.claude/`), GitHub App, `ANTHROPIC_API_KEY`.
- [x] Workflows: ci, supervisor, implement, review, security, fix, daily-report.
- [x] Allow-list por papel (D-012), `allowed_bots` (D-013), guard-rail de veredito (D-014c).
- [x] Toggle de auth `FACTORY_AUTH` (D-016) e cadência do Supervisor reduzida (D-015).
- [x] Smoke test verde (issue → PR → revisão → merge).

Manutenção contínua da fábrica: branch protection real quando houver GitHub Pro (D-014),
diagnóstico das negações do Reviewer no 1º PR real, e ajuste de cadência/custo conforme medição.

---

## FASE 1 — Esqueleto do produto (+ base de segurança)
DoD: um app SvelteKit que builda, com Firebase seguro, questionário com upload seguro,
seleção de estilo/tamanho e checkout Stripe em teste, com deploy de staging.

- [x] **F1-01** — Scaffold SvelteKit + toolchain (lint/test/build). *Bloqueia todas.* (#7)
- [x] **F1-02** — Modelo de domínio do Pedido + leitura do registry (`published`/`draft`). (#20)
- [x] **F1-03** — Landing page "Nossa História". (#21)
- [x] **F1-04** — Firebase: config + regras mínimas (Auth/Firestore/Storage) + signed URLs. (#22)
      **CSP:** liberar `connect-src` para os hosts do Firebase (Auth/Firestore) — ver nota abaixo.
- [x] **F1-05** — Questionário guiado (multi-step) + upload seguro de fotos.
      Decomposto em quatro entregas; o pai fecha porque as quatro fecharam.
      **CSP:** as URLs assinadas vêm de outro domínio (`firebasestorage.googleapis.com`); sem
      liberar `img-src`/`connect-src`, a foto simplesmente não carrega e o erro só aparece no
      console do navegador — ver nota abaixo.
  - [x] **F1-05a** — Esqueleto multi-step: estado e validação por etapa. (#30)
  - [x] **F1-05a2** — Sessão anônima (Firebase Anonymous Auth) + `uid` verificado no servidor. (#31)
  - [x] **F1-05b** — Upload de fotos por URL assinada. (#32)
  - [x] **F1-05c** — Rascunho do Pedido no Firestore (status pré-pagamento). (#33)
- [x] **F1-06** — Seleção de estilo e tamanho (lê catálogo `published`; trata vazio). (#34)
- [x] **F1-07** — Stripe modo teste: checkout + webhook com assinatura verificada.
      Desbloqueado: o *modelo* de preço saiu do gate em [D-036] (só por tamanho). Os **números**
      continuam no D-101, mas não bloqueiam o modo teste.
      **CSP:** o Checkout exige `script-src https://js.stripe.com` e `frame-src` — ver nota abaixo.
  - [x] **F1-07a** — Cliente Stripe + endpoint que cria a sessão de checkout (Price de teste
        por tamanho) e marca o pedido `aguardando_pagamento`. (#86)
  - [x] **F1-07b** — Webhook Stripe: verifica assinatura e marca o pedido `pago`. (#97)
- [x] **F1-08** — [D-018: Netlify] Host/infra + deploy automático de **staging**. (#35)
      **CSP:** rota pré-renderizada não passa pelo `handle`; fixar os headers na camada de CDN/edge.
  - [x] **F1-08b** — Deploy reprovado pelo secrets scanning: `FIREBASE_PROJECT_ID` é o nome do
        repositório. (#51)

> **Nota de CSP (FU-01, PR #13).** A CSP em `svelte.config.js` é restritiva por design
> (`default-src 'self'`) e **vai bloquear** Firebase e Stripe até ser afrouxada nas tarefas acima.
> Ao liberar, usar **allow-list de hosts específicos** — nunca `*` nem `'unsafe-inline'`. Afrouxar
> além disso é **Decision Gate** (`.claude/rules/security.md`).

---

## FASE 2 — Biblioteca de skills + motor de geração
DoD: a partir de um Pedido, o sistema gera narrativa + arte + layout via skills versionadas
e produz o PDF pronto para impressão e o PDF de preview, com testes de estilo no CI.

- [x] **F2-01** — Contrato de skill + carregador versionado do registry (resolve versão).
- [x] **F2-02** — Skill `narrative-style/romantico` v1 (definição + golden samples + testes de estilo).
- [x] **F2-03** — Skill `photo-style` (mecanismo que abstrai o provedor) + golden samples.
- [x] **F2-04** — Integração do provedor de imagem nas `photo-style` (gate D-102 respondido em [D-056]; provedor concreto em [D-057]).
- [x] **F2-05** — Skills `layout-element` (polaroid+texto, timeline, carta, dedicatória).
      Decomposto em quatro entregas; o pai fecha quando as quatro fecharem.
  - [x] **F2-05a** — `polaroid-com-texto`: composição + golden samples + testes de estilo.
  - [x] **F2-05b** — `timeline`.
  - [x] **F2-05c** — `carta`.
  - [x] **F2-05d** — `dedicatória`.
- [x] **F2-06** — Motor de geração (orquestra narrativa+foto+layout a partir do Pedido).
      Decomposto em três entregas (D-048); o pai fecha quando as três fecharem.
  - [x] **F2-06a** — Orquestração da narrativa: Pedido → `NarrativeBlocks` via skill,
        validando referência de fotos.
  - [x] **F2-06b** — Orquestração da estilização de fotos: Pedido → `StylizedPhoto[]` via
        `PhotoStyleProvider`.
  - [x] **F2-06c** — Composição de layout / spreads finais: Pedido + `NarrativeBlocks` +
        `StylizedPhoto[]` → lista ordenada de spreads via os quatro `layout-element`,
        respeitando o orçamento de páginas do SKU (D-061).
- [x] **F2-07** — Fila + worker assíncrono para a geração pesada. Worker em container no
      Cloud Run (D-069), com a escrita de `aguardando_geracao` no Firestore como fila via
      Eventarc (D-070); ponta a ponta provado no ambiente real em D-071.
- [ ] **F2-08** — Geração do **PDF de produção** por tamanho/SKU (sangria, 300 DPI, PDF/X-4).
      Decomposto em três entregas (D-048); o pai fecha quando as três fecharem.
  - [x] **F2-08a** — Infra de renderização headless (HTML/CSS → PDF) + spread único de
        `dedicatoria` (SKU mini): sangria, 300 DPI, fonte incorporada.
  - [x] **F2-08b** — Renderização de `carta`, `polaroid-com-texto` e `timeline`,
        reaproveitando a infra de F2-08a. Decomposto em duas entregas; o pai fecha quando
        as duas fecharem.
    - [x] F2-08b1 - Renderizacao de carta (multi-pagina) e timeline (texto vetorial, sem
      imagem), reaproveitando a infra de F2-08a.
    - [x] **F2-08b2** — Renderização de polaroid-com-texto: imagem bitmap embutida a
          300 DPI + rotação da moldura, reaproveitando a infra de F2-08a.
  - [ ] **F2-08c** — Montagem do PDF de produção do livro inteiro (`GeneratedBook`, SKU
        mini) + conformidade PDF/X-4. Decomposto em duas entregas; o pai fecha quando
        as duas fecharem.
    - [x] **F2-08c1** — Montagem (merge) do PDF do livro inteiro a partir do
          `GeneratedBook`, na ordem dos spreads, sem PDF/X-4.
    - [ ] **F2-08c2** — Conformidade PDF/X-4 (`OutputIntent`/ICC, metadados) do PDF de
          produção.
- [x] **F2-09** — Geração do **PDF de preview** (spreads).
- [x] **F2-10** — Testes de estilo no CI (comparação com golden samples). Entregue junto com
      cada skill: `narrative-style/romantico` (#101), `photo-style/aquarela` (#102),
      `layout-element/polaroid-com-texto` (#104), `layout-element/timeline` (#107),
      `layout-element/carta` (#108), `layout-element/dedicatoria` (#109) — todos os testes
      de golden sample já rodam em `npm test` (job `ci`); confirmado em #144.
- [ ] **F2-11** — [gate D-103] Prévia no fluxo do cliente (antes ou depois do pagamento).
- [ ] **F2-12** — **Persistência do livro gerado** ([D-074]). Hoje `executarGeracaoDoPedido`
      renderiza os spreads, soma os bytes e **descarta os PDFs** (`order-worker.ts:180`); as
      fotos estilizadas também são descartadas. Como o provedor de imagem não é determinístico,
      regerar produz um livro **diferente** (medido em D-072) — então guardar é pré-requisito de
      reimpressão, download e reenvio à gráfica, não otimização. Escopo: gravar no Storage o PDF
      de produção e as fotos estilizadas ao fim da geração, e registrar os caminhos no campo
      `geracao` do documento do pedido. Depende de F2-08c (a montagem do PDF existe em F2-08c1,
      mas `renderBookToPdf` **não tem chamador em produção**). Nenhuma URL pública: acesso só por
      URL assinada e expirável (`.claude/rules/security.md`).
  - [ ] **F2-12a** — Gravar PDF de produção + fotos estilizadas no Storage e registrar os
        caminhos no pedido; ligar `renderBookToPdf` ao pipeline.
  - [ ] **F2-12b** — Geração do **PDF digital do cliente**: 150×150 mm já aparado, RGB, sem
        sangria nem marcas de corte — derivado do mesmo `GeneratedBook`, **não** é o PDF de
        produção ([D-074]). Entregar o de produção ao cliente seria erro: páginas com 6 mm
        sobrando e conteúdo correndo até a borda.

---

## FASE 3 — Fulfillment (entrega digital e impressa)
DoD: pagamento → geração → **entrega da versão digital** e/ou envio automático ao
print-on-demand → tracking → e-mails, com retenção de fotos **e do livro guardado**
conforme a decisão de LGPD.

- [ ] **F3-01** — [gate D-104] Provedor de print-on-demand definitivo (Cloudprinter/Gelato/Gooten).
- [ ] **F3-02** — Cliente da API do print-on-demand (criar pedido por SKU).
- [ ] **F3-03** — Montagem do arquivo de **capa** por tamanho (lombada/wrap variável).
- [ ] **F3-04** — Orquestração de status: pago → em geração → em produção → enviado → entregue.
      Com [D-074], o pedido digital tem ciclo próprio e mais curto: pago → em geração →
      **disponível para download**, sem produção nem frete.
- [ ] **F3-05** — E-mails transacionais (confirmação, em produção, enviado + tracking).
      Com [D-074], inclui o e-mail de **livro digital pronto**, com o link de download.
- [ ] **F3-06** — [gate D-100] Pipeline de retenção/exclusão das fotos (LGPD). Com [D-074],
      cobre também o **artefato derivado**: o livro guardado contém derivados das fotos, então
      apagar as fotos de origem **não** apaga o livro — e o cliente que comprou o digital
      espera poder rebaixá-lo. Retenção do livro é decisão separada da retenção da foto.
- [ ] **F3-07** — **Entrega da versão digital** ([D-074]). Download do PDF digital do cliente
      (F2-12b) por **URL assinada e expirável**, nunca link público permanente
      (`.claude/rules/security.md`). Inclui re-download pelo dono do pedido. Depende de F2-12.
- [ ] **F3-08** — **Formatos de compra no checkout** ([D-074]): escolher digital ou impresso,
      com o impresso **já incluindo** o digital. ⚠️ **Os dois formatos não são simétricos:** o
      impresso é a opção **apresentada como padrão** — é ele que é o presente e é ele que se
      quer vender; o digital é a porta de entrada para quem não quer gastar com impressão agora.
      Um checkout que trate os dois como equivalentes atende à letra do D-074 e falha no
      objetivo dele. `preço = f(tamanho, formato)` — o modelo de dados do Pedido e os `Price` do
      Stripe passam a carregar o formato; estilo continua sem alterar preço ([D-036]).
      **Não é `decision-needed`:** como em F1-07, pode ser construído com `Price` de teste; os
      números reais são o item (b) do [D-101], que ganha uma pergunta nova — *o digital custa o
      mesmo em todos os tamanhos?* (o custo de produção do digital quase não varia entre SKUs,
      o do impresso varia).
- [ ] **F3-09** — **Upsell digital → impresso** ([D-074]): quem comprou o digital compra a
      impressão depois, como **segunda cobrança sobre o pedido existente** — não um pedido novo.
      O campo de formato evolui de `digital` para `digital+impresso`, o pedido volta de `gerado`
      para o ciclo de produção, e passa a ter dois pagamentos — a máquina de status deixa de ser
      linear (F3-04) e o estorno parcial precisa saber qual cobrança estornar. Em troca,
      "1 livro = 1 pedido" continua verdadeiro no dashboard (F4-04), sem risco de contar a
      geração duas vezes. Reaproveita o livro guardado (F2-12): **não regera nada**, então o
      impresso é exatamente o livro que o cliente já viu — sem isso, a segunda compra produziria
      um livro diferente (provedor de imagem não determinístico, D-072).
      ⚠️ **Este é o caminho principal de receita, não um extra:** precisa ser visível e sem
      atrito, não um link escondido no pós-venda.
- [ ] **F3-10** — **Reimpressão** a partir do arquivo guardado ([D-074]): reenviar à gráfica o
      mesmo PDF de produção, sem regerar. Cobre extravio, dano no transporte e segunda via.

---

## FASE 4 — Dashboard admin + observabilidade
DoD: uma página `/admin` protegida onde você acompanha vendas, custo unitário, margem,
status, envios, logs e alertas — por estilo, por tamanho e **por formato** ([D-074]).

- [ ] **F4-01** — Página `/admin` protegida (authZ forte + MFA).
- [ ] **F4-02** — Instrumentação: cada etapa do pipeline emite **custo real** + eventos.
- [ ] **F4-03** — Vendas: receita, nº de pedidos, ticket médio, conversão do funil.
- [ ] **F4-04** — **Custo unitário e margem por pedido** (impressão+frete+IA+imagem), por
      estilo/tamanho/**formato** ([D-074]). O recorte por formato é o que mais muda a leitura:
      o digital não tem impressão nem frete, e o upsell é receita adicional **sem** custo de
      geração — o livro já estava guardado (F2-12).
- [ ] **F4-05** — Pedidos: status de cada um + envios/tracking.
- [ ] **F4-06** — Logs, erros e alertas (custo e falhas).

---

## FASE 5 — Endurecimento de segurança + lançamento da V1
DoD: primeira venda real ponta a ponta, sem intervenção manual, com segurança e
conformidade revisadas.

- [ ] **F5-01** — Revisão de segurança dedicada (authZ, regras Firebase, segredos, SCA, pen-test básico).
- [ ] **F5-02** — [gate LGPD] Privacidade e termos revisados por você/contador/advogado.
- [ ] **F5-03** — [gate D-105/D-106/D-101] Definir catálogo público (estilos, tamanhos, preços) e publicar no registry.
- [x] **F5-04** — Branch protection real na `main` — enforcement do D-014. Antecipado pelo FU-15
      (#77): o repositório virou público e a proteção deixou de exigir GitHub Pro. Ver [D-041],
      inclusive o que **não** morreu do impasse e os dois limites registrados.
- [ ] **F5-05** — [gate] Stripe modo **real** + primeiro deploy em **prod**.
- [ ] **F5-06** — E2E do fluxo completo de compra (por estilo e tamanho).
- [ ] **F5-07** — **Primeira venda real** de ponta a ponta, sem intervenção manual.

---

## FASE 6+ — Depois da V1
DoD: crescer catálogo e mercado reusando a mesma fábrica.

- [ ] **F6-01** — Novos estilos/tamanhos (nova skill/SKU, sem reescrever o motor).
- [ ] **F6-02** — Internacionalização e venda em dólar.
- [ ] **F6-03** — Novos tipos de presente (mesma fábrica, novo produto no Blueprint).
- [ ] **F6-04** — Otimização contínua de custo unitário e de conversão.

---

## Prioridade para o Supervisor
1. Fechar a fase atual antes de avançar para a próxima.
2. Nunca criar como `status:ready` um item marcado **[gate D-xxx]** — abrir `decision-needed`.
3. Respeitar as dependências (ex.: F1-01 antes de tudo; motor F2-06 depende das skills F2-02/03/05).
4. Preferir tarefas que desbloqueiam outras.
5. Segurança e observabilidade de custo caminham com cada fase, não só no fim.
6. Ao decompor um item ou criar tarefa de produto que o plano não previa, **declarar na issue a
   linha exata do ROADMAP** a acrescentar (código, fase e posição). Você não escreve o arquivo;
   quem escreve é o developer-lead, no PR. Ver "Quem mantém este arquivo", no topo.