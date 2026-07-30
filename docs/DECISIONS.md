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
2ª emenda (2026-07-29): o Developer ganha ainda `TodoWrite`, `head`, `tail`, `wc`, `echo` e
`gh pr list:*` (`gh pr ready` **não**: draft PR não existe em repo privado no plano Free, então
a flag de completude do [D-019] é por label, não por draft). Motivo: mesmo sintoma pela
terceira vez — os runs
`30486974039`, `30487192243` e `30478412140` acumularam 1, 5 e **8** negações de ferramenta
(no último, 41 turnos em 244 s: puro thrash até estourar o teto). `head`/`tail`/`wc` já
estavam liberados para o Reviewer desde a nota de 2026-07-28; a emenda anterior esqueceu de
dar os mesmos ao Developer. **`gh pr merge` continua fora**, e `--max-turns` ficou em 40 —
nenhum dos runs de #30–#35 havia batido no teto, então subir seria tratar sintoma inexistente.
3ª emenda (2026-07-30): **`--max-turns` 40 → 60.** Agora o teto **é** o gargalo, comprovado
pela transcrição do run `30503680892`: 41 turnos, zero negações, a issue #31 inteiramente
implementada com `lint`/`test`/`build` verdes, e nenhum turno sobrando para commit/push/PR —
tudo perdido com o runner. Ver [D-019], 4ª rodada.
4ª emenda (2026-07-30): o **`fix.yml`** recebe finalmente a mesma ampliação de leitura e
utilitários — `TodoWrite`, `gh issue:*`, `npx`, `node`, `cat`, `ls`, `head`, `tail`, `wc`,
`echo`, `find`, `grep`, `sed`, `mkdir`, `mv`, `cp`. Motivo: **quarta ocorrência do mesmo
sintoma, e a mais teimosa.** A allow-list do `fix.yml` era a original do primeiro dia — as três
emendas anteriores contemplaram Reviewer e Developer e passaram por cima dele. Resultado: quatro
runs seguidos estourando o teto sem produzir um único commit (`30506482646`, `30509108285`,
`30511102142`), o último com **`permission_denials_count: 14`** em 41 turnos, ou seja **um terço
do orçamento gasto batendo em ferramenta negada**. Foi o mesmo diagnóstico das emendas de 07-28
e 07-29, repetido porque a correção nunca foi aplicada a todos os papéis de uma vez.
Ficam **fora** de propósito, por menor privilégio: `gh pr create` (ele age em PR existente),
`gh api` e `gh run` amplos — `gh run view` basta para ler log de CI. `gh pr merge` continua fora
de todas as allow-lists.
Lição aplicada na hora, e não só registrada: **os seis workflows de IA foram auditados de uma
vez**, em vez de contemplar só o que doeu — que é o erro que fez este sintoma voltar quatro
vezes. `review` e `security` ganham `TodoWrite`; `supervisor` e `daily-report` ganham
`TodoWrite` + os utilitários de leitura (`cat`, `ls`, `head`, `tail`, `wc`, `find`, `grep`).
Nenhum dos dois últimos havia estourado teto ainda — é justamente o ponto de fazer agora.

Menor privilégio conferido depois da mudança, papel por papel: `gh pr merge` **fora dos seis**;
`Edit`/`Write` só em `implement` e `fix`, os dois que de fato alteram código; `review`,
`security`, `supervisor` e `daily-report` seguem read-only; rede (`curl`/`wget`) fora de todos.

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

Endurecimento vindo da revisão do PR #36 (aplica o baseline, não o afrouxa):
- **Gate de autor no gatilho `issue_comment`** (`author_association` em
  OWNER/MEMBER/COLLABORATOR). Sem ele, qualquer pessoa com acesso **somente-leitura**
  comentava "@claude" numa issue e disparava um job com `contents: write` conduzido por um
  agente que roda `npm`/`node`/`git` — escalada read → write, com o corpo do comentário
  entrando direto no contexto do agente. O caminho `issues`/`labeled` não precisa do gate:
  aplicar label já exige write/triage, e é por ele que o Supervisor (claude[bot]) abre trabalho.
- **`ISSUE` validado como só-dígitos.** O input do `workflow_dispatch` terminava dentro de um
  regex do guard-rail; `--arg` do jq barra injeção de sintaxe jq, não de regex. Disparar com
  `issue: .*` faria o guard-rail achar qualquer PR e sair **verde sem entrega** — o próprio
  falso-sucesso que o D-019 elimina.
- **Transcrição redigida antes do upload.** Artefato do Actions **não** passa pelo masking de
  segredo (só o log do job passa). Bastava o agente rodar `cat .git/config` (extraheader com o
  GITHUB_TOKEN) ou ecoar variável de ambiente para o `CLAUDE_CODE_OAUTH_TOKEN` — que não
  expira no fim do job — cair num arquivo baixável por 7 dias.
- **Guard-rail sem exceção de gatilho.** A primeira versão pulava o guard-rail em
  `issue_comment`, reabrindo o no-op silencioso exatamente por aquele caminho.
- **A `decision-needed` do desfecho (b) tem de citar `#N`.** Sem esse filtro, com dois runs em
  paralelo, o run da issue A passava de graça porque o run da issue B abriu uma
  decision-needed no mesmo instante.

2ª rodada de revisão do PR #36 (os controles acima tinham furos próprios):
- **Só `OWNER` no gate de autor.** `author_association` reflete **associação, não permissão**:
  o GitHub devolve `COLLABORATOR` para qualquer colaborador convidado, inclusive somente-leitura,
  e `MEMBER` para membro de org independente da permissão no repo. Aceitar os três deixava a
  escalada read → write aberta. Repo de um dono só; ampliar depois é decisão consciente.
- **Redação falha FECHADA.** Se o `perl` não completar, o arquivo é apagado em vez de subir cru:
  o upload tem `if: always()` e subiria a transcrição não redigida do mesmo jeito. O upload
  passa a depender de `steps.redigir.outcome == 'success'`.
- **`github_pat_` e `AUTHORIZATION: Bearer` na redação.** PAT fine-grained é uma das saídas
  cogitadas para o impasse do [D-014]; se um dia entrar num secret, não pode vazar no artefato.
- **O guard-rail distingue infra de no-op.** Com `steps.claude.outcome == 'skipped'` (o agente
  nem rodou porque um step anterior quebrou), a mensagem diz isso em vez de acusar o Developer.
  Diagnóstico errado é o que fez esta falha durar quatro issues.

