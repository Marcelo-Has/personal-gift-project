# Elemento de layout: Linha do tempo — v1.0.0

> Skill de runtime versionada. Define como a lista de marcos (`TimelineEntry[]`, saída do
> bloco `timeline` de narrative-style) é composta como uma linha do tempo no spread.

## Contrato
- **Entrada:** lista de marcos `{ title: string, description: string }` (mesmo formato de
  `TimelineEntry` de `narrative-style/romantico/generate.ts`) + parâmetros de layout do SKU
  (página, sangria, margem de segurança) — não o questionário bruto do casal.
- **Saída:** composição posicionada no spread (uma linha horizontal + um marcador por
  entrada, com rótulo de título/descrição), respeitando margens e sangria do SKU.

## Regras de estilo
- Linha horizontal única, centralizada verticalmente na área útil.
- Um marcador por marco, distribuído ao longo da linha na ordem recebida (linha do tempo é
  cronológica — a skill não reordena).
- Rótulo (título + descrição) alterna entre acima e abaixo da linha, marco a marco, para não
  sobrepor o rótulo do vizinho.
- Rótulo nunca invade a área de sangria nem a margem de segurança do SKU.

## Comportamento para lista vazia e excesso de marcos
- **Lista vazia:** composição **válida**, com `markers: []` (a linha ainda é calculada). Um
  casal pode legitimamente não ter marcos de linha do tempo — não é erro. O motor de
  orquestração (F2-06) decide se omite o elemento no spread quando `markers.length === 0`;
  essa decisão fica fora desta skill.
- **Excesso de marcos:** acima de `MAX_ENTRIES_PER_SPREAD` (8) entradas, a composição é
  **rejeitada** (`TimelineValidationError`), não truncada nem paginada — mesma lógica da
  rejeição de legenda longa em `polaroid-com-texto`: cortar marcos silenciosamente arrisca
  perder um marco que o casal considera importante; melhor falhar de forma descritiva e
  deixar o motor de orquestração (ou o narrative-style, se regenerar) decidir o que cortar.
  `narrativeBlocksSchema.timeline` permite até 20 entradas no bloco de narrativa, mais do
  que um spread comporta — por isso o limite de 8 é desta skill, não do narrative-style.

## Parâmetros (v1.0.0, `compose.ts`)
- **`MAX_ENTRIES_PER_SPREAD`:** 8 marcos. Escolhido para que cada rótulo tenha largura
  legível mesmo com 8 marcadores distribuídos na largura útil de um SKU mini (150mm); mais
  que isso e o rótulo ficaria estreito demais para título + descrição.
- **`MAX_TITLE_LENGTH` / `MAX_DESCRIPTION_LENGTH`:** 120 / 500 caracteres — mesmos limites
  do contrato `TimelineEntry` de narrative-style; a skill valida de novo aqui (defesa em
  profundidade, mesma convenção de `polaroid-com-texto`), sem depender de o chamador já ter
  validado.
- **Linha:** horizontal, com 6% de margem em relação à área útil de cada lado (não encosta
  no marco extremo na borda da área útil), espessura de 1mm, centralizada verticalmente na
  área útil.
- **Marcadores:** distribuídos uniformemente ao longo da linha (primeiro marco no início da
  linha, último no fim; com 1 marco só, centralizado). Determinístico: mesma lista de
  entrada → mesmas posições (sem `Math.random`/relógio).
- **Rótulo:** largura = 90% do espaçamento entre marcadores vizinhos, com teto de 40% da
  largura útil (evita rótulo enorme quando há poucos marcos); altura = metade da altura útil
  menos a espessura da linha e o vão de 4mm entre linha e rótulo. Posição horizontal
  centralizada no marcador, mas sempre recortada (`clamp`) para dentro da área útil — nos
  marcos das pontas da linha, isso pode deslocar o rótulo para não invadir a sangria/margem.
- **Área útil:** `pageWidthMm/pageHeightMm` do SKU menos `2 × (bleedMm + safeMarginMm)`,
  mesmo cálculo de `polaroid-com-texto`.

## Golden samples
`golden-samples/` guarda composições aprovadas (entrada + JSON de saída de `compose.ts`)
para os testes de estilo no CI: uma com poucos marcos e outra com o máximo de marcos por
spread.
