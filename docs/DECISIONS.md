# DECISIONS.md — Registro de Decisões

> Log append-only (estilo ADR). A IA registra aqui toda decisão relevante e consulta
> antes de agir. PENDENTE = Decision Gate aguardando resposta humana — não avance no que
> depende dela.

Formato: `D-XXX | data | status | decisão | motivo`

---

## D-001 | 2026-07-28 | ACEITA
Fábrica = **Claude Code + GitHub + GitHub Actions**, sem orquestrador próprio no começo.
Motivo: menor infraestrutura; a Action oficial já dispara por issue/PR/cron e cria PRs.

## D-002 | 2026-07-28 | ACEITA
Primeiro produto = mini livro **"Nossa História"** (casal), sob demanda, com múltiplos
estilos e tamanhos. Motivo: layout quase fixo → automatizável; produto afetivo, bom ticket.

## D-003 | 2026-07-28 | ACEITA
Stack = SvelteKit + Firebase + Stripe + Claude API + print-on-demand (Cloudprinter
candidato). Motivo: aproveita conhecimento existente e reduz tempo até a V1.

## D-004 | 2026-07-28 | ACEITA
Começar na **Claude Max 5x (US$100/mês)** para o interativo; medir consumo antes de
considerar Max 20x. Motivo: uso pesado, mas subir sem medir é prematuro.

## D-005 | 2026-07-28 | ACEITA
Automação (Actions) usa `ANTHROPIC_API_KEY` (custo por token), Sonnet padrão, Opus só em
tarefa difícil. Motivo: controlar custo. Reavaliar OAuth por assinatura na doc vigente.

## D-006 | 2026-07-28 | ACEITA
Geração de conteúdo por **skills versionadas e isoladas**, com golden samples e testes de
estilo no CI. Nada de prompt solto. Motivo: consistência + evolução sem quebrar.

## D-007 | 2026-07-28 | ACEITA
Produto com **múltiplos estilos** de foto, via biblioteca de skills. Motivo: requisito;
diferencia a oferta e permite crescer o catálogo.

## D-008 | 2026-07-28 | ACEITA
Produto com **múltiplos tamanhos**, cada um um SKU de impressão. Motivo: requisito (preço/premium).

## D-009 | 2026-07-28 | ACEITA
**Dashboard admin** com visibilidade total (vendas, custo unitário, margem, custo de IA,
envios, status, logs, performance), por estilo/tamanho. Cada etapa emite métricas.
Motivo: requisito de controle visual.

## D-010 | 2026-07-28 | ACEITA
Segurança de primeira classe, com baseline obrigatório. Enfraquecê-lo é Decision Gate.
Motivo: evitar hacking e vazamento de dados pessoais (LGPD).

## D-011 | 2026-07-28 | ACEITA
Princípios permanentes de performance + custo: geração assíncrona, cache/prompt caching,
modelo por tarefa, imagens otimizadas + CDN, observabilidade de custo unitário.
Motivo: solução performática e barata de operar.

## D-012 | 2026-07-28 | ACEITA
**Allow-list de ferramentas por papel** (least privilege) nos workflows, via
`--allowed-tools` no `claude_args`: Reviewer e Security são **read-only** (sem Edit/Write);
Developer **não tem `gh pr merge`** — na Fase 0 o merge é humano. O `.claude/settings.json`
permanece como **2ª camada** de defesa. Motivo: sem allow-list a Action nega `Bash` e o
agente não consegue trabalhar; com allow-list ampla demais, um agente autônomo no CI teria
mais poder que o necessário para o seu papel.
Nota (2026-07-28): Reviewer e Security incluem também comandos de **leitura read-only**
(`cat`, `ls`, `head`, `tail`, `wc`, `find`, `grep`, `git diff/log/show`) — sem eles o
Reviewer gastava turnos batendo em ferramenta negada e estourou o `--max-turns`. Rede
continua fora (`curl`, `wget`), assim como `Edit`/`Write` e `gh pr merge`.
Emenda (2026-07-29): o **Developer** (`implement.yml`) recebe a mesma ampliação — allow-list
de leitura/utilitários (`gh issue:*`, `gh pr view:*`, `gh api:*`, `gh run:*`, `npx`, `node`,
`cat`, `ls`, `find`, `grep`, `sed`, `mkdir`, `mv`, `cp`) e `--max-turns 40`. Motivo: mesmo
sintoma do Reviewer — o agente queimava turnos em ferramenta negada e terminava em
`error_max_turns` sem abrir PR. **`gh pr merge` continua fora**: o merge segue humano na
Fase 0, assim como `curl`/`wget`.
2ª emenda (2026-07-29): o Developer ganha ainda `TodoWrite`, `head`, `tail`, `wc`, `echo`,
`gh pr list:*` e `gh pr ready:*`. Motivo: mesmo sintoma pela terceira vez — os runs
`30486974039`, `30487192243` e `30478412140` acumularam 1, 5 e **8** negações de ferramenta
(no último, 41 turnos em 244 s: puro thrash até estourar o teto). `head`/`tail`/`wc` já
estavam liberados para o Reviewer desde a nota de 2026-07-28; a emenda anterior esqueceu de
dar os mesmos ao Developer. **`gh pr merge` continua fora**, e `--max-turns` fica em 40 —
nenhum dos runs de #30–#35 bateu no teto, então subir seria tratar sintoma inexistente.

