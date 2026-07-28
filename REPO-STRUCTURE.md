# REPO-STRUCTURE.md — Onde e como salvar cada arquivo

> Mapeia o Blueprint para as convenções **oficiais do Claude Code** (diretório
> `.claude/`, `CLAUDE.md`, `rules/`, `skills/`, `agents/`, `settings.json`).

## Os 3 princípios

### 1 — Só o `CLAUDE.md` carrega em toda sessão; o resto carrega sob demanda
`CLAUDE.md` é lido no início de toda sessão (mantê-lo < ~200 linhas; é o índice).
As specs longas ficam em `docs/` e são lidas quando a tarefa precisa. Regras que só
valem para certos arquivos vão em `.claude/rules/*.md` com frontmatter `paths:`.

### 2 — Orientação (guidance) ≠ Imposição (enforcement)
`CLAUDE.md` e `rules/` são orientação (a IA lê e tende a seguir). `.claude/settings.json`
(permissions + hooks) é **imposto**. Regras invioláveis precisam de respaldo lá.

### 3 — Dois tipos de "skill/agente" moram em lugares diferentes
- Agentes da fábrica (constroem o software) → `.claude/agents/*.md` + workflows.
- Skills de runtime do produto (geram cada livro) → `src/lib/product-skills/…` (assets
  do app), **não** em `.claude/skills/`.

## Árvore do repositório
```
personal-gift-project/
├── CLAUDE.md                      # entrypoint enxuto — commitado
├── REPO-STRUCTURE.md              # este guia
├── README.md
├── .gitignore
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   ├── AUTONOMY.md
│   ├── ROADMAP.md
│   └── DECISIONS.md
├── .claude/
│   ├── settings.json              # permissions + hooks (ENFORCED) — commitado
│   ├── settings.local.json.example# copie p/ settings.local.json (gitignored)
│   ├── rules/                     # security.md, payments.md, product-skills.md, testing.md
│   ├── agents/                    # supervisor.md, developer.md, reviewer.md
│   └── skills/                    # skills de DEV, ex.: new-style/SKILL.md
├── src/lib/product-skills/        # ESTILOS DE RUNTIME do produto
│   ├── narrative-style/<estilo>/
│   ├── photo-style/<estilo>/
│   ├── layout-element/<elemento>/
│   └── registry.json
└── .github/workflows/             # ci, supervisor, implement, review, security, fix, daily-report
```

Commit: quase tudo em `.claude/` é commitado; `settings.local.json` é gitignored
(por isso entregamos um `.example`). `.mcp.json`, se você usar MCP no time, vai na
**raiz** (não em `.claude/`).

## Hierarquia projeto vs pessoal vs global
- Projeto (este repo): `CLAUDE.md`, `.claude/…` — compartilhado/commitado.
- Pessoal por projeto: `.claude/settings.local.json` — gitignored.
- Global do seu usuário: `~/.claude/` — vale para todos os seus projetos, não commitar aqui.
Config mais específica vence a mais geral; listas de permissão se somam entre níveis.
