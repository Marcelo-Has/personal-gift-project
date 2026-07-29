# ROADMAP.md — Personal Gift Project

> Plano em fases, decomposto em **tarefas pequenas e coesas** (uma unidade por item) para
> a fábrica produzir com menos iterações e mais qualidade. Prioridade: montar a fábrica
> primeiro, depois o produto. O Supervisor usa este arquivo para saber a próxima fronteira.
>
> **Legenda:** `[ ]` pendente · `[x]` feito · **Fx-yy** = código da tarefa (vira uma issue) ·
> **[gate D-xxx]** = toca uma decisão PENDENTE → criar como `decision-needed`, não `status:ready`.
> Detalhe de cada issue no padrão de `FASE-1-issues.md`.

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

- [ ] **F1-01** — Scaffold SvelteKit + toolchain (lint/test/build). *Bloqueia todas.*
- [ ] **F1-02** — Modelo de domínio do Pedido + leitura do registry (`published`/`draft`).
- [ ] **F1-03** — Landing page "Nossa História".
- [ ] **F1-04** — Firebase: config + regras mínimas (Auth/Firestore/Storage) + signed URLs.
- [ ] **F1-05** — Questionário guiado (multi-step) + upload seguro de fotos.
- [ ] **F1-06** — Seleção de estilo e tamanho (lê catálogo `published`; trata vazio).
- [ ] **F1-07** — Stripe modo teste: checkout + webhook com assinatura verificada.
- [ ] **F1-08** — [gate D-104] Host/infra + deploy automático de **staging**.

---

## FASE 2 — Biblioteca de skills + motor de geração
DoD: a partir de um Pedido, o sistema gera narrativa + arte + layout via skills versionadas
e produz o PDF pronto para impressão e o PDF de preview, com testes de estilo no CI.

- [ ] **F2-01** — Contrato de skill + carregador versionado do registry (resolve versão).
- [ ] **F2-02** — Skill `narrative-style/romantico` v1 (definição + golden samples + testes de estilo).
- [ ] **F2-03** — Skill `photo-style` (mecanismo que abstrai o provedor) + golden samples.
- [ ] **F2-04** — [gate D-102] Integração do provedor de imagem nas `photo-style`.
- [ ] **F2-05** — Skills `layout-element` (polaroid+texto, timeline, carta, dedicatória).
- [ ] **F2-06** — Motor de geração (orquestra narrativa+foto+layout a partir do Pedido).
- [ ] **F2-07** — Fila + worker assíncrono para a geração pesada.
- [ ] **F2-08** — Geração do **PDF de produção** por tamanho/SKU (sangria, 300 DPI, PDF/X-4).
- [ ] **F2-09** — Geração do **PDF de preview** (spreads).
- [ ] **F2-10** — Testes de estilo no CI (comparação com golden samples).
- [ ] **F2-11** — [gate D-103] Prévia no fluxo do cliente (antes ou depois do pagamento).

---

## FASE 3 — Fulfillment (impressão e envio)
DoD: pagamento → geração → envio automático ao print-on-demand → tracking → e-mails,
com retenção de fotos conforme a decisão de LGPD.

- [ ] **F3-01** — [gate D-104] Provedor de print-on-demand definitivo (Cloudprinter/Gelato/Gooten).
- [ ] **F3-02** — Cliente da API do print-on-demand (criar pedido por SKU).
- [ ] **F3-03** — Montagem do arquivo de **capa** por tamanho (lombada/wrap variável).
- [ ] **F3-04** — Orquestração de status: pago → em geração → em produção → enviado → entregue.
- [ ] **F3-05** — E-mails transacionais (confirmação, em produção, enviado + tracking).
- [ ] **F3-06** — [gate D-100] Pipeline de retenção/exclusão das fotos (LGPD).

---

## FASE 4 — Dashboard admin + observabilidade
DoD: uma página `/admin` protegida onde você acompanha vendas, custo unitário, margem,
status, envios, logs e alertas — por estilo e por tamanho.

- [ ] **F4-01** — Página `/admin` protegida (authZ forte + MFA).
- [ ] **F4-02** — Instrumentação: cada etapa do pipeline emite **custo real** + eventos.
- [ ] **F4-03** — Vendas: receita, nº de pedidos, ticket médio, conversão do funil.
- [ ] **F4-04** — **Custo unitário e margem por pedido** (impressão+frete+IA+imagem), por estilo/tamanho.
- [ ] **F4-05** — Pedidos: status de cada um + envios/tracking.
- [ ] **F4-06** — Logs, erros e alertas (custo e falhas).

---

## FASE 5 — Endurecimento de segurança + lançamento da V1
DoD: primeira venda real ponta a ponta, sem intervenção manual, com segurança e
conformidade revisadas.

- [ ] **F5-01** — Revisão de segurança dedicada (authZ, regras Firebase, segredos, SCA, pen-test básico).
- [ ] **F5-02** — [gate LGPD] Privacidade e termos revisados por você/contador/advogado.
- [ ] **F5-03** — [gate D-105/D-106/D-101] Definir catálogo público (estilos, tamanhos, preços) e publicar no registry.
- [ ] **F5-04** — Branch protection real na `main` (GitHub Pro) — enforcement do D-014.
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