# Personal Gift Project — instruções da fábrica

> Este arquivo fica na **raiz do repositório** e é lido em **toda** sessão do Claude
> Code / da GitHub Action. Mantê-lo enxuto (< ~200 linhas) é best practice: ele é o
> índice/entrypoint. As especificações longas ficam em `docs/` e são lidas sob demanda.
> Onde salvar cada coisa: ver `REPO-STRUCTURE.md` (na raiz).

## Contexto
Plataforma de presentes personalizados construída de forma majoritariamente autônoma
por IA. Primeiro produto: mini livro "Nossa História" (casal), com **múltiplos estilos
e múltiplos tamanhos**.

## Antes de agir, leia (sob demanda, não tudo sempre)
- Produto: `docs/PRODUCT.md`
- Arquitetura: `docs/ARCHITECTURE.md`
- Autonomia / Decision Gates: `docs/AUTONOMY.md`
- Roadmap: `docs/ROADMAP.md`
- Decisões: `docs/DECISIONS.md`

## Regras invioláveis (respaldadas em `.claude/settings.json`)
1. **Siga `docs/AUTONOMY.md`.** Se a tarefa cair num Decision Gate, NÃO adivinhe: crie
   issue `decision-needed` (Opções + Recomendação + o que bloqueia) e siga outra tarefa.
2. Nunca faça merge com CI vermelho (inclui scan de segurança e testes de estilo).
3. Nunca commite segredos; nunca exponha dados de usuário (sem storage público, sem PII
   em logs, URLs de foto sempre assinadas e expiráveis).
4. Não **altere nem remova** entrada existente de PRODUCT / AUTONOMY / DECISIONS sem Decision
   Gate aprovado (pode propor). **Acrescentar uma entrada NOVA em `docs/DECISIONS.md`**
   registrando a decisão da própria tarefa não é alteração — é exigido por `docs/AUTONOMY.md`
   §3 ("toda decisão relevante vira entrada em DECISIONS.md"). Ver D-019.
5. Todo trabalho vira uma issue e um PR pequeno e revisável. Se a issue tem código `Fx-yy`,
   o **mesmo PR** marca a linha dela em `docs/ROADMAP.md` (D-045). `FU-xx` não entra no ROADMAP.

## Papéis — mesmo Claude, contextos diferentes → `.claude/agents/`
- **Supervisor:** lê specs/issues, escolhe tarefas, cria issues, registra decisões.
- **Developer:** implementa uma issue por branch, escreve testes, abre PR.
- **Reviewer:** revisão independente + segurança (baseline em `docs/ARCHITECTURE.md`).

## Geração de conteúdo = skills versionadas do produto → `src/lib/product-skills/`
Narrativa, estilização de fotos e elementos de layout SÓ são gerados via skills do
`registry.json`, com golden samples e testes de estilo no CI. Melhorar um estilo = nova
versão, sem quebrar os outros nem pedidos antigos. (São assets de runtime do app — não
confundir com `.claude/skills/`, que é para helpers de desenvolvimento.)

## Regras temáticas (carregam por contexto) → `.claude/rules/`
Segurança, pagamentos, consistência de estilo e testes ficam em rules com `paths:`,
carregando só quando um arquivo relacionado é tocado.

- Right-sizing / anti-over-engineering → `.claude/rules/right-sizing.md`: qualidade sem excesso; LOW/INFO e riscos hipotéticos se adiam, não viram status:ready.

## Padrões de engenharia
SvelteKit + Firebase + Stripe + Claude API. Todo código novo vem com testes; E2E com
Playwright. Rode e passe `lint`, `test`, `build` (e os scans) antes de abrir/mergear PR.
Commits e PRs em português, referenciando a issue. Sonnet padrão; Opus só em tarefa difícil.
Geração pesada em fila+worker; cache/prompt caching; cada etapa registra custo real por pedido.
