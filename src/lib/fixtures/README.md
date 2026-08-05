# Fixtures de desenvolvimento

Insumo para rodar o pipeline de geração à mão. **Não é golden sample** — golden sample trava
a _saída_ de uma skill contra regressão de estilo (`.claude/rules/product-skills.md`); aqui é
_entrada_, e nada é comparado contra ela.

| Arquivo             | O que é                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| `pedido-exemplo.ts` | `Order` fictício completo + geometria e resolução do SKU mini                   |
| `photos.ts`         | os bytes das fotos (`SourcePhoto[]`), reais se você tiver, sintéticas se não    |

```ts
import { PEDIDO_EXEMPLO, MINI_SKU_PHOTO_PARAMS } from '$lib/fixtures/pedido-exemplo';
import { loadFixturePhotos } from '$lib/fixtures/photos';

const fotos = await loadFixturePhotos();
const estilizadas = await provider.stylize(fotos, MINI_SKU_PHOTO_PARAMS);
```

## Usando fotos de verdade

Sem setup nenhum, `loadFixturePhotos()` devolve placeholders sintéticos — gradiente com uma
mancha no meio. Eles provam que o pipeline roda ponta a ponta, mas **não servem para julgar
se um `photo-style` ficou bom**: estilo de foto só se avalia em rosto de gente de verdade.

Para isso, crie `src/lib/fixtures/photos-locais/` e jogue 8 imagens dentro
(`.png`, `.jpg`, `.jpeg`, `.bmp`, `.gif`). A pasta é gitignorada.

Os arquivos são mapeados em **ordem alfabética** sobre os `photoId` do pedido, então nomeie
na ordem em que devem aparecer (`01-varanda.jpg`, `02-feira.jpg`, …). O `id` da foto vem
sempre do pedido, nunca do nome do arquivo — é a chave que junta a foto estilizada com a
legenda que a narrativa escreveu.

Com menos de 8 arquivos, os ids que sobrarem recebem placeholder.

> Foto real de pessoa **nunca** é commitada: é dado pessoal sensível (`docs/PRODUCT.md` §10),
> e o repositório é público.
