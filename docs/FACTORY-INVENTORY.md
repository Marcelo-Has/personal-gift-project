# FACTORY-INVENTORY.md — Inventário da fábrica autônoma

**O que é:** o índice de todos os artefatos que compõem a *fábrica* (o processo que constrói o
produto), separados do código do produto em si. Uma linha por artefato: caminho, propósito e a
referência que o originou ou governa.

**Por que existe:** é a fotografia do "antes" do processo de evolução da fábrica (EV). É o par
documental da tag **`fabrica-baseline-2026-08`**, que congela este mesmo estado no histórico do
Git. Qualquer mudança estrutural na fábrica daqui em diante é medida contra este baseline.

**O que este arquivo não é:** não é enciclopédia nem substitui a leitura dos arquivos. É índice
— uma linha por item, sem arqueologia (`.claude/rules/right-sizing.md`).

**Convenção da coluna Origem:** a referência (`D-xxx` / `FU-xx` / `#issue`) que o próprio arquivo
cita no cabeçalho, ou a decisão que o criou. `—` quando o artefato nasceu no bootstrap do repo ou
não tem referência localizável rapidamente.

---

## 1. Raiz do repositório

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `CLAUDE.md` | Entrypoint lido em toda sessão: contexto, regras invioláveis, papéis e ponteiros para `docs/`. | — |
| `REPO-STRUCTURE.md` | Mapeia o Blueprint para as convenções oficiais do Claude Code — onde salvar cada tipo de arquivo. | — |

## 2. Configuração do Claude Code (`.claude/`)

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `.claude/settings.json` | Permissões (allow/deny) e hooks `PreToolUse` versionados — o guard-rail de execução da fábrica. | — |
| `.claude/settings.local.json.example` | Modelo do `settings.local.json` (gitignored) para preferências pessoais que se somam ao `settings.json`. | — |

## 3. Regras temáticas (`.claude/rules/`) — carregam por `paths:`

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `.claude/rules/payments.md` | Regras de pagamento: preço é Decision Gate, webhook Stripe sempre com assinatura validada. | — |
| `.claude/rules/product-skills.md` | Toda geração de conteúdo passa pelo `registry.json`; nada de prompt solto no código de aplicação. | D-060 |
| `.claude/rules/right-sizing.md` | Filtro anti-over-engineering: qualidade sem excesso; LOW/INFO e risco hipotético se adiam. | — |
| `.claude/rules/security.md` | Baseline de segurança obrigatório: authz, regras do Firebase, URLs assinadas, segredos, sem PII em log. | — |
| `.claude/rules/testing.md` | Todo código novo com teste; E2E Playwright; mockar externo, não módulo interno. | — |

## 4. Papéis / subagentes (`.claude/agents/`)

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `.claude/agents/developer.md` | Developer: implementa UMA issue por branch, escreve testes e abre PR pequeno. | D-012, D-019 |
| `.claude/agents/reviewer.md` | Reviewer: revisão independente de correção, manutenibilidade e vazamento de dado. Read-only. | D-033, FU-12 |
| `.claude/agents/supervisor.md` | Supervisor: lê o Blueprint, escolhe tarefas não bloqueadas e cria issues. Não escreve código de produto. | D-031, D-045 |
| `.claude/agents/verdict.md` | Verdict: julga completude de PR `entrega:incompleta` — separado de quem escreveu o código. | #50, D-019 |

## 5. Skills de desenvolvimento (`.claude/skills/`) — uma linha por skill

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `.claude/skills/answer-decision/` | Responde um `decision-needed`: grava em DECISIONS.md, comenta e fecha a issue. | — |
| `.claude/skills/fix-ci/` | Investiga e corrige CI vermelho de um PR na própria branch; reconhece o falso-vermelho do D-014. | D-014 |
| `.claude/skills/harden-workflows/` | Endurece os Actions (pin por SHA, `npm audit` como gate); exige merge manual pelo impasse D-014. | D-014 |
| `.claude/skills/new-issue/` | Cria issue no padrão do repo, verificando dependências e Decision Gates antes. | D-045, FU-16 |
| `.claude/skills/new-style/` | Scaffold de novo estilo de produto (narrative/photo/layout) com golden samples e registro no `registry.json`. | — |
| `.claude/skills/pause/` | Pausa a fábrica: desabilita os workflows que agem sozinhos, sem apagar nada. | — |
| `.claude/skills/resume/` | Retoma a fábrica: reabilita os workflows autônomos pausados pelo `/pause`. | — |
| `.claude/skills/triage-pr/` | Tria os achados de revisão de um PR e resolve só o que pertence a ele; o resto vira sub-FU. | — |

## 6. Workflows (`.github/workflows/`)

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `.github/workflows/ci.yml` | O juiz não-IA da fábrica: lint + testes + build. Nenhum merge com CI vermelho. | — |
| `.github/workflows/claude.yml` | Claude interativo: responde a `@claude` em issues, PRs e comentários de revisão. | D-019 |
| `.github/workflows/daily-report.yml` | **Agendado.** Relatório diário do progresso como issue + rede de retaguarda da re-entrada automática. | FU-09, FU-13, FU-17, #71 |
| `.github/workflows/fix.yml` | Quando o CI falha, o Claude tenta corrigir automaticamente na branch do PR. | D-025, D-026, #55 |
| `.github/workflows/implement.yml` | O Developer: implementa issues com label `status:ready` e abre PR. | D-019 |
| `.github/workflows/review.yml` | O Reviewer: revisão independente por IA em cada PR, gateada pela label de completude. | D-014, D-019 |
| `.github/workflows/security.yml` | Revisão de segurança dedicada + scans de dependências e segredos em cada PR. | D-014, D-019 |
| `.github/workflows/supervisor.yml` | **Agendado.** O coração da fábrica: lê o Blueprint, escolhe tarefas e cria issues. | D-015, D-016 |
| `.github/workflows/verdict.yml` | Julga, após o CI ficar verde, se um PR `entrega:incompleta` já atende aos critérios de aceite. | #50, #55 |
| `.github/workflows/claude-code-review.yml.disabled` | **DESATIVADO** (renomeado para `.disabled`): revisão genérica substituída pelos revisores afinados. | D-014 |

