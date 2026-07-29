# Personal Gift Project

Plataforma de presentes personalizados construída e mantida de forma majoritariamente
autônoma por IA (Claude Code + GitHub Actions). Primeiro produto: mini livro
**"Nossa História"** (casal), impresso sob demanda, com múltiplos estilos e tamanhos.

## Como este repositório está organizado
- `CLAUDE.md` — entrypoint que a IA lê em toda sessão (índice + regras invioláveis).
- `REPO-STRUCTURE.md` — explica onde cada arquivo mora e por quê.
- `docs/` — o "Blueprint": PRODUCT, ARCHITECTURE, AUTONOMY, ROADMAP, DECISIONS.
- `.claude/` — configuração do Claude Code: `settings.json` (impõe regras), `rules/`
  (regras por contexto), `agents/` (Supervisor/Developer/Reviewer), `skills/` (helpers de dev).
- `.github/workflows/` — a fábrica: supervisor (agendado), implement, review, security,
  fix e daily-report, além do `ci.yml` (o juiz).
- `src/lib/product-skills/` — os estilos de runtime do produto (narrativa/foto/layout)
  com `registry.json`. É o que o app usa para gerar cada livro.

## Setup rápido (Fase 0)
1. Crie um repositório privado no GitHub e suba estes arquivos.
2. Instale o Claude Code e assine o plano Max 5x.
3. Rode `/install-github-app` no Claude Code (instala o GitHub App).
4. Crie uma `ANTHROPIC_API_KEY` no console e adicione em
   **Settings → Secrets and variables → Actions** do repositório.
5. Crie os labels `status:ready` e `decision-needed` no GitHub (Issues → Labels).
6. Teste de fumaça: abra uma issue simples, adicione o label `status:ready` e confirme
   o ciclo issue → PR → review → CI → merge feito por IA.

Detalhes e próximas fases: `docs/ROADMAP.md`.

## App (Fase 1 — scaffold)
SvelteKit + TypeScript. Comandos:
```
npm ci             # instala dependências (Node >= 22.22.2)
npm run dev        # ambiente de desenvolvimento
npm run build      # build de produção
npm run lint       # prettier --check + eslint
npm test           # svelte-check + testes unitários (Vitest)
npm run test:e2e   # testes E2E (Playwright) — na primeira vez, rode
                    # `npm run test:e2e:install-browsers` para baixar os navegadores
```
A home page atual é um placeholder mínimo (sem identidade visual/naming definidos).
