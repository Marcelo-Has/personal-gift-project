# Elemento de layout: Carta — v1.0.0

> Skill de runtime versionada. Define como o texto de `finalLetter` é composto na(s)
> página(s) de carta final do livro.

## Contrato
- **Entrada:** o texto de `finalLetter` (saída de `narrative-style/romantico`, string de
  1 a 3000 caracteres — `narrativeBlocksSchema.finalLetter` em
  `narrative-style/romantico/generate.ts`), já gerado. Esta skill nunca recebe o
  questionário bruto nem gera texto — só posiciona o que o narrative-style já produziu.
- **Saída:** composição posicionada de uma ou mais páginas de carta (`CartaComposition`),
  cada uma com o trecho de texto que cabe nela e a área do bloco de texto dentro da área
  segura do SKU (fora de sangria/margem).

## Regras de estilo
- Bloco de texto único por página, com respiro (`PAGE_PADDING_MM`) entre a área segura da
  página e onde o texto começa — carta não deve encostar na borda da margem de segurança.
- Texto nunca invade a área de sangria nem a margem de segurança.
- Quebra apenas em limites de palavra — nunca corta uma palavra no meio (mesma decisão de
  `polaroid-com-texto` para a legenda).
- Espaços/quebras de linha em sequência no texto de entrada são normalizados para um único
  espaço; a formatação de parágrafo do texto original não é preservada nesta v1 — a
  tipografia/rasterização real fica para a geração de imagem/PDF (fora de escopo aqui:
  golden sample é estrutura posicionada, não bitmap renderizado).

## Comportamento quando o texto não cabe em uma página
Diferente da legenda de `polaroid-com-texto` (que rejeita texto longo em vez de cortar),
a carta final é um elemento central do livro e `finalLetter` pode legitimamente chegar a
3000 caracteres (o teto do próprio contrato de `narrative-style`) — rejeitar todo texto
que não caiba numa única página tornaria inviável boa parte das cartas válidas.

- **Paginação, até `MAX_PAGES` páginas.** Quando o texto não cabe na capacidade estimada
  de uma página, a composição continua nas páginas seguintes (até `MAX_PAGES`), sempre
  quebrando em limite de palavra.
- **`MAX_PAGES = 2`.** O livro tem orçamento de página fixo por SKU (32 páginas / 16
  spreads — `docs/PRODUCT.md` §5) compartilhado entre vários elementos narrativos
  (abertura, capítulos, polaroids, timeline, carta, dedicatória); a carta não pode
  consumir um número ilimitado de páginas desse orçamento. Duas páginas (um spread) cobre
  a grande maioria dos textos de até 3000 caracteres nos SKUs do catálogo e ainda mantém a
  carta como um elemento limitado do livro, não o livro inteiro.
- **Rejeição além de `MAX_PAGES`.** Se mesmo `MAX_PAGES` páginas não bastarem para o texto
  no SKU informado (SKU pequeno + carta próxima do limite de 3000 caracteres), a
  composição é **rejeitada** com `CartaValidationError` descritivo — análoga à rejeição de
  legenda longa em `polaroid-com-texto` — em vez de espremer texto ilegível ou estourar o
  orçamento de páginas do livro.

## Parâmetros (v1.0.0, `compose.ts`)
- **Comprimento máximo do texto:** 3000 caracteres (`MAX_LETTER_LENGTH`), espelhando o
  `.max()` de `finalLetter`. Texto vazio ou acima do limite é rejeitado
  (`CartaValidationError`).
- **Páginas máximas:** 2 (`MAX_PAGES`), ver seção acima.
- **Respiro:** 8mm (`PAGE_PADDING_MM`) entre a área segura da página (já descontada
  sangria + margem de segurança do SKU) e o bloco de texto.
- **Estimativa de capacidade por página:** usada só para decidir quantas páginas o texto
  ocupa (não para tipografia/rasterização real, que é de uma fase futura). Fonte estimada
  de 4.5mm (`FONT_SIZE_MM`), altura de linha 1.5× o tamanho da fonte
  (`LINE_HEIGHT_RATIO`), largura média de caractere 0.55× o tamanho da fonte
  (`AVG_CHAR_WIDTH_RATIO`). `linesPerPage × charsPerLine` dá a capacidade estimada em
  caracteres por página.
- **Área útil:** `pageWidthMm/pageHeightMm` do SKU menos `2 × (bleedMm + safeMarginMm)`;
  o bloco de texto de cada página usa essa área menos `2 × PAGE_PADDING_MM`, sempre
  centralizado nela e nunca invadindo a sangria.

## Golden samples
`golden-samples/` guarda composições aprovadas (entrada + JSON de saída de `compose.ts`)
para os testes de estilo no CI: uma carta curta (uma página) e uma carta próxima do limite
de 3000 caracteres (duas páginas), cobrindo os dois ramos da paginação.
