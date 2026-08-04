# Elemento de layout: Polaroid com texto — v1.0.0

> Skill de runtime versionada. Define como uma polaroid e seu texto são compostos.

## Contrato
- **Entrada:** uma imagem (foto ou ilustração de photo-style) + uma legenda/bloco curto
  vindo do narrative-style.
- **Saída:** composição posicionada no spread (moldura polaroid + legenda), respeitando
  margens e sangria do SKU.

## Regras de estilo
- Moldura polaroid com leve inclinação; legenda manuscrita/serifada curta.
- Texto nunca invade a área de sangria; contraste suficiente para leitura.
- Comprimento máximo da legenda definido aqui e respeitado pelo narrative-style.

## Parâmetros (v1.0.0, `compose.ts`)
- **Comprimento máximo da legenda:** 80 caracteres (`MAX_CAPTION_LENGTH`). Legenda vazia ou
  acima do limite é **rejeitada** (`PolaroidComTextoValidationError`), não truncada — cortar
  uma legenda manuscrita no meio arrisca frase sem sentido; melhor o narrative-style
  regenerar mais curto do que arriscar isso impresso.
- **Moldura:** ocupa no máximo 72% da largura útil da página **e** 72% da altura útil (área
  já descontada sangria + margem de segurança do SKU) — ajuste tipo "contain": para fotos
  retrato em SKU quadrado, o limite de altura pode vencer o de largura, e a moldura encolhe
  para caber; borda de 6mm ao redor da foto; faixa de legenda = 24% da largura da moldura
  (proporção clássica de polaroid).
- **Inclinação:** determinística a partir da legenda (mesma legenda → mesmo ângulo), na
  faixa de -6° a +6° — dá variedade sem depender de aleatoriedade, o que manteria a
  composição não-reprodutível para golden samples.
- **Área útil:** `pageWidthMm/pageHeightMm` do SKU menos `2 × (bleedMm + safeMarginMm)`;
  moldura sempre centralizada nela, nunca invade a sangria.

## Golden samples
`golden-samples/` guarda composições aprovadas (entrada + JSON de saída de `compose.ts`)
para os testes de estilo no CI.
