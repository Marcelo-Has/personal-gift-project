# C2 — Página `/como-funciona`

**Dimensão medida:** frontend e **design**. É o único cenário com nota de composição visual, e o
mais caro de avaliar (precisa de deploy preview, axe, Lighthouse e screenshots). Mede se a fábrica
produz interface que parece feita por alguém com gosto, ou o template genérico de IA — hero
centralizado, três cards iguais, gradiente roxo.

**Título da issue:** `[BENCH-C2] Página /como-funciona` — criada como **#164**, sem label.

---

## Corpo da issue (copiar a partir daqui)

## Contexto / Por quê

A landing (`/`) tem hoje uma seção curta "Como funciona" com três passos em texto corrido, dentro
da própria home. Não existe **página dedicada** explicando o processo para quem chega em dúvida
sobre o que é o produto e o que vai acontecer depois que pagar.

Ler antes: `docs/PRODUCT.md` §2 (a promessa do produto, o fluxo do questionário e os dados
coletados na compra) e `src/lib/home-content.ts` (o texto da home já foi extraído fielmente do
PRODUCT.md — o tom da página nova tem que conversar com ele).

## Objetivo

Uma página `/como-funciona`, responsiva e acessível, que explica o processo em quatro passos e
leva o visitante ao início do fluxo.

## Escopo

- Rota nova `src/routes/como-funciona/+page.svelte`.
- **Hero curto:** título + subtítulo alinhados à promessa do `PRODUCT.md` §2 ("Um pequeno livro
  sobre tudo aquilo que fez vocês virarem vocês"). Sem inventar posicionamento, nome comercial ou
  tom novo — isso é Decision Gate ("Identidade visual e narrativa", `docs/AUTONOMY.md` §2).
- **Seção com os 4 passos:** responder o questionário → escolher estilo e tamanho → pagar →
  receber o livro impresso. Conteúdo real e específico em cada passo (o que a pessoa faz, o que
  acontece depois). **Sem lorem ipsum e sem placeholder.** Hierarquia visual clara entre os
  passos e o resto da página.
- **CTA "Criar o nosso livro"** apontando para `/questionario` (o início do fluxo hoje).
- **Responsivo:** legível e bem composto em mobile, tablet e desktop.
- **Acessível:** hierarquia de headings correta (um `h1`, `h2`/`h3` sem pular nível), contraste
  suficiente, foco visível, navegação por teclado funcionando.
- **Link para a página na navegação existente da landing** (`src/routes/+page.svelte`), sem
  reescrever a home.

**Tamanho estimado:** P/M — uma página estática mais o link na home; o custo está no cuidado
visual, não no volume de código.

## Fora de escopo

- Copy final de marketing (rascunho de qualidade é suficiente).
- Imagens/ilustrações finais do produto.
- Qualquer preço ou valor em reais — é Decision Gate [D-101], PENDENTE. O passo "pagar" descreve
  o momento, não o valor.
- Redesenho da home ou de qualquer outra tela.

## Critérios de aceite

- [ ] `/como-funciona` renderiza com hero, os 4 passos e o CTA.
- [ ] O CTA leva para `/questionario` e a navegação funciona.
- [ ] Nenhum texto placeholder ("lorem ipsum", "TODO", "em breve") na página.
- [ ] O conteúdo é coerente com `docs/PRODUCT.md` §2 — nada de promessa que o produto não faz.
- [ ] Acessibilidade básica verificável: um único `h1`, headings em ordem, foco visível, a página
      inteira navegável por teclado.
- [ ] Layout íntegro em mobile, tablet e desktop.
- [ ] E2E (Playwright): a página abre e o CTA navega para `/questionario`.
- [ ] `lint`, `test` e `build` verdes no CI.

## Requisitos técnicos / decisões

- `CLAUDE.md` e `.claude/rules/right-sizing.md`: defaults do Svelte/SvelteKit, sem framework de
  CSS novo e sem componentizar o que só tem um uso.
- **Nenhuma dependência nova** sem justificativa explícita no PR.
- Se usar imagem, otimizada e com `alt` significativo.
- Texto em português do Brasil.

## Arquivos prováveis

- `src/routes/como-funciona/+page.svelte` (novo)
- `src/lib/components/` (só se um componente tiver segundo uso real)
- `src/routes/+page.svelte` (link para a página nova)
- `e2e/como-funciona.spec.ts` (novo)

## Testes exigidos

E2E (Playwright) do fluxo: abre `/como-funciona`, confere os 4 passos, clica no CTA e chega em
`/questionario`. Unitário se alguma lógica pura for extraída.

## Dependências

Nenhuma.

## Definition of Done

- [ ] Critérios de aceite todos marcados
- [ ] Testes novos passando; `lint`, `test` e `build` verdes no CI
- [ ] Revisão (`review`) e revisão de segurança (`ai-security-review`) sem pendência bloqueante
- [ ] Sem segredos commitados e sem PII em logs
- [ ] PR pequeno, em português, referenciando a issue com `Closes #<n>`

---

## Comportamento esperado (não vai na issue)

Entrega direta. É o cenário caro: a nota de **Frontend/design** (peso 3, ver `rubricas.md`) só vale
para C2, e o pré-requisito para nota ≥ 3 é objetivo — axe-core sem violação séria, layout íntegro
em 375/768/1280 e Lighthouse a11y ≥ 90. Sem essas três evidências coletadas, a nota de design é no
máximo 2, independentemente de o PR estar bonito na leitura do diff.

Sinais a observar:

- Passou de "quatro cards idênticos empilhados" para uma composição com ritmo próprio?
- Spacing e tipografia são consistentes com a home, ou a página parece de outro produto?
- Estados de hover e foco existem e são desenhados, ou são só o default do navegador?
- Inventou preço, prazo de entrega ou promessa que o `PRODUCT.md` não faz?

## Nota do harness — desvio do enunciado original

O enunciado da missão mandava o CTA apontar para `/criar`. Essa rota **não existe** no app: o
início do fluxo é `/questionario` (é para lá que aponta o CTA da home, em
`src/lib/home-content.ts`). O texto acima usa `/questionario` para que o critério "o CTA navega"
seja verificável — com `/criar` o E2E falharia por um erro do enunciado, não da fábrica, e C2
mediria a coisa errada. O rótulo do botão ("Criar o nosso livro") foi mantido.
