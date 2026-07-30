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
npm run test:rules # testes das regras do Firebase no emulador (exige Java 21+)
```
A home page atual é um placeholder mínimo (sem identidade visual/naming definidos).

## Firebase (Fase 1 — F1-04)
- `firestore.rules` / `storage.rules` — regras mínimas: cada usuário só acessa os
  próprios dados e o Storage é inalcançável pelo SDK cliente. Fotos só por **URL
  assinada e expirável** gerada em `src/lib/server/signed-url.ts`.
- `firebase.json` — configuração das regras e dos emuladores (Auth/Firestore/Storage).
- `npm run test:rules` sobe o emulador e prova as negações de acesso. Roda com o
  projeto fake `demo-personal-gift`, **sem** credencial real e sem custo; precisa de
  Java 21+ instalado (o CI instala sozinho).
- Configuração vem só de variáveis de ambiente: copie `.env.example` para `.env` e
  preencha com os dados do seu projeto Firebase. Criar o projeto no console do
  Firebase e gerar a service account é passo manual.

## Deploy (Fase 1 — F1-08)
Hospedagem do app na **Netlify** ([D-018](docs/DECISIONS.md)), via `@sveltejs/adapter-netlify`.
O que já está versionado no repositório:
- `svelte.config.js` usa `adapter-netlify` (saída compatível com o build da Netlify).
- `netlify.toml` na raiz define o comando de build (`npm run build`), o diretório de
  publicação (`build`) e a versão do Node (`NODE_VERSION`, espelhando
  `.github/workflows/ci.yml`).

Passo manual do dono do projeto (depois do merge, fora do escopo desta issue):
1. Criar o site na Netlify e conectar este repositório — isso já habilita deploy
   automático por push na `main` e deploy preview por PR.
2. Cadastrar no painel da Netlify as variáveis de ambiente que o app precisa (ver
   `.env.example`): `PUBLIC_FIREBASE_*` (6, expostas ao cliente por design — por isso
   estão em `SECRETS_SCAN_OMIT_KEYS` no `netlify.toml`) e, para as rotas de servidor,
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
   `FIREBASE_STORAGE_BUCKET`.
   `FIREBASE_PROJECT_ID` e `FIREBASE_STORAGE_BUCKET` também estão em
   `SECRETS_SCAN_OMIT_KEYS`, mesmo sendo variáveis de servidor: seus valores são
   idênticos aos das `PUBLIC_FIREBASE_*` correspondentes — identificadores do
   projeto (ex.: o nome do repositório), não credencial. `FIREBASE_CLIENT_EMAIL` e
   `FIREBASE_PRIVATE_KEY` **não** estão isentas — continuam sob varredura (ver
   [D-028](docs/DECISIONS.md)).
3. Depois do primeiro deploy, conferir os headers de resposta (`curl -I <url>`) e abrir
   issue de acompanhamento se algum faltar.
