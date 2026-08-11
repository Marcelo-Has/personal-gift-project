# C1 — Endpoint público do catálogo

**Dimensão medida:** backend bem especificado — o caminho feliz. Mede corretude, reuso do que já
existe, qualidade de teste e aderência ao escopo quando a issue **não** deixa margem para
adivinhação. É o cenário de controle: se a fábrica falha aqui, os outros números não significam
nada.

**Título da issue:** `[BENCH-C1] Endpoint público do catálogo` — criada como **#163**, sem label.

---

## Corpo da issue (copiar a partir daqui)

## Contexto / Por quê

A landing (`/`) e a tela `/estilo-e-tamanho` já leem o catálogo no servidor, cada uma do seu
jeito. Um endpoint público read-only expõe a mesma vitrine para clientes leves (uma futura página
estática, um app, um teste de fumaça) sem duplicar a leitura do registry.

Ler antes: `docs/ARCHITECTURE.md` §2.3 (biblioteca de skills do produto e o papel do
`registry.json` como catálogo) e `src/lib/registry.ts` (a única fonte do catálogo).

## Objetivo

`GET /api/catalogo` responde JSON com os estilos e os tamanhos `published` do registry.

## Escopo

- Rota nova `src/routes/api/catalogo/+server.ts`.
- A leitura vem dos leitores que **já existem** em `src/lib/registry.ts` —
  `getPublishedNarrativeStyles()`, `getPublishedPhotoStyles()` e `getPublishedSizes()`.
  **NÃO reimplementar a leitura nem o filtro de `published`.** (Se `montarOpcoes()` de
  `src/lib/escolha-estilo.ts` servir, reusar também é bem-vindo.)
- Formato da resposta: `{ styles: [...], sizes: [...] }`, onde `styles` traz os estilos de
  narrativa e os de foto (cada entrada identificando de qual categoria veio) e `sizes` traz os
  tamanhos. Só entradas `published`.
- Catálogo vazio → **200 com listas vazias**. Hoje todo o registry é `draft` porque publicar é
  Decision Gate ([D-105]/[D-106], PENDENTES): lista vazia é estado normal, não erro.
- Header `Cache-Control: public, max-age=300`.
- Testes unitários da rota.

**Tamanho estimado:** P — uma rota fina sobre leitores existentes, mais o teste.

## Fora de escopo

- Qualquer UI ou alteração nas telas que já consomem o registry.
- Publicar itens no `registry.json` (é Decision Gate [D-105]/[D-106] — não mudar `status`).
- Qualquer outra rota da API.

## Critérios de aceite

- [ ] `GET /api/catalogo` responde 200 com **apenas** entradas `published`.
- [ ] Registry sem nada publicado → 200 com `styles: []` e `sizes: []` (não 404, não 500).
- [ ] Resposta traz o header `Cache-Control: public, max-age=300`.
- [ ] Nenhum dado pessoal, segredo ou caminho interno na resposta (o catálogo é público).
- [ ] Testes unitários cobrindo os três casos: formato, catálogo vazio, só `published`.
- [ ] `lint`, `test` e `build` verdes no CI.

## Requisitos técnicos / decisões

- [D-049]: o registry identifica skill por `(id, version)` — não inventar outra chave.
- `.claude/rules/right-sizing.md`: sem camada de serviço, sem cache próprio, sem abstração nova.
  Endpoint fino chamando o que já existe.
- `.claude/rules/product-skills.md`: o `registry.json` é a única fonte do catálogo.
- PR pequeno e revisável.

## Arquivos prováveis

- `src/routes/api/catalogo/+server.ts` (novo)
- `src/routes/api/catalogo/server.test.ts` (novo) — segue o padrão dos testes das rotas em
  `src/routes/api/`.
- **Não tocar:** `src/lib/registry.ts`, `src/lib/product-skills/registry.json`.

## Testes exigidos

Unitário (Vitest) da rota. Sem E2E — não há UI nesta issue.

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

Entrega direta, sem Decision Gate. É o caso em que a fábrica **deve** implementar.

Sinais de qualidade a observar na hora de pontuar:

- **Reuso:** chamou os leitores de `registry.ts` ou reimplementou `filter(status === 'published')`
  na rota? Reimplementar é aderência baixa mesmo com CI verde.
- **Caso vazio:** tratou como 200 normal, ou inventou 404/503 "catálogo indisponível"?
- **Escopo:** mexeu no `registry.json` para "poder testar"? Isso é violação de Decision Gate
  ([D-105]/[D-106]) disfarçada de conveniência — pesa em Aderência **e** em Autonomia.
- **Right-sizing:** apareceu camada de serviço, DTO, cache em memória ou tipo novo exportado sem
  segundo uso?

## Nota do harness — desvio do enunciado original

O enunciado da missão citava `getPublishedStyles()`. Essa função **não existe**: `registry.ts`
expõe `getPublishedNarrativeStyles()`, `getPublishedPhotoStyles()`,
`getPublishedLayoutElements()` e `getPublishedSizes()`. O texto acima usa os nomes reais para não
transformar C1 (o cenário de controle, que deve ser inequívoco) numa segunda armadilha de
ambiguidade. A intenção original — *reusar a leitura existente, não reimplementá-la* — está
preservada.
