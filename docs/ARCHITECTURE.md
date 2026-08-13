# ARCHITECTURE.md — Personal Gift Project

> Como o sistema é construído: o **produto** e a **fábrica de IA** que o constrói.
> Registrar mudanças relevantes em DECISIONS.md.

## Parte 1 — A "fábrica de IA"
Você define o Blueprint uma vez e a IA planeja, programa, testa, revisa e mantém,
voltando a você só em decisões. Roda em **GitHub + Claude Code + GitHub Actions**,
sem orquestrador próprio no começo.

```
VOCÊ  (Blueprint + Decision Gates)
  ▼
Claude Supervisor  ── lê o Blueprint → escolhe tarefas → cria GitHub Issues
  ▼
Claude developer-lead(s) ── implementam issues em branches → abrem PR
  ▼
Claude Reviewer ── revisa (requisito + diff + testes) + Security Review
  ▼
CI (lint + testes + E2E + scan de segurança)  ── o árbitro final NÃO é IA
  PASS → merge → próxima tarefa   |   FAIL → Claude corrige
```

Todos os papéis são **o mesmo Claude em contextos diferentes**, com permissões de
ferramentas diferentes (`.claude/agents/*.md` + `--allowedTools`/`--disallowedTools`).

> Dois tipos de agente/skill: (1) **agentes da fábrica** (Supervisor/developer-lead/Reviewer)
> constroem o software; (2) **skills do produto** (narrativa/foto/layout) rodam em
> runtime para gerar cada livro — ver Parte 2.3.

### Papéis e permissões
- **Supervisor** (`schedule`/cron): lê specs, lê/cria issues, define dependências,
  registra decisões, inicia trabalhos. Não escreve código.
- **developer-lead** (`status:ready`): edita arquivos, roda comandos, testa, commita, abre PR.
- **Reviewer** (`pull_request`): revisão independente + aciona o Security Review.

### Workflows (`.github/workflows/`)
`supervisor.yml` (cron), `implement.yml`, `review.yml`, `security.yml`, `fix.yml`,
`ci.yml` (o juiz), `daily-report.yml`. Cada um chama `anthropics/claude-code-action@v1`
com `prompt` e `claude_args`. A Action dispara por `issue_comment`, `issues`,
`pull_request` e `schedule` (confirmado na doc oficial).

### Custo / autenticação (IMPORTANTE)
- **Interativo** (você no terminal): consome a **assinatura Max**.
- **Automação (Action):** por padrão usa `ANTHROPIC_API_KEY` = cobrança por token
  (pay-as-you-go), à parte da assinatura. Autenticação por assinatura (OAuth) existe em
  alguns cenários — verificar na doc vigente.
- **Modelo por tarefa:** Sonnet padrão; Opus só em tarefa difícil (arquitetura, bug
  persistente, segurança, feature grande).
- **Prompt caching:** manter CLAUDE.md/docs/skills estáveis reduz muito o custo repetido.

### Decision Gates
Quando precisa de decisão humana, a IA não adivinha: cria issue `decision-needed`
(Opções + Recomendação + o que bloqueia), deixa a tarefa bloqueada e segue outras
(ver AUTONOMY.md).

## Parte 2 — O produto (stack)
- **Frontend/app:** SvelteKit.
- **Auth + banco + storage:** Firebase (Auth, Firestore, Storage para as fotos).
- **Pagamentos:** Stripe (checkout + webhooks com assinatura verificada).
- **Geração de conteúdo:** Claude API, orquestrada pelas **skills do produto** (2.3).
- **Geração de arte:** API de imagem sob HTTP, chamada do backend por trás do contrato
  `PhotoStyleProvider`, com teto de resolução e redimensionamento proporcional (D-102
  respondido em [D-056]). O provedor concreto é detalhe de implementação da F2-04.
- **PDF de impressão:** HTML/CSS → PDF com sangria (render headless), PDF/X-4, 300 DPI,
  fontes incorporadas, template por tamanho/SKU.
- **Impressão/fulfillment:** print-on-demand (Cloudprinter candidato).
- **Hospedagem:** a definir (Decision Gate D-104). Geração pesada em **fila + worker**.

### 2.1 Fluxo do pedido
```
Landing → Questionário (+ fotos) + escolha de ESTILO + TAMANHO
        → Checkout Stripe → webhook "pago"
        → Fila → Worker: skills (narrativa + foto + layout) → PDF produção + preview
        → Envio ao print (SKU do tamanho) → tracking
        → E-mails → métricas → Dashboard admin (2.4)
```

### 2.2 Ambientes
`dev` (local), `staging` (deploy automático), `prod`. Segredos só em GitHub Secrets /
variáveis do host — nunca no repositório.

### 2.3 Biblioteca de skills do produto → `src/lib/product-skills/`
Cada estilo/elemento é uma **skill versionada e isolada**, com contrato estável, golden
samples e testes. Organização:
```
src/lib/product-skills/
  narrative-style/<estilo>/    (definição + golden samples + testes)
  photo-style/<estilo>/
  layout-element/<elemento>/
  registry.json                (catálogo: estilos/tamanhos + versão)
```
Regras: o motor só gera chamando skills do registry (nada de prompt solto); toda skill
é versionada; novo estilo/tamanho = estender skill + registry, sem reescrever o motor;
testes de estilo (vs golden samples) rodam no CI.

### 2.4 Dashboard de administração (`/admin`, acesso restrito)
Fonte única operacional. Telas mínimas: vendas (receita, pedidos, ticket, conversão);
**custo unitário por pedido** (impressão + frete + IA + imagem) e **margem**, por estilo
e tamanho; custo agregado de IA/fábrica; status dos pedidos; envios/tracking; logs e
erros; saúde/performance. Cada etapa emite métricas — o custo unitário é medido, não estimado.

## Parte 3 — Segurança (primeira classe)
Evitar hacking e, principalmente, **vazamento de dados** (fotos e histórias são dados
sensíveis — LGPD). Baseline obrigatório:
- AuthZ forte no `/admin` (+ MFA); nenhuma rota admin exposta.
- Regras mínimas no Firebase (usuário só acessa os próprios dados; nada público).
- URLs de foto **assinadas e expiráveis**; nunca links públicos permanentes.
- Criptografia em trânsito (TLS) e em repouso; segredos só em cofre/variáveis.
- Validação/sanitização de toda entrada; webhooks Stripe com assinatura verificada.
- Rate limiting, limites de upload, anti-automação; menor privilégio nas chaves.
- Scan contínuo (dependências + segredos) e revisão de segurança por IA em cada PR;
  testes de autorização no CI.
- Retenção mínima de PII; pipeline de exclusão das fotos (D-100); logs sem PII.

## Parte 4 — Performance e redução de custo
- Geração pesada assíncrona (fila+worker); o usuário nunca espera no request.
- Cache/reuso + prompt caching; não regerar o que não mudou; preview barata (D-103).
- Modelo por tarefa (Sonnet/Opus). Imagens otimizadas + CDN.
- Provedores escolhidos por custo/qualidade (Decision Gates).
- Observabilidade de custo: cada etapa registra o custo real por pedido.