## D-013 | 2026-07-28 | ACEITA
`allowed_bots: "claude"` em todo step da `claude-code-action`, **nunca `"*"`**. Motivo: os
PRs da fábrica são abertos pelo bot, e por padrão a action recusa rodar em PR de ator
não-humano — sem isso, todo PR gerado nasce sem revisão. A doc do `action.yml` alerta que
`"*"` num repositório público permite que Apps externos injetem prompts; nomear só o nosso
bot mantém o least privilege do [D-012].

## D-014 | 2026-07-28 | ACEITA
**Branch protection na `main`**: exigir PR (sem push direto), status checks obrigatórios
`ci`, `review` e `ai-security-review`, e branch atualizada com a base antes do merge
("require branches to be up to date"). Motivo: eliminar o "verde sem revisão" — houve um
caso real em que a `claude-code-action` pulou a execução por *workflow validation* e
mesmo assim os três jobs de revisão saíram com exit 0, deixando o PR verde sem que
ninguém tivesse revisado. Isso viola na prática a regra inviolável nº 2 do `CLAUDE.md`.
O "require up-to-date" também previne o merge ref defasado que causou aquele skip.
`enforce_admins` fica desligado: o dono do repositório continua podendo destravar a
fábrica manualmente na Fase 0.

**NÃO APLICADA ainda (2026-07-28):** a API devolve `403 Upgrade to GitHub Pro or make
this repository public` tanto em `branches/main/protection` quanto em `rulesets` — em
repositório **privado** essas features exigem GitHub Pro. A decisão fica ACEITA e o
enforcement pendente de uma destas saídas: (a) GitHub Pro, (b) tornar o repo público,
(c) guard-rail dentro do próprio CI enquanto isso.

**Ponte implementada (c):** `review.yml` e `ai-security-review` ganharam um step final
`Exigir veredito publicado no PR`, que falha o job se nenhum comentário de bot tiver
aparecido no PR desde o início da revisão. Assim o skip silencioso da action vira check
vermelho em vez de verde. Não consome tokens da Anthropic (só `gh api`) e roda dentro dos
jobs já existentes, sem minuto extra de Actions. **Limite:** é convenção, não bloqueio —
sem branch protection, ainda é possível mergear por cima de um check vermelho. Até o
enforcement real existir, **conferir os checks à mão antes de cada merge**. Será mantido como está até o repositório amadurecer mais, aceitando o risco descrito de merge manual sobre CI vermelho.

Decorrência: `claude-code-review.yml` foi desativado (renomeado para `.yml.disabled`).
Os revisores oficiais passam a ser `review.yml` e `ai-security-review` (em `security.yml`),
que são os checks exigidos aqui. `claude.yml` (responder a @claude) segue ativo.

**Exceção (2026-07-29):** PRs cujo diff se limita a `review.yml`/`security.yml` são isentos do
guard-rail de veredito (que não consegue rodar neles por "workflow validation") e exigem
revisão humana + merge manual. Vale só quando o diff se restringe a arquivos de workflow;
se houver código de produto junto, separar em dois PRs.

