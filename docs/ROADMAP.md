# ROADMAP.md — Personal Gift Project

> Plano em fases. Prioridade: **montar a fábrica primeiro**, depois apontá-la ao produto.
> O Supervisor usa este arquivo para saber a próxima fronteira. [ ] pendente / [x] feito.

## FASE 0 — A fábrica de IA (foco agora)
Objetivo: uma IA recebe uma issue e abre um PR sozinha, com CI verde, sem você programar.
- [ ] Criar repositório privado no GitHub.
- [ ] Instalar o Claude Code e assinar o **Max 5x**.
- [ ] Subir o Blueprint (`docs/`, `CLAUDE.md`, `.claude/`).
- [ ] Rodar `/install-github-app` (instala o GitHub App).
- [ ] Criar `ANTHROPIC_API_KEY` e adicionar em **GitHub Secrets**.
- [ ] Confirmar os workflows em `.github/workflows/` e ajustar `--max-turns`/timeouts.
- [ ] Criar labels `status:ready` e `decision-needed`.
- [ ] **Teste de fumaça:** issue simples → PR → review → CI → merge feito por IA.
- [ ] Ligar billing/alertas de custo e anotar o gasto do teste.

**DoD Fase 0:** um ciclo issue → PR → review → CI → merge rodou ponta a ponta por IA.

## FASE 1 — Esqueleto do produto (+ base de segurança)
- [ ] App SvelteKit + landing da "Nossa História".
- [ ] Firebase (Auth/Firestore/Storage) com regras de acesso mínimas.
- [ ] Questionário guiado + upload de fotos com URLs assinadas/expiráveis.
- [ ] Seleção de **estilo** e **tamanho** (lendo do `registry.json`).
- [ ] Stripe em modo teste (checkout + webhook com assinatura verificada).
- [ ] Baseline de segurança inicial + deploy automático em staging.

## FASE 2 — Biblioteca de skills e motor de geração
- [ ] `src/lib/product-skills/` + `registry.json` versionado.
- [ ] `narrative-style-*`, `photo-style-*`, `layout-element-*` (conjunto inicial) com
      golden samples e testes.
- [ ] Motor que só gera via skills do registry (fila + worker assíncrono).
- [ ] Geração de arte (D-102) integrada às `photo-style-*`.
- [ ] PDF de produção por tamanho/SKU + PDF de preview; testes de estilo no CI.
- [ ] Prévia no fluxo (posição em D-103).

## FASE 3 — Fulfillment (impressão e envio)
- [ ] Integração print-on-demand (D-104): criar pedido por SKU.
- [ ] Validar capa correta de cada tamanho (lombada/wrap variável).
- [ ] Pipeline pagamento → geração → envio → tracking; e-mails.
- [ ] Pipeline de retenção/exclusão de fotos (D-100).

## FASE 4 — Dashboard admin e observabilidade
- [ ] `/admin` protegido (authZ + MFA); instrumentação de custo/eventos por etapa.
- [ ] Vendas/conversão; **custo unitário e margem por pedido** (por estilo/tamanho);
      custo agregado de IA; status; envios; logs/erros; alertas.

## FASE 5 — Endurecimento de segurança + lançamento V1
- [ ] Revisão de segurança dedicada (authZ, regras Firebase, segredos, SCA, pen-test básico).
- [ ] Privacidade e termos (LGPD) revisados por você/contador/advogado.
- [ ] Definir catálogo público: estilos (D-105), tamanhos (D-106), preços (D-101).
- [ ] Stripe em modo real (Gate) + primeiro deploy em prod; E2E do fluxo completo.
- [ ] **Primeira venda real** ponta a ponta, sem intervenção manual.

## FASE 6+ — Depois da V1
- [ ] Novos estilos/tamanhos (nova skill/SKU, sem reescrever o motor).
- [ ] Internacionalização e venda em dólar; novos tipos de presente.
- [ ] Otimização contínua de custo unitário e conversão.

---
### Prioridade para o Supervisor
1. Fechar a Fase 0 antes de tocar no produto.
2. Nunca avançar em item que dependa de decisão PENDENTE em DECISIONS.md.
3. Segurança e observabilidade de custo caminham com cada fase, não só no fim.
4. Preferir tarefas que desbloqueiam outras (ex.: registry/skills antes do motor).
