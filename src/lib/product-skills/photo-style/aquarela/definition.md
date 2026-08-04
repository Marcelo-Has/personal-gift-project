# Estilo de foto: Aquarela — v1.0.0

> Skill de runtime versionada. Melhorias vão como nova versão, preservando esta.

## Contrato
- **Entrada:** foto(s) do casal + parâmetros do pedido.
- **Saída:** ilustração no estilo aquarela, pronta para compor o layout (resolução/DPI
  adequados à impressão; ver ARCHITECTURE.md).

## Regras de estilo
- Traço suave, cores pastel, textura de aquarela; preservar semelhança e enquadramento.
- Sem elementos que atrapalhem legibilidade quando combinado com texto.
- Saída em resolução compatível com 300 DPI no tamanho do SKU escolhido.
- Provedor de geração de imagem é Decision Gate (D-102) — a skill abstrai o provedor.

## Golden samples
`golden-samples/` guarda pares aprovados (referência de entrada → saída) para os testes
de estilo no CI.

## Implementação (F2-03)
- Contrato typed em `../provider.ts` (interface `PhotoStyleProvider`).
- Provider fake e determinístico (sem rede) em `fake-provider.ts` (`AquarelaFakeProvider`),
  usado pelos testes e pelo motor futuro (F2-06) até a F2-04 existir.
- O provedor real de geração de imagem entra em **F2-04**, atrás do gate **D-102** — como
  nova implementação de `PhotoStyleProvider`, sem redesenho do contrato.