## D-015 | 2026-07-28 | ACEITA
**Cadência e custo da fábrica.** O Supervisor passa a rodar **1x por dia útil**
(`cron: "0 11 * * 1-5"` = 08:00 BRT, seg–sex) **+ on-demand** pelo `workflow_dispatch`,
em vez de de hora em hora. Em troca do volume, o foco vai para **issues bem
especificadas** (ver [D-017]): menos execuções, cada uma produzindo trabalho que o
Developer consegue implementar sem adivinhar. Complementos desta decisão:
- **Opus e revisão de segurança devem ser gateados por paths sensíveis** (pagamentos,
  auth, regras do Firebase, tratamento de foto/PII) em vez de rodar Opus em todo PR —
  **a implementar**, não vale como feito.
- **Aproveitar prompt caching** nas execuções da fábrica (princípio já firmado em [D-011]).
- A **fundação da Fase 1** é construída preferindo o **interativo** (Claude Max, custo já
  pago em [D-004]) em vez do agendado; a automação entra depois que a base existe.
Motivo: a cadência horária gastava API medida repetindo planejamento sobre um repositório
que muda pouco, e a curadoria da fundação ainda é humana.

## D-016 | 2026-07-28 | ACEITA
**Toggle de autenticação por variável de repositório `FACTORY_AUTH`.** Todo step da
`claude-code-action` nas nossas workflows (`implement`, `review`, `security`,
`supervisor`, `fix`, `daily-report`) passa as duas credenciais em expressão condicional:
`anthropic_api_key` quando `vars.FACTORY_AUTH != 'oauth'` e `claude_code_oauth_token`
quando `== 'oauth'`; a não usada chega como string vazia. Default (variável ausente ou
`api`) = **API medida** por token, mantendo [D-005]; `FACTORY_AUTH=oauth` = **assinatura**
via `CLAUDE_CODE_OAUTH_TOKEN`. Motivo: alternar o modelo de custo passa a ser mudar uma
variável em Settings → Variables, sem editar nem revisar workflow.
Verificado: `base-action/src/validate-env.ts` da action valida com checagem *falsy*
(`!anthropicApiKey && !claudeCodeOAuthToken && !hasWorkloadIdentity`) e o `action.yml`
faz `inputs.x || env.x` — string vazia é tratada como **ausente**, e não há checagem que
proíba passar as duas inputs. Logo o toggle funciona sem reusable workflow.
Nota: `claude.yml` (responder a @claude) ficou fora de propósito, para não alterar o
caminho interativo enquanto o toggle é validado.

## D-017 | 2026-07-28 | ACEITA
**Padrão de issue obrigatório** para toda issue da fábrica:
`.github/ISSUE_TEMPLATE/factory-task.md`, com Contexto/Por quê, Objetivo, Escopo, Fora de
escopo, Critérios de aceite (checklist verificável), Requisitos técnicos/decisões,
Arquivos prováveis, Testes exigidos, Dependências e Definition of Done. O prompt do
Supervisor foi atualizado para segui-lo e para criar como `decision-needed` — nunca
`status:ready` — qualquer tarefa que toque uma decisão PENDENTE (D-100..D-106).
Motivo: com a cadência reduzida de [D-015], o valor de cada execução está na qualidade da
especificação; issue vaga vira PR errado e queima duas rodadas de CI e revisão.

