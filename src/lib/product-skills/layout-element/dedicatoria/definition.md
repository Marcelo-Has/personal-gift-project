# Elemento de layout: Dedicatória — v1.0.0

> Skill de runtime versionada. Define como o texto de dedicatória é composto na página de
> abertura do livro.

## Contrato
- **Entrada:** o texto de `dedication` vindo do narrative-style (`narrative-style/romantico`
  produz `dedication: string`, `z.string().trim().min(1).max(500)`), já pronto — esta skill
  não gera nem edita o texto, só posiciona.
- **Saída:** composição posicionada no spread de abertura/dedicatória (área útil da página +
  bloco de texto centralizado), respeitando margens e sangria do SKU.

## Regras de estilo
- Página de abertura minimalista: o texto é o único elemento, centralizado horizontal e
  verticalmente na área útil, com bastante respiro ao redor (bloco ocupa no máximo 60% da
  largura útil — ver `TEXT_BLOCK_WIDTH_RATIO`).
- Tipografia de abertura: serifada/itálica, tamanho de leitura confortável para um texto
  curto isolado (não é corpo de capítulo).
- Texto nunca invade a área de sangria nem a margem de segurança do SKU.

## Comportamento quando o texto excede o espaço disponível
Análogo à legenda longa em `polaroid-com-texto`: a skill **rejeita**, nunca trunca.
- **Limite de caracteres:** 500 (`MAX_DEDICATION_LENGTH`), o mesmo teto do campo
  `dedication` de `narrative-style/romantico` — texto vazio ou acima do limite lança
  `DedicatoriaValidationError`.
- **Limite de espaço na página:** mesmo dentro do limite de caracteres, o bloco de texto
  estimado (linhas estimadas a partir da largura do bloco e de uma largura média de
  caractere, ver Parâmetros) pode não caber na altura útil de um SKU pequeno — nesse caso
  a composição também é rejeitada com `DedicatoriaValidationError`, em vez de estourar a
  margem de segurança. Cortar uma dedicatória no meio arrisca uma frase sem sentido numa
  página de abertura; melhor rejeitar e o narrative-style regenerar mais curto (ou o
  comprador escolher um SKU maior) do que arriscar isso impresso.

## Parâmetros (v1.0.0, `compose.ts`)
- **Comprimento máximo do texto:** 500 caracteres (`MAX_DEDICATION_LENGTH`).
- **Largura do bloco de texto:** 60% da largura útil da página (`TEXT_BLOCK_WIDTH_RATIO`),
  centralizado — margens generosas são a marca de uma página de abertura.
- **Estimativa de linha:** como a saída é estrutural (JSON, não bitmap renderizado — fora de
  escopo desta skill), a altura do bloco é estimada por uma largura média de caractere
  (`AVG_CHAR_WIDTH_MM`, 2.2mm) e altura de linha (`LINE_HEIGHT_MM`, 6mm) para a tipografia de
  abertura descrita acima; não é medição real de fonte.
- **Teto de altura do bloco:** 70% da altura útil (`MAX_TEXT_HEIGHT_RATIO`) — mesmo um texto
  dentro do limite de 500 caracteres é rejeitado se o bloco estimado ultrapassar esse teto
  num SKU específico.
- **Área útil:** `pageWidthMm/pageHeightMm` do SKU menos `2 × (bleedMm + safeMarginMm)`;
  bloco de texto sempre centralizado nela, nunca invade a sangria.

## Golden samples
`golden-samples/` guarda composições aprovadas (entrada + JSON de saída de `compose.ts`)
para os testes de estilo no CI.
