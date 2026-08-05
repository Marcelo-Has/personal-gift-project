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

## Implementação (F2-03 / F2-04)
- Contrato typed em `../provider.ts` (interface `PhotoStyleProvider`).
- Provider fake e determinístico (sem rede) em `fake-provider.ts` (`AquarelaFakeProvider`),
  usado pelos testes e como fallback explícito de `HttpPhotoStyleProvider` quando não há
  chave configurada.
- Provider real em `http-provider.ts` (`HttpPhotoStyleProvider`, F2-04, [D-056]/[D-057]) —
  chama a API de imagens da OpenAI (`gpt-image-1`) do backend, com o teto de resolução de
  `../resolution-config.ts`. Ver [D-057] no `docs/DECISIONS.md` para o achado sobre o teto
  de saída do provedor concreto ficar abaixo do requisito de 300 DPI de impressão.