## D-018 | 2026-07-29 | ACEITA
**Hospedagem do app SvelteKit = Netlify** (opção B da issue #28), com `adapter-netlify`,
deploy automático por push e deploy preview por PR. Motivo: o usuário já usa Netlify há
tempo em outros projetos — padroniza a operação e evita mais um provedor para manter.
Escopo: só a hospedagem do app (desbloqueia F1-08). Onde roda a fila+worker de geração
pesada (F2-07) e o provedor de print-on-demand (F3-01) seguem PENDENTES em [D-104],
a decidir quando essas fases chegarem.

## D-019 | 2026-07-29 | ACEITA
**Contrato de saída do Developer + guard-rail de saída no `implement.yml`.** Motivo: o
Developer terminava `success` **sem branch, sem PR e sem comentário**, e a fábrica não tinha
como perceber — runs `30470508059` (#22), `30486974039` (#30), `30486980529` (#31) e
`30487192243` (#33) saíram verdes com zero artefato; o de #30 gastou 20 turnos e US$ 0,89 e o
runner foi destruído com tudo dentro. O caso de #22 foi mascarado por um PR aberto à mão
(#25), e foi por isso que a falha sobreviveu quatro issues.

Diagnóstico: `.claude/agents/developer.md` nunca nomeava `git push` (a palavra "push" não
existia em nenhum arquivo de `.claude/agents/`) e não tinha obrigação terminal; e
`implement.yml` era o único workflow de IA **sem nenhum step depois da action** — enquanto
`review.yml`/`security.yml` têm o "Exigir veredito publicado no PR" da ponte (c) do [D-014].
Essa assimetria é o que separava os workflows que produzem dos que não produzem.

O que passa a valer:
1. **Três desfechos aceitáveis, nunca o silêncio:** (a) PR referenciando a issue;
   (b) issue `decision-needed`; (c) comentário na issue explicando o bloqueio. O contrato
   está tanto em `.claude/agents/developer.md` quanto **inline no prompt** de
   `implement.yml` — o prompt é o único texto garantido em contexto, já que o workflow não
   instancia subagente e o `tools:` do frontmatter dos agentes é **inerte no CI**.
2. **Publicar cedo:** branch empurrada e PR aberto na primeira mudança que compile, não no
   fim. Se a sessão morrer, o trabalho sobrevive.
3. **Flag de completude** em três sinais: label `entrega:incompleta` → `entrega:completa`,
   prefixo `[WIP]` no título, e checkbox no corpo do PR. Draft PR **não** serve — GitHub não
   oferece draft em repositório privado no plano Free, a mesma limitação de plano que travou
   o enforcement do [D-014].
4. **Guard-rail** (`gh` puro, zero token): sem PR e sem `decision-needed` → job **vermelho**
   + comentário na issue; PR sem `entrega:completa` → **vermelho** como entrega parcial;
   PR com `entrega:completa` → verde. Presumir sucesso deixa de ser possível.
5. **`concurrency` por issue** (`cancel-in-progress: false`), atendendo a
   `docs/AUTONOMY.md` §5. Grupo por issue e não global de propósito: um grupo único faria o
   GitHub cancelar o run pendente e perder a issue em silêncio. A serialização entre issues
   diferentes fica operacional — seis runs disparados em 4 min derrubaram três sessões no 1º
   turno (`is_error:true`, `num_turns:1`, US$ 0,000744 e ~192 s **idênticos** nos três).
6. **`setup-node` + `npm ci` no workflow**, espelhando `ci.yml`: o agente gastava turnos
   instalando dependência sem cache antes de poder tocar no código. Em contrapartida o
   Developer **não** roda `test:e2e` (~115 MB de browser) nem `test:rules` (JVM + emulador) —
   quem roda esses é o CI, em jobs próprios.
7. **Transcrição como artefato** (`if: always()`, retenção 7 dias). O commit `b294cc8` havia
   apagado o step que despejava cada `tool_use` e cada negação, e `show_full_output` está
   desligado: as negações de ferramenta ficaram indiagnosticáveis justamente onde a fábrica
   falha. Artefato em vez de `show_full_output: true` para não jogar a transcrição no log.
8. **`workflow_dispatch` com input `issue`**: re-disparar deixa de exigir remover e recolocar
   label. E o caminho `issue_comment` passa a ignorar comentário em PR (lá quem responde é o
   `claude.yml`), que daria falso-vermelho no guard-rail.

Não é Decision Gate: nada de preço, catálogo ou dado pessoal, e o baseline de segurança não é
afrouxado — `gh pr merge` continua fora e o merge segue humano ([D-012]).

---
## PENDENTES (Decision Gates antes do lançamento)
- **D-100** | Retenção/exclusão das fotos (LGPD): excluir após X dias ou manter até pedido?
- **D-101** | Preço da V1 por estilo e tamanho (depende do custo real por SKU).
- **D-102** | Provedor de geração de imagem (qual, custo por livro, qualidade).
- **D-103** | Prévia antes ou depois do pagamento?
- **D-104** | Onde roda a geração pesada de PDF/arte (fila+worker, F2-07) e provedor de
  print-on-demand definitivo (F3-01). A hospedagem do app SvelteKit **saiu deste gate** e
  foi decidida em [D-018] (Netlify); o restante continua PENDENTE.
- **D-105** | Quais estilos entram no catálogo público da V1 (sugestão: 2–3 consistentes).
- **D-106** | Quais tamanhos entram na V1 e a spec exata de cada SKU.