## 7. Templates de issue (`.github/ISSUE_TEMPLATE/`)

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `.github/ISSUE_TEMPLATE/factory-task.md` | Padrão obrigatório de toda issue de trabalho: especificação suficiente para o Developer não adivinhar. | D-017 |

## 8. Testes da própria fábrica (`tests/`)

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `tests/workflows/reentrada.test.ts` | Executa de verdade o filtro `jq` do `daily-report.yml` que seleciona PRs para re-entrada automática. | FU-17, #90 |
| `tests/hooks/pretooluse.test.ts` | Alimenta os hooks `PreToolUse` do `settings.json` com payload-fixture na stdin — impede que o controle volte a ficar inerte. | #56, #57 |

## 9. Doc operacional de infra

| Caminho | Propósito | Origem |
| --- | --- | --- |
| `docs/DEPLOY-WORKER.md` | **INFRA** — deploy do worker de geração no Cloud Run: o controle de acesso é da plataforma, não da aplicação. | D-069, #148 |

---

## Delta desde o baseline

**Esta seção NÃO faz parte da fotografia.** As tabelas acima descrevem a fábrica em **2026-08-11**
e não são reescritas: é contra elas que a evolução se mede, e corrigir uma linha lá apagaria
justamente o "antes". A linha do `developer.md`, por exemplo, continua com o nome que o arquivo
tinha naquela data — o rename está registrado aqui embaixo.

Aqui fica o **registro do que mudou**: uma linha por artefato criado, renomeado ou aposentado depois
da tag, na mesma convenção de coluna. Quando a EV fechar e um novo baseline for tirado, esta seção
se dissolve nas tabelas do inventário seguinte.

| Caminho | O que mudou | Origem |
| --- | --- | --- |
| `bench/` (README, `coleta.md`, `rubricas.md`, `cenarios/C1..C5`) | **Novo.** Harness de avaliação da fábrica: cenários, rubricas e coleta que produzem o número de baseline contra o qual a EV se mede. | EV1.2 |
| `.claude/agents/developer.md` → `.claude/agents/developer-lead.md` | **Renomeado**, com o `name:` do frontmatter junto. O papel virou coordenador em D-078 §3 mas o identificador ficou para trás; a fábrica carregava dois nomes para a mesma coisa. | D-078, D-081 |
| `.claude/agents/developer-frontend.md` | **Novo.** Especialista de interface, instanciado pelo lead em tarefa cross-layer. Não abre PR nem decide desfecho. | D-078 |
| `.claude/agents/developer-backend.md` | **Novo.** Especialista de domínio, dados e integrações, nas mesmas condições. | D-078 |
| `.claude/agents/design-director.md` | **Novo.** Conduz a Fundação de design e para no Decision Gate: quem aprova identidade é o dono. | D-078 |
| `.claude/agents/refiner.md` | **Novo.** Spec Gate: completa o planejamento da issue COM o dono, entre o ROADMAP e o `status:ready`. Read-only sobre código. | D-079 |
| `.claude/rules/design-antipatterns.md` | **Nova rule.** Os anti-patterns de IA proibidos como default inconsciente; vale com qualquer skill ativa e sem nenhuma. | D-078 |
| `.claude/skills/design-foundation/` | **Nova skill.** Conduz a Fundação (roda uma vez por projeto) e produz o `DESIGN.md` CANDIDATO. | D-078 |
| `DESIGN.md` (raiz) | **Novo.** Fonte de verdade visual do produto, de que toda tarefa de UI deriva. `Status: aprovado` desde 2026-08-13. | D-078, D-080 |
| `docs/design/` (`DESIGN-TEMPLATE`, `CRAFT-PRINCIPLES`, `SKILL-ROUTER`, `BRAND-ASSETS`, `VARIETY-REGISTRY`, `playbooks/` com 6 arquivos) | **Novos.** Os contratos da camada de Design Engineering: template, piso de craft, ordem de autoridade das skills, inventário de marca, registro anti-homogeneização e os playbooks de categoria. | D-078 |
| `design/assets/` | **Novo.** Diretório de assets de marca lido pela Fundação (**R-ASSETS**); hoje só com o `README.md`, e a ausência está verificada no `DESIGN.md` §14. | D-078, D-080 |
| `.github/scripts/gate-design-md.mjs` | **Novo.** Gate determinístico não-IA: PR que toca UI reprova sem `DESIGN.md` existente e aprovado. Fail-closed. Roda no job `design-md` do `ci.yml`. | D-078 §2, D-081 |
| `tests/workflows/design-md.test.ts` | **Novo.** Executa o gate acima e afere o código de saída em 22 casos. | D-081 |

**Delta em:** 2026-08-13 · **13 linhas** (5 papéis · 1 rule · 1 skill · 1 gate + 1 teste · 3
conjuntos de contrato/harness).

---

**Inventário em:** 2026-08-11 · **Total: 35 itens**
(raiz 2 · `.claude/` 2 · rules 5 · agents 4 · skills 8 · workflows 10 · issue templates 1 · testes da fábrica 2 · infra 1)

**Baseline no Git:** tag `fabrica-baseline-2026-08`.