3ª rodada — o primeiro disparo real (run `30502654283`, issue #31) achou dois fatos que
nenhuma revisão de leitura pegaria:
- **O match por `#N` solto era falso-positivo com dente, não nitpick.** O guard-rail atribuiu
  à issue #31 o **PR #36**, que é infra da fábrica e só dizia `Refs #31`. Se aquele PR tivesse
  `entrega:completa`, o job sairia **verde sem entrega nenhuma** — o exato falso-sucesso que o
  D-019 existe para impedir. As duas revisões classificaram isso como LOW/ADIAR; o run
  provou que é correção, não robustez (filtro nº 1 de `.claude/rules/right-sizing.md`).
  Passa a exigir **palavra de fechamento** (`Closes`/`Fixes`/`Resolves` + `#N`), que é o que o
  contrato do Developer manda escrever. Verificado contra os PRs reais do repo: `#31` deixa de
  casar com o #36, e `#22`→#25, `#15`→#16, `#10`→#18 continuam certos.
- **Não é possível testar o `implement.yml` antes do merge.** Disparar contra a branch faz a
  `claude-code-action` responder `Skipping action due to workflow validation: the workflow file
  must ... have identical content to the version on the default branch` — a mesma mecânica que
  o [D-014] registra — e **sair com exit 0**. Ou seja: o Developer nem roda, e sem o guard-rail
  o run sairia verde. Consequência prática: mudança em `implement.yml` só pode ser validada de
  ponta a ponta **depois** do merge humano; e `steps.claude.outcome` **não** detecta esse skip
  (ele é bem-sucedido aos olhos do Actions), então quem o pega é o guard-rail — que é
  precisamente a ponte (c) do D-014 agora estendida ao `implement.yml`.

4ª rodada — o primeiro run em que o Developer **de fato executou** (run `30503680892`, issue
#31, 41 turnos, US$ 1,90, **zero negações de ferramenta**) mostrou que o contrato ainda estava
ambíguo no ponto que mais importa. A transcrição (agora existe, é o ponto 7 acima) mostra a
sequência exata: chamadas 1–27 só leitura; branch criada na chamada **28**; chamadas 29–53
implementaram tudo e `lint`, `test` e `build` passaram; última mensagem *"Now let's re-run
lint, then verify no PII/secrets leak and check final diff"* — e o teto de turnos chegou.
**Nunca houve commit.** O runner foi destruído e a issue inteira, já implementada e verde, foi
perdida. "Na PRIMEIRA mudança que compile, publique" foi lido como "publique no fim", porque
publicar aparecia como consequência de o código estar pronto.

O que muda:
- **Abrir o PR é o PRIMEIRO passo, não o último**, com `git commit --allow-empty` se preciso —
  o objetivo é o PR existir, não estar bom. Prazo explícito: **antes do 10º turno**.
- **Empurrar aos poucos**, a cada arquivo ou etapa, nunca só no fim. Commit empurrado é o
  único estado que sobrevive ao runner.
- **`--max-turns` 40 → 60.** Agora o teto **é** o gargalo, comprovadamente: o agente gastou 41
  turnos só no trabalho, sem sobra para a cerimônia de commit/push/PR. É a primeira vez que
  subir o teto trata a causa e não o sintoma — nos runs de #30–#35 nenhum tinha batido nele.
- **Menos arqueologia:** proibido ler dentro de `node_modules/` (o agente entrou duas vezes na
  fonte do SvelteKit, ~4 turnos), a issue já traz "Arquivos exatos"/"Ler antes", e leituras
  curtas devem ser agrupadas numa chamada.
- Confirmado de passagem: o agente **não leu** `.claude/agents/developer.md` — quem carrega o
  contrato de fato é o prompt do workflow. O arquivo do agente é espelho, não fonte.
- Confirmado de passagem: a redação de segredo do artefato não gerou falso-positivo. Os
  prefixos `sk-ant-`/`github_pat_` aparecem na transcrição só como **strings literais de
  padrão** (o hook de `.claude/settings.json` e este próprio texto), e não foram redigidos
  porque a regex exige 10+ caracteres de token depois do prefixo.

Adiado para o backlog de endurecimento da Fase 5 (`.claude/rules/right-sizing.md`):
`actions: write` acima do necessário no `implement.yml`; `Bash(gh api:*)` e `Bash(git:*)` permitirem
contornar o "merge é humano" por `gh api` ou `git push origin HEAD:main` — risco residual da
mesma limitação de plano do [D-014] (sem branch protection em repo privado no Free); e o
caminho da transcrição ser o default da action, que um bump de SHA pode mudar em silêncio.

Não é Decision Gate: nada de preço, catálogo ou dado pessoal, e o baseline de segurança não é
afrouxado — `gh pr merge` continua fora e o merge segue humano ([D-012]).

## D-021 | 2026-07-30 | ACEITA
**Identidade do comprador pré-checkout = sessão anônima do Firebase Auth**, criada sob
demanda no navegador (`signInAnonymously`, `src/lib/firebase/session.ts`) e verificada no
servidor por `verificarIdToken`/`requireUid` (`src/lib/server/auth.ts`, F1-05a2, issue #31).
No checkout (F1-07) a conta vira real por `linkWithCredential`: o `uid` não muda e nenhum
dado é migrado.

Motivo: a escolha é cara de reverter porque amarra três coisas ao mesmo `uid` — o dono em
`firestore.rules` (`isOwner(userId)`), o prefixo `users/<uid>/` do caminho da foto no
Storage (`photoObjectPath`, `src/lib/server/signed-url.ts:81`) e o modelo de conta do
produto. Trocar depois significaria migrar documentos e objetos já gravados
(`.claude/rules/right-sizing.md`, filtro nº 2).

Alternativa recusada: um id opaco em cookie httpOnly, sem Firebase Auth. Funcionaria para
upload e rascunho (o servidor é o único que escreve), mas criaria um segundo conceito de
identidade a reconciliar no checkout e deixaria o comprador sem conseguir ler o próprio
pedido, já que `firestore.rules` exige `request.auth`.

Anônimo e sem senha: o comprador não deve precisar criar conta para montar o livro.
Especializa [D-003] (stack Firebase já decidida); não a contradiz. Não é Decision Gate: a
escolha aplica o baseline de segurança (usuário só acessa os próprios dados,
`.claude/rules/security.md`) em vez de enfraquecê-lo — `firestore.rules` e `storage.rules`
seguem inalterados.

---
## D-020 | 2026-07-30 | ACEITA
**Tetos de `--max-turns` recalibrados por evidência, não por intuição.** Em 2026-07-30,
**quatro de quatro** workflows de IA estouraram o teto no mesmo dia, cada um num PR real:

| Workflow | Teto | Evidência do estouro | Novo |
|---|---|---|---|
| `implement` | 40 → 60 | run `30503680892` morreu em 41 turnos com a issue #31 pronta e nunca commitada; depois o run `30505689066` morreu em **60** com a #30 já 95% entregue (12 arquivos, +990 linhas, `ci` verde) | **80** |
| `review` | 30 | `error_max_turns` em 31 turnos duas vezes (PR #36 e PR #40) | **50** |
| `ai-security-review` | 30 | `error_max_turns` em 31 turnos no PR #40 | **50** |
| `fix` | 25 | run `30506482646` queimou 25 turnos no PR #41 e **não produziu um único commit** | **40** |

Motivo: os tetos foram calibrados quando o repositório era um scaffold. Com o `src/` real,
diffs de ~1000 linhas, thread de PR longa e issues prescritivas de 150+ linhas, eles passaram
a cortar o agente **no meio**. O argumento decisivo é de custo, não de generosidade: um agente
que morre no teto entrega **nada** e o gasto é 100% perdido — o run `30503680892` custou
US$ 1,90 para produzir zero. Subir o teto converte gasto desperdiçado em trabalho entregue.

`daily-report` (15) e `supervisor` (20) ficam como estão: nenhum dos dois estourou, e a saída
deles é pequena por natureza (um relatório, uma issue).

Complemento: o `fix.yml` passa a ser instruído a **empurrar a cada correção**, pelo mesmo
motivo do [D-019] — no run acima ele corrigiu no disco do runner e perdeu tudo. Ele **não**
ganha guard-rail de saída nesta rodada: já reprova por `max_turns` quando morre, então não há
no-op silencioso a fechar; se aparecer o caso "verde sem commit", aí vale estender.

Não é Decision Gate: não toca preço, catálogo, dado pessoal nem baseline de segurança. Exige
**merge manual** pela exceção do [D-014], porque o diff inclui `review.yml`/`security.yml`.

## D-022 | 2026-07-30 | ACEITA
**Adoção de `zod` para validação de entrada do questionário** (issue #30, F1-05a).
`src/lib/order.ts` modela `CoupleQuestionnaire` como interface TypeScript pura — sem
validação em runtime — e o único precedente do repo (`parseRegistry` em
`src/lib/registry.ts`) é um validador artesanal que não escala para 9 blocos com tupla e
arrays de objeto (`people: [Person, Person]`, `milestones: Milestone[]`, `trips: Trip[]`).

Um schema por etapa em `src/lib/order-schema.ts`, reusado tal e qual no cliente (validação
por passo desta issue) e, na revalidação de servidor de #33, sem cópia divergente — é
exatamente o que `.claude/rules/security.md` exige (revalidar no servidor o que o cliente já
validou). Mensagens de erro em português direto no schema (`z.string().min(1, 'Informe o
nome.')`), para não duplicar texto entre schema e UI.

Escopo: só validação de entrada do questionário. Não é Decision Gate — nada de preço,
catálogo ou dado pessoal de usuário real; `.claude/rules/right-sizing.md` cobre o resto
(nenhum componente genérico tipo "Input"/"Wizard" sem um segundo uso concreto).

## D-023 | 2026-07-30 | ACEITA
**O loop autônomo "corrige → CI confirma → entrega completa" dependia de duas peças que não
existiam.** Ambas descobertas ao tentar concluir o PR #41 (issue #30):

1. **Commit empurrado pelo `claude.yml` NÃO disparava o CI.** Fato observado: o commit
   `0908f5a3` do PR #41 veio de lá, o PR seguiu exibindo os checks do commit anterior, e a API
   devolvia 3 check-runs naquele SHA — só do Netlify. `gh pr close`/`reopen` também não
   recuperou. Foi preciso integrar a `main` na branch à mão só para provocar um CI.

   **Mecanismo provável — hipótese, não causa estabelecida:** `actions/checkout` grava o
   `GITHUB_TOKEN` no `.git/config` (`persist-credentials: true` é o default), e **push feito
   com `GITHUB_TOKEN` não cria workflow run** (comportamento documentado, anti-recursão). O
   push do agente teria saído por essa credencial. O `implement.yml`, cujos pushes sempre
   disparam CI, declara `contents: write`, e a `claude-code-action` loga ali "Updated remote
   URL with authentication token" — indício de que ela só reconfigura o git com o token da App
   quando acredita ter permissão de escrita.

   **Tentativa de correção, e o resultado dela — REVERTIDA.** Apliquei `persist-credentials:
   false` no checkout do `claude.yml`, para que um push dependente do `GITHUB_TOKEN` falhasse
   alto em vez de virar no-op silencioso, mantendo `permissions` em `read`. O run
   `30512293142` mostrou que isso **quebra o workflow inteiro**, e antes de qualquer trabalho:

   ```
   ##[error]Action failed with error: Command failed:
   git fetch origin --depth=20 feat/f1-05a-questionario-esqueleto
   ```

   A `claude-code-action` usa as credenciais persistidas para as **suas próprias** operações de
   git (o `fetch` da branch), não só para o push do agente. Sem elas nem chega a começar.
   Revertido: o checkout volta ao default.

   **O que fica de pé do PR #45**, e é o que valia: o **gate de autor** (`OWNER`) e a
   **allow-list** do `claude.yml` — as duas aplicações de baseline. As `permissions` seguem em
   `read`, como a revisão de segurança do PR #45 exigiu com razão: a justificativa original
   ("o token vem da App, então declare `write`") se anulava.

   **Estado honesto: causa não identificada.** O item segue como hipótese, agora com uma
   tentativa de correção refutada. O loop autônomo **não depende** deste caminho: quem empurra
   correção de CI é o `fix.yml`, que declara `contents: write` e recebe auth por token da App
   como o `implement.yml`. Enquanto isso, re-disparar CI numa branch tocada pelo `claude.yml`
   exige um push humano — foi o que fiz duas vezes no PR #41, integrando a `main`.
2. **O `fix.yml` não conseguia marcar a entrega como completa.** A allow-list dele não tinha
   `gh pr edit`, então mesmo deixando o CI verde ele não trocava `entrega:incompleta` por
   `entrega:completa` — e, pelo gate de custo do [D-019], `review` e `ai-security-review`
   ficam **pulados** enquanto a label não vira. Deadlock: nenhum mecanismo da fábrica
   conseguia levar um PR parcial até revisado. Ele ganha `gh pr edit:*`, `gh pr list:*`,
   `gh issue view:*` e `gh run view:*`, mais a instrução de fechar o ciclo — com a ressalva
   explícita de **não** marcar em caso de dúvida sobre os critérios de aceite.

Junto vêm duas aplicações de baseline no `claude.yml`, ambas apontadas pela revisão do PR #45:

- **Gate de autor** (`author_association == 'OWNER'`). Sem ele, qualquer pessoa que conseguisse
  comentar dispararia um agente com token de escrita. Só `OWNER`, pelo motivo já registrado:
  `COLLABORATOR` sai para colaborador somente-leitura.
- **Allow-list** (`--allowed-tools`), que faltava — era o único workflow de IA sem uma, contra
  o [D-012]. A observação decisiva da revisão: **o gate protege o gatilho, não o contexto.** O
  agente segue lendo a thread inteira (comentários de terceiros, de bot, arquivos, URLs), então
  basta o dono escrever "@claude resolve isso" num PR com texto plantado para instrução de
  terceiro chegar a um agente irrestrito. Lista generosa para não estorvar o uso interativo,
  sem a cauda pior: rede fora, `gh pr merge` fora.

Trade-off aceito e registrado: dar `gh pr edit:*` ao `fix.yml` permite que ele **adicione**
`entrega:incompleta`, e não só remova — o que desligaria as duas revisões de IA daquele PR pelo
gate de custo do [D-019]. É evasão de revisão pelo mecanismo que o próprio D-019 criou. Fica
aceito como MÉDIO porque o `scans` (gitleaks + `npm audit`) não é gateado e continua rodando, o
merge é humano e a label fica visível no PR — mas é o primeiro lugar a olhar se um PR passar
sem revisão. A alternativa (não dar `gh pr edit`) recria o deadlock do item 2.

Efeito colateral aceito: **encadeamento bot→bot deixa de acontecer por `claude.yml`**. Antes,
um comentário de revisão do claude[bot] disparava correção automática — foi assim que o commit
`d4ceb9a` entrou no PR #36. O respondedor autônomo a CI vermelho passa a ser só o `fix.yml`, e
a implementação de issue só o `implement.yml`, cada um com a sua allow-list ([D-012]).
Perde-se emergência, ganha-se previsibilidade e superfície menor.

Não é Decision Gate: aplica o baseline em vez de afrouxá-lo, e não toca preço, catálogo nem
dado pessoal. `gh pr merge` continua fora de todas as allow-lists.

## D-024 | 2026-07-30 | ACEITA
**Transcrição como artefato em todo workflow de IA que escreve código, não só no
`implement.yml`.** O `fix.yml` ganha os mesmos dois steps do [D-019] (redação de segredo que
falha fechada + `upload-artifact`).

Motivo, e ele é uma lição sobre método: o `fix.yml` estourou o teto **quatro vezes** sem
produzir commit. Diagnostiquei como allow-list estreita — havia evidência forte
(`permission_denials_count: 14` em 41 turnos, e a allow-list dele era literalmente a original do
primeiro dia, ignorada pelas três emendas anteriores do [D-012]). A 4ª emenda a levou de 13 para
28 entradas. O run seguinte (`30512032016`) devolveu **`permission_denials_count: 17`** — mais
que antes. **A hipótese foi refutada pelos dados**, e eu não tinha como saber o que estava sendo
negado porque `show_full_output` está desligado e este workflow nunca subiu transcrição.

É exatamente o buraco que o [D-019] fechou no `implement.yml` e que eu deixei aberto aqui: a
fábrica cega justamente onde falha. Regra que passa a valer: **workflow de IA que escreve código
sobe transcrição**. `review`, `security`, `supervisor` e `daily-report` seguem sem artefato por
ora — são read-only e publicam o próprio resultado como comentário, então já deixam rastro;
`review`/`security` ainda dependeriam de merge manual pelo [D-014], o que encareceria a mudança.

Registro honesto do que ainda não se sabe: **as 17 negações do `fix.yml` continuam sem causa
identificada.** O próximo run com artefato responde. Até lá, nenhuma outra emenda de allow-list
deve ser feita por palpite.

## D-025 | 2026-07-30 | ACEITA
**Guard-rail de saída no `fix.yml`**, nos mesmos termos do [D-019]: sem commit novo na branch
e sem explicação no PR, o job fica **vermelho** e comenta no PR. Custo: zero token, só `gh`/`git`.

O [D-020] havia adiado este step com uma condição explícita — *"já reprova por `max_turns`
quando morre, então não há no-op silencioso a fechar; se aparecer o caso 'verde sem commit', aí
vale estender."* **O caso apareceu**, no run `30513015702`: `subtype: success`,
`is_error: false`, 10 turnos, US$ 0,22, **nenhum commit e nenhum comentário no PR**, e o step
do agente **verde**. Exatamente o no-op silencioso que custou quatro issues no `implement.yml`,
agora no `fix.yml`. A condição de adiamento foi cumprida, então o adiamento acabou.

Desfechos aceitos pelo guard-rail: (a) commit novo na branch — comparação de SHA antes/depois;
(b) sem commit, mas **comentário de bot no PR** desde o início do run, ou seja, o Fix não soube
corrigir e **disse isso**. Qualquer outra coisa reprova.

Junto vai a correção de um bug meu: o nome do artefato de transcrição do [D-024] incluía o nome
da branch, que contém `/` — proibido em nome de artefato no Actions. O upload falhava e **a
primeira transcrição do `fix` se perdeu**, que era justamente o instrumento de que eu precisava.
Passa a ser só `fix-<run_id>`.

Consequência para o método: as **6 negações** do run `30513015702` (e as 17 do anterior)
continuam sem causa identificada, agora por um bug de nome de artefato em cima de um workflow
sem observabilidade. Segue valendo a regra do [D-024]: **nenhuma emenda de allow-list por
palpite** — a próxima só depois de ler a transcrição de fato.

**Correção que vale para os três guard-rails, achada pela revisão do PR #48.** O filtro de
"alguém publicou algo" era `.user.type == "Bot"`. Mas o `netlify[bot]` comenta em **todo** PR
deste repositório e **edita** o mesmo comentário fixo a cada deploy, o que satisfaz
`updated_at >= DESDE`. Ou seja, qualquer bot servia — e no `review.yml`/`security.yml` isso é
grave: um skip da action por *workflow validation* poderia sair **VERDE** por causa do
comentário do Netlify, que é precisamente o "verde sem revisão" que a ponte (c) do [D-014]
existe para impedir. Os três passam a filtrar por `claude[bot]` explicitamente. A revisão
classificou como MÉDIO no `fix.yml`; no `review`/`security` a consequência é maior, e o mesmo
padrão estava lá desde a implementação da ponte.

## D-026 | 2026-07-30 | ACEITA
**A causa raiz das cinco falhas seguidas do `fix.yml`: faltava `additional_permissions:
actions: read`.** Sem isso o `gh` do agente não tem escopo de Actions, e
`gh run view --log-failed` — o primeiro comando que o próprio prompt manda rodar — não funciona.

Isto foi **lido na transcrição**, não deduzido. O run `30514339714` (41 turnos, US$ 0,94, **zero
negações de ferramenta**) gastou **21 dos 41 turnos** tentando ler o log:

| Chamadas | Tentativa |
|---|---|
| 1, 4, 21 | `gh run view --log-failed`, inclusive com `--repo` explícito |
| 2, 3 | `gh auth status` |
| 6–9 | `gh api .../actions/runs/<id>`, `gh run list` |
| 13–17 | caçar `GITHUB_TOKEN` no ambiente, até `printenv GITHUB_TOKEN` |
| 18–20 | `ls ~/.config/gh/`, extrair o token da URL do remote, tentar `curl` na API |
| 22–34 | desistiu e rodou `lint`/`test`/`build`/`audit` — **todos passaram**, porque a falha estava no job `e2e`, que ele não pode rodar |

O `claude.yml` já tinha `additional_permissions: actions: read`, com o comentário "Ler
resultados de CI nos PRs". O `fix.yml`, **cuja razão de existir é ler CI vermelho**, nunca
recebeu — mesma classe de omissão da 4ª emenda do [D-012]: a configuração certa existia num
workflow e não foi propagada aos outros.

Junto vai uma instrução de parada: se o comando falhar, o agente deve **comentar no PR e parar**,
não contornar (procurar token no ambiente, chamar a API por `curl`, extrair credencial do
remote). Insistir custou 21 turnos, e a tentativa de contorno é comportamento que não se quer
num agente com token de escrita.

**Correção do registro anterior:** as `permission_denials_count` de 14, 17 e 6 que eu havia
tratado como causa **não eram a causa** — variavam por ruído e este run teve **zero**. As três
hipóteses que levantei antes de ter transcrição (allow-list estreita, `persist-credentials`,
nome do artefato) foram todas refutadas. O que resolveu foi instrumentar e ler, exatamente como
no [D-019]. Fica a regra: **em falha de agente, instrumentar antes de teorizar.**

## D-027 | 2026-07-30 | ACEITA
**Configuração versionada do deploy Netlify (issue #35, implementa [D-018]).** `svelte.config.js`
passa a usar `@sveltejs/adapter-netlify` (`publish` default do adapter é `build`, confirmado em
`node_modules/@sveltejs/adapter-netlify/index.js`) e `netlify.toml` na raiz espelha
`NODE_VERSION` de `.github/workflows/ci.yml`. `SECRETS_SCAN_OMIT_KEYS` lista só as 6 variáveis
`PUBLIC_FIREBASE_*` — públicas por design (SDK cliente), nunca chave de servidor. Não é Decision
Gate: nenhum gasto recorrente, preço ou dado pessoal envolvido; a criação do site na Netlify e o
cadastro de variáveis seguem passo manual do dono do projeto.

## D-028 | 2026-07-30 | ACEITA
**`FIREBASE_PROJECT_ID` e `FIREBASE_STORAGE_BUCKET` entram em `SECRETS_SCAN_OMIT_KEYS`;
`FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` continuam sob varredura (issue #51).** O primeiro deploy
real reprovou (exit code 2) com "Secret env var `FIREBASE_PROJECT_ID`'s value detected" em
`package.json:2`, `package-lock.json:2,8` e `REPO-STRUCTURE.md:24`.

Causa: o valor de `FIREBASE_PROJECT_ID` é `personal-gift-project` — o **nome do repositório**,
que por isso está no campo `name` do `package.json`/`package-lock.json` e na árvore do
`REPO-STRUCTURE.md`. Não houve vazamento: nenhuma credencial saiu do cofre. Project id e bucket
são **identificadores**, idênticos aos valores de `PUBLIC_FIREBASE_PROJECT_ID` e
`PUBLIC_FIREBASE_STORAGE_BUCKET`, que o SDK cliente já expõe e que o [D-027] havia omitido da
varredura. Quem protege os dados são `firestore.rules`/`storage.rules`, não o sigilo do id.
`FIREBASE_STORAGE_BUCKET` entra junto porque tem exatamente o mesmo valor da sua gêmea pública:
deixá-la fora só adiaria a mesma reprovação.

As duas alternativas que a Netlify oferece foram **rejeitadas** por enfraquecerem o baseline de
`.claude/rules/security.md`: `SECRETS_SCAN_OMIT_PATHS` cegaria a varredura nesses arquivos para
**todas** as chaves (inclusive a privada) e `SECRETS_SCAN_ENABLED=false` desligaria tudo.
`OMIT_KEYS` é a única opção que dispensa exatamente os dois identificadores e mantém a rede de
proteção onde ela importa: se um dia `FIREBASE_PRIVATE_KEY` ou `FIREBASE_CLIENT_EMAIL` aparecer
no output, o build reprova. A chave privada continua fora do bundle por construção
(`src/lib/server/firebase-admin.ts` + `$env/dynamic/private`, lido em runtime), e
`serviceAccount*.json` segue no `.gitignore`, nunca versionado (confirmado no histórico).

## D-029 | 2026-07-30 | ACEITA
**`overrides` fixa `jose@^5.10.0` sob o `jwks-rsa` para a função da Netlify voltar a subir.**
O site publicado não carregava: a função serverless morria no *load* com
`require() of ES Module /var/task/node_modules/jose/dist/webapi/index.js from
/var/task/node_modules/jwks-rsa/src/utils.js not supported`.

Causa: cadeia `firebase-admin@14.2.0 → jwks-rsa@4.1.0 → jose@6.2.4`. O `jwks-rsa` é CommonJS e
faz `require('jose')` (`src/utils.js:1`); o `jose@6` é ESM puro — seu `exports` não tem condição
`require`. O `firebase-admin` carrega o `jwks-rsa` no topo de `lib/utils/jwt.js`, então quebra ao
**importar** o Admin SDK, não numa rota — e `src/hooks.server.ts` importa essa cadeia em toda
requisição SSR. Reproduzido localmente: no Node 22.16 o require passa (`require(esm)` é padrão
desde 22.12), e com `node --no-experimental-require-module` sai a mensagem idêntica à do deploy.
Ou seja, o Lambda da Netlify roda um Node **sem** `require(esm)`, e o `@sveltejs/adapter-netlify`
emite `.mjs` sem bundlar (daí os caminhos crus em `/var/task/node_modules`). Não há correção
upstream: `jwks-rsa` latest é 4.1.0 (jose `^6.1.3`) e `firebase-admin` latest é 14.2.0.

`jose@5.10.0` — última da linha 5.x — publica build CommonJS
(`exports['.'].require → ./dist/node/cjs/index.js`), então o `require('jose')` do `jwks-rsa`
resolve em **qualquer** runtime, com ou sem bundler. O override é aninhado sob `jwks-rsa`
(único consumidor de `jose` na árvore) e trava no `package-lock.json`.

**Nada muda na verificação de token.** `verifyIdToken` continua no Admin SDK, com assinatura e
claims; `src/lib/server/auth.ts` não foi tocado. O `jwks-rsa` só é usado no caminho de JWKS
(`importJWK` + `exportSPKI`, presentes e com a mesma assinatura em jose 5) — a verificação de ID
token do Firebase usa o caminho x509 + `jsonwebtoken`. Conserto de empacotamento que **preserva**
a verificação não é Decision Gate (`docs/AUTONOMY.md` §2).

Alternativas **rejeitadas**: emitir a função como ESM não resolve — o `require` quebrado é interno
a um pacote CJS de terceiro, o formato do topo é irrelevante (provado no repro); `[functions]
node_bundler = "esbuild"` passaria `firebase-admin`, `google-auth-library` e
`@firebase/database-compat` inteiros por um bundler que tropeça em `require` dinâmico e protos —
blast radius enorme para um problema de uma dependência, e só testável no deploy;
`AWS_LAMBDA_JS_RUNTIME=nodejs22.x` a Netlify exige cadastrar no dashboard, **não** no
`netlify.toml` — ficaria fora do repo, invisível ao CI, e um `nodejs22.x` com minor < 22.12 ainda
quebraria. Guard de regressão no `ci.yml` (`node --no-experimental-require-module -e
"require('firebase-admin/auth')"`) reprova o CI se a cadeia voltar a exigir `require(esm)`.

**Nota de longo prazo:** o override é remendo de compatibilidade, não destino. Revisar — e
remover, voltando ao `jose` da própria cadeia — quando o `jwks-rsa`/`firebase-admin` passarem a
funcionar sob `require(esm)` (ou o `jose` voltar a publicar entrada CJS), ou quando a função da
Netlify passar a embutir o `jose` no bundle. Enquanto isso, o guard do `ci.yml` é o sinal.

## D-030 | 2026-07-30 | ACEITA (parcial — bloqueada na entrega dos arquivos de workflow)
**Agente `Verdict`, dedicado ao julgamento de `entrega:completa`, separado de quem escreveu o
código (issue #50).** Segue o desenho que a própria issue já havia decidido (a alternativa de
estender o `fix.yml` para julgar a própria entrega foi rejeitada nela por autoavaliação e por
destrancar `review`/`ai-security-review` do gate do [D-019] sem revisão independente — ver
"Por que NÃO estender o `fix.yml`" na issue).

`.claude/agents/verdict.md` está criado neste PR: read-only (`Read`, `Grep`, `Glob` + `Bash` só
para `gh issue view`, `gh pr view/diff/comment/edit` e `git diff/log/show`), sem `Edit`/`Write`,
sem `git push`, sem `gh pr merge`. Ele lê a issue pela palavra de fechamento (`Closes`/`Fixes`/
`Resolves` + `#N`, não `#N` solto — regra já fixada no [D-019] 3ª rodada) e os critérios de
aceite, lê o diff do PR, e decide: marca `entrega:completa` (tirando `[WIP]` do título) ou
comenta o que falta. Nunca os dois em silêncio.

**Bloqueio técnico, não Decision Gate.** O restante do desenho — `.github/workflows/verdict.yml`
(gatilho `workflow_run` da `CI` com `conclusion == 'success'`, que só age quando o PR da branch
segue `entrega:incompleta`) e a remoção de `gh pr edit` da allow-list do `fix.yml` (fecha o
achado MÉDIO do PR #48: hoje quem escreve o código também controla a label que libera as
revisões) — **não pôde ser empurrado nesta sessão**. `git push` foi recusado pelo GitHub com
`refusing to allow a GitHub App to create or update workflow .github/workflows/fix.yml without
'workflows' permission`: a credencial deste runner tem escopo para conteúdo/PR/issue, mas não
para `.github/workflows/*`. Não é uma falha de lógica nem Decision Gate (nada de preço, catálogo
ou dado pessoal) — é permissão de plataforma, do mesmo tipo que trava o enforcement do [D-014]
(GitHub Pro em repo privado).

Seguindo a instrução do próprio `fix.yml` para esse tipo de situação (não insistir, não tentar
contornar procurando token alternativo — só reportar), o conteúdo pronto de
`.github/workflows/verdict.yml` e o diff de `fix.yml` foram deixados como comentário no PR #55
para aplicação manual (ou por uma execução com credencial com escopo `workflows`). **Custo do
gatilho novo:** não medido ainda — só é observável depois que o workflow rodar de verdade em CI
verde real, o que exige o push manual primeiro. Registrar quando o primeiro disparo acontecer.

PR permanece `entrega:incompleta` até os dois arquivos de workflow serem aplicados; os itens
"`gh pr edit` removido do `fix.yml`" e "custo medido" do Definition of Done da issue #50
continuam em aberto.

**Continuação (2026-07-30, mesma sessão) — bloqueio resolvido.** O texto acima fica como
registro do que era verdade quando foi escrito; o estado atual é este:

- O dono do repositório (`Marcelo-Has`) aplicou os dois arquivos de workflow **manualmente**,
  no commit `1406043`, com credencial pessoal — que tem o escopo `workflows` que falta ao
  GitHub App do runner. Conteúdo idêntico ao publicado no comentário do PR #55, sem alteração.
  Com isso o item "`gh pr edit` removido do `fix.yml`" do DoD da issue #50 está **fechado**.
- O `[WIP]` do título e o swap `entrega:incompleta` → `entrega:completa` também foram
  **manuais** (dono, 18:39Z), não obra do Verdict — ver o item seguinte.
- **`verdict.yml` ainda NÃO rodou nenhuma vez, e não vai rodar neste PR.** Workflow disparado
  por `workflow_run` só existe a partir da branch default: a API responde `workflow verdict.yml
  not found on the default branch` enquanto ele não estiver na `main`. Logo o gatilho passa a
  valer **do próximo PR em diante**, e o item **"custo medido" do DoD segue legitimamente em
  aberto** — registrar quando o primeiro disparo real acontecer. (A revisão automática do PR #55
  inferiu que "o pipeline já rodou de ponta a ponta" a partir do título/label já trocados; a
  inferência está errada pelo motivo acima, e fica anotada aqui para não se propagar.)
- Achados da revisão tratados no próprio PR #55: restaurar `.claude/`/`CLAUDE.md` da branch base
  antes de julgar (senão o PR sob julgamento reescreve as instruções do juiz) e remoção de
  `actions: write` do `verdict.yml`. O gate de origem do `workflow_run` (`head_repository`)
  ficou **adiado** por `.claude/rules/right-sizing.md` — repo privado de dono único não tem fork
  de terceiro — com o gate pronto em comentário no `verdict.yml` e no `fix.yml`, para o dia em
  que o repositório virar público ou entrar um colaborador.

**2ª rodada de revisão (2026-07-30) — dois MÉDIOS a mais, ambos corrigidos.** A re-revisão
confirmou os achados anteriores como tratados e encontrou dois que a primeira não pegou:

- **`Bash(find:*)` não é utilitário de leitura.** Estava na allow-list do `verdict.yml`, e
  `find . -exec sh -c '<qualquer coisa>' \;` executa comando arbitrário (`find . -delete` apaga
  arquivo) — derruba de uma vez as três garantias que definem o papel do Verdict. Agravante: o
  bloco de auditoria do `verdict.md` afirmava que era leitura. **Removido** do workflow e a
  afirmação corrigida no agente; `Glob` já cobre busca de arquivo. (`Bash(find:*)` também está
  em `review.yml`/`security.yml`; limpar lá é issue separada, e o `fix.yml` é inócuo porque
  aquele agente tem `Edit`/`Write`/push por desenho.)
- **O restore de config era parcial, e o resíduo é execução de comando.** `git checkout <tree>
  -- <path>` só sobrescreve caminho que existe na base, então arquivo **novo** na branch
  sobrevivia. `.claude/settings.local.json` está no `.gitignore` — nunca existe na base, logo é
  sempre "novo" — e carrega `hooks.PreToolUse` com `type: command`, como o `settings.json`
  versionado deste repo demonstra. Uma branch com `git add -f` nele executaria comando no runner
  privilegiado, que tem as credenciais da Anthropic e `pull-requests: write`. **Corrigido** com
  `rm -rf .claude CLAUDE.md` antes do checkout, fechando o limite inteiro. O prompt do Verdict
  ganhou o aviso de que esses caminhos se conferem por `gh pr diff`/`git show HEAD:<caminho>`,
  que leem a branch sem carregá-la como config.

Três achados BAIXOS ficaram **ADIAR** por `right-sizing.md`, todos anotados em comentário no
código em vez de virar issue: `or .updated_at` no guard-rail de saída (aceita comentário antigo
editado), curinga `Bash(gh pr edit:*)` (autoriza também `--base`/`--body`), e `actions: write`
no `fix.yml`. Este último foi **deliberadamente não removido**, contra a recomendação da revisão:
o [D-026] registra cinco falhas seguidas daquele workflow por escopo de Actions faltando, e
`gh run view --log-failed` é a razão de existir dele — trocar um achado BAIXO por risco de
re-quebrar a leitura de CI é mau negócio. Ao mexer um dia, o passo seguro é `actions: read`.

**3ª rodada (2026-07-30) — três MÉDIOS, todos corrigidos; encerrada a iteração.** A revisão
continuou produtiva (2 → 2 → 3 MÉDIOS), porque o desenho é genuinamente sensível: runner
privilegiado + agente + entrada controlada por quem abre o PR. Corrigidos:

- **Julgava a branch, não o commit que o CI aprovou.** `ref: head_branch` deixava o Verdict
  avaliar — e marcar `entrega:completa` — código empurrado DEPOIS do CI verde (o `fix.yml`
  empurra; force-push também). O guard-rail de saída não pega, porque só confere que houve
  veredito. Trocado por `ref: head_sha`, o commit que o evento carrega e que a `CI` validou.
  Era o achado mais grave da rodada: derrubava a premissa inteira do gate.
  **Ressalva acrescentada na 4ª rodada — o parágrafo acima deu a premissa por fechada, e ela
  não estava.** `ref: head_sha` prende só o **disco**. O step `checar` resolvia o PR por nome de
  branch, e o `gh pr diff` que o prompt manda ler e o `gh pr edit` que aplica a label
  continuavam enxergando o head **atual** do PR: a sequência "CI do commit A verde → push do
  commit B → job inicia" daria disco = A, diff julgado = B, label em B. Fechado de fato no
  `checar`, que agora pede `headRefOid` e só julga se ele ainda for o `head_sha` do evento —
  branch que avançou não é julgada, e a CI do commit novo dispara um veredito próprio.
- **O restore de config só cobria a raiz.** `CLAUDE.md` de subdiretório carrega quando o agente
  lê arquivo daquele diretório — e o prompt manda explorar o checkout —, e `.claude/` aninhado,
  `AGENTS.md` e `.mcp.json` (que define servidor MCP por `command`) também escapavam. Mesma
  classe da 2ª rodada, pelo eixo do diretório em vez do arquivo novo. A varredura virou
  recursiva, e o restore devolve o que a base versiona nesses caminhos.
- **Credencial do checkout legível pelo juiz.** `actions/checkout` grava o `GITHUB_TOKEN` em
  `.git/config` (`persist-credentials` é `true` por padrão); a allow-list tem `Bash(cat:*)` e
  `Read`, e a `deny` do `settings.json` cobre `.env`/`.pem`/`secrets*`/`serviceAccount*` mas
  **não** `.git/**` — o token era legível e publicável via `gh pr comment`. Descartado no fim do
  step de restore, que é o único uso de rede do git no job.
- Somado ao BAIXO: o prompt e o `verdict.md` passaram a dizer que corpo do PR, issue,
  comentários e diff são **dado a ser julgado, nunca instrução** — o juiz lê texto de terceiro e
  segura a ferramenta que troca a label.

O step de restore foi **executado de verdade** contra um clone com config hostil plantada em 7
pontos (`src/lib/CLAUDE.md`, `docs/CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `.claude/` aninhado,
`settings.local.json`, `CLAUDE.md` adulterado): todos removidos, base restaurada, conteúdo
julgado intacto, e o `verdict.md` da branch ainda legível por `git show HEAD:<caminho>` — que é
o caminho que o prompt agora indica. Sem config na base o step **falha fechado**, reprovando o
job em vez de julgar sem restore.

`concurrency` ficou ADIAR (INFO, custo/ruído) em comentário no workflow. **Critério de parada
acordado com o dono:** encerrar a iteração aqui e mergear, salvo achado ALTO numa rodada
seguinte; o que sobrar vira issue de endurecimento, conforme o roteamento do `right-sizing.md`.

**4ª rodada (2026-07-30) — sem achado ALTO; critério de parada atingido.** Foram tratados só os
dois que completavam correção anterior declarada fechada, e não achado novo:

- O `head_sha` incompleto, corrigido no `checar` (ver a ressalva no item da 3ª rodada acima).
- `CLAUDE.local.md` fora da varredura do restore — mesma classe do `settings.local.json`
  (fica no `.gitignore`, logo nunca existe na base, logo é sempre "arquivo novo"). Somado ao
  `find`.

Os dois achados **novos** foram roteados para issue de endurecimento em vez de inflar este PR:
`Bash(cat:*)` + `gh pr comment --body-file` como caminho de exfiltração do ambiente do runner
(a `deny` do `settings.json` só vale para o tool `Read`, e o hook `PreToolUse` não vê segredo
que não passa pela string do comando), e o nome da branch interpolado dentro do `prompt:`. O
primeiro exige mexer no `.claude/settings.json` e no hook, fora dos arquivos deste PR.

## D-031 | 2026-07-30 | ACEITA
**Issue #56 (FU-08): ESTREITA a classe do vazamento que o [D-030] havia fechado só no caso
específico** (a credencial do `actions/checkout` no `.git/config`, tratada com `git config
--unset-all` no próprio `verdict.yml`). A issue foi escrita com a ambição de "fechar a classe";
a revisão do PR #57 mostrou que **isso não foi alcançado por completo**, e o registro fica
honesto quanto a isso — ver "limite reconhecido" no fim. Frentes:

1. **`Bash(cat:*)` contornava a `deny` do `.claude/settings.json` por inteiro.** A `deny`
   (`Read(./.env)`, `Read(**/*.pem)`, `Read(**/secrets*)`, `Read(**/serviceAccount*.json)`) só
   vale para o tool `Read` — `Bash(cat:*)` é outro caminho para o mesmo byte, e não tem `deny`
   nenhuma. **Removido** de `.github/workflows/verdict.yml` e `.github/workflows/fix.yml`: nos
   dois, `Read`/`Glob`/`Grep` já cobrem leitura, então `cat` era redundante e mais largo.
   A 3ª rodada de revisão do PR #57 apontou, com razão, que o argumento vale igual para
   `grep`/`head`/`tail`/`wc` — nenhum deles é o tool `Read`, então nenhum é coberto pela `deny`,
   e `grep -m1 . .git/config` lê exatamente o que `Read(./.git/**)` passou a negar. Tirar só o
   `cat` deixaria a `deny` contornável do mesmo jeito. **Os quatro saíram também**, do
   `verdict.yml`. No `fix.yml` não adianta podar utilitário de leitura (ver limite reconhecido
   abaixo): lá sobram `Bash(node:*)`/`Bash(npx:*)`, que são execução arbitrária, e o ganho real
   vem do restore de config de agente e do `unset-all` — foi para issue própria. Ficou
   de fora `review.yml`/`security.yml` — mesmo achado, mesma correção, mas aqueles dois caem no
   impasse do [D-014] (branch protection não aplicável em repo privado no plano Free; PR que os
   altera exige merge manual à parte) e viram issue de endurecimento separada em vez de inflar
   esta.
2. **`gh pr comment --body-file`/`gh issue comment --body-file`/`gh pr edit --body-file`
   publicam arquivo sem o conteúdo passar pela string do comando** — o hook `PreToolUse` casa
   prefixo de chave (`sk-ant-`, `AKIA…`) no comando em si, e com `--body-file /proc/self/environ`
   o segredo nunca aparece nessa string. Somado à `deny`: `Read(./.git/**)` e `Read(/proc/**)`
   (fecha a leitura por `Read`, complementando o `unset-all` do D-030, que fecha só a escrita do
   token). Hook `PreToolUse` ganhou uma segunda regra: bloqueia qualquer comando `Bash` que some
   `gh` e a flag de corpo-por-arquivo na mesma string, cobrindo `pr comment`, `issue comment` e
   `pr edit` de uma vez (o padrão é pelo par de termos, não por subcomando, então não depende de
   listar cada verbo do `gh` que aceita a flag). A revisão do PR #57 mostrou que a primeira
   versão do padrão só pegava a forma longa: `gh` aceita **`-F`** como alias oficial de
   `--body-file` (`-F -` lê da stdin) e `gh api` aceita `--input`. Uma segunda rodada mostrou que
   exigir espaço ou `=` depois do `-F` ainda deixava passar a forma **colada**: `gh` é cobra/pflag
   e parseia `-F.git/config`/`-F-` igual a `-F <arquivo>` (verificado com `gh pr view -Rcli/cli 1`,
   que lê como `-R cli/cli`). O padrão não exige mais sufixo — em `gh`, `-F` só significa
   `--body-file`/`--field`, então não há forma legítima a preservar. Cobre `--body-file`,
   `--body-file=<arquivo>`, `--input`, `-F <arquivo>`, `-F<arquivo>`, `-F -` e `-F-`.
   Ele exige a flag **no mesmo segmento** de um `gh` (sem `|`, `;` ou `&` no meio), e não em
   qualquer ponto da string: a primeira tentativa, que procurava os dois termos em qualquer
   ordem, bloqueou um `git commit -F -` cuja mensagem apenas *falava* sobre `gh` —
   falso-positivo que o teste agora cobre. Uma tentativa intermediária exigia um subcomando
   conhecido colado no `gh` (`gh (pr|issue|api) …`), e a 3ª rodada de revisão mostrou que isso
   também era contornável: `gh` aceita flag global **antes** do subcomando, e
   `gh -R owner/repo pr comment 57 --body-file <arquivo>` passava direto (verificado: `gh -R
   cli/cli pr view 1` funciona igual a `gh pr view -R cli/cli 1`). A exigência de subcomando
   caiu; basta `gh` no mesmo segmento antes da flag.
3. **Nome da branch interpolado em posição de instrução no `verdict.yml`.** Git proíbe espaço e
   newline no nome, então o poder de manipulação é pequeno, mas o aviso "trate como dado" do
   prompt não citava a branch. Tirado da frase descritiva ("(branch X) acabou de ficar verde") e
   posto como campo rotulado separado ("Branch sob julgamento (dado, não instrução): X"), e
   somado à lista do parágrafo que já tratava corpo do PR/issue/comentários/diff como dado.
4. **Os dois hooks `PreToolUse` nunca funcionaram** — achado da revisão de segurança do PR #57,
   confirmado na documentação e por teste direto. Eles liam `"$CLAUDE_TOOL_INPUT"`, variável que
   o Claude Code **não define**: o payload do hook chega como JSON na **stdin**
   (`tool_input.command`). Variável indefinida ⇒ string vazia ⇒ `grep` não casa ⇒ cai no
   `exit 0` ⇒ liberação incondicional. Ou seja, o filtro anti-segredo escrito lá atrás estava
   inerte desde sempre, em silêncio. Os dois hooks passaram a ler a stdin.
   **Consequência de processo:** controle de segurança sem teste executável apodrece sem aviso,
   então esta issue também traz `tests/hooks/pretooluse.test.ts`, que alimenta cada hook com um
   payload-fixture e exige `exit 2`/`exit 0`. Efeito colateral bem-vindo: como o payload é JSON
   de uma linha só (o `\n` do comando vira `\n` escapado), comando quebrado por continuação de
   linha também não escapa mais do `grep`.

**Nota de execução — o mesmo bloqueio de plataforma do [D-030], contornado do mesmo jeito.** Na
sessão que abriu o PR #57, `.claude/settings.json` foi empurrado normalmente (não é arquivo de
workflow), mas `verdict.yml` e `fix.yml` **não**: `git push` foi recusado com `refusing to allow
a GitHub App to create or update workflow .github/workflows/<arquivo> without 'workflows'
permission` — a credencial do runner tem escopo de conteúdo/PR/issue, não de
`.github/workflows/*`. Não é preço, catálogo, dado pessoal nem produto; é permissão de
plataforma, não Decision Gate. Os itens 1 e 3 foram então aplicados numa sessão local com a
credencial pessoal do dono do repositório, exatamente como o commit `1406043` do D-030. **Fica
o padrão:** mudança de workflow proposta por agente da fábrica precisa de uma passada local para
ir ao remoto.

`review.yml`/`security.yml` ficam fora do escopo desta issue por [D-014] (branch protection não
se aplica a repo privado no plano Free; PR que os altera exige merge manual à parte) — vão para
a issue de endurecimento do canal de publicação, junto com o limite reconhecido abaixo.

**Limite reconhecido — isto mitiga, não fecha a classe.** Denylist por regex sobre shell livre
barra uma *sintaxe*, não o *canal*: `gh pr comment --body "$(cat segredo)"` publica o mesmo byte
sem casar com nenhum padrão. O que fecha de verdade é tirar `Bash(gh pr comment:*)` do agente e
publicar o veredito num step separado, não-IA, a partir de saída estruturada — mesmo desenho do
guard-rail que `review.yml`/`security.yml` já usam. Isso é redesenho do canal de publicação dos
oito workflows de agente, cai no [D-014] e virou issue própria. Até lá, o hook vale como defesa
em profundidade, e `Read(./.git/**)`/`Read(/proc/**)` valem só para o tool `Read` — quem tem
`Bash(cat:*)`/`Bash(grep:*)` na allow-list continua alcançando os mesmos bytes.

**E no `fix.yml`, tirar o `cat` é quase cosmético** (2ª rodada de revisão do PR #57): sobram
`head`/`tail`/`grep`/`sed` e, sobretudo, `Bash(node:*)`/`Bash(npx:*)`, que são execução
arbitrária — `node -e` lê qualquer byte do runner. Some-se a isso que o `fix.yml` **não** tem o
`git config --unset-all …extraheader` que o `verdict.yml` ganhou no [D-030], **nem** o step que
restaura a config de agente da branch base — e ele roda com `contents: write`. Ou seja, a branch
sob correção controla o `CLAUDE.md`/`.claude/settings.json` do agente que roda sobre ela, e
`hooks.PreToolUse` do tipo `command` é execução arbitrária num runner privilegiado. Superfície
atual, não hipotética: virou issue `status:ready` (não backlog da Fase 5), conforme o item 1 do
filtro de `.claude/rules/right-sizing.md`.

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
