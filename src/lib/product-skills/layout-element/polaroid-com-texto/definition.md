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

## Golden samples
`golden-samples/` guarda composições aprovadas para os testes de estilo no CI.
