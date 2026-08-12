# design/assets — matéria-prima de marca

Este diretório é o **primeiro lugar que a Fundação de design lê**, antes de propor qualquer coisa
no `DESIGN.md` (D-078, §6 — requisito **R-ASSETS**).

**A convenção completa está em [`docs/design/BRAND-ASSETS.md`](../../docs/design/BRAND-ASSETS.md)**
— o que entra, o que não entra, e o que a Fundação faz com o que encontrar aqui. Leia lá antes de
depositar ou de consumir qualquer coisa deste diretório.

## A regra em uma frase

**Asset existente é fonte primária; criação do zero só na ausência.** O que for derivado de um
arquivo daqui entra no `DESIGN.md` como `derivada-de-asset`, com o arquivo citado.

## Estrutura esperada

| Caminho | Conteúdo |
| --- | --- |
| `logos/` | marca em vetor quando houver, com as variações |
| `images/` | fotos e imagens do produto já no ar ou já aprovadas |
| `palette.md` | cores existentes, com hex **e onde cada uma já é usada** |
| `references.md` | links de wireframe, Figma, produtos-referência — cada um com a frase do que se toma dele |

Os subdiretórios e os dois markdowns são criados **quando houver o primeiro asset de cada tipo**.
Diretório vazio não é rastreado pelo git e pasta vazia não prova nada; o que prova é o inventário
datado em `docs/design/BRAND-ASSETS.md`.

## Estado atual

**Vazio.** Em 2026-08-12 o repositório não tinha nenhum logo, imagem, fonte ou cor de marca
versionada, e a home no ar é um placeholder sem identidade visual. A varredura completa, com o que
foi verificado e como, está na seção *Estado atual — inventário* da convenção.

**Nunca versione aqui material de cliente** — foto de usuário ou qualquer derivado dela não entra
neste diretório nem em nenhum outro (`CLAUDE.md`, regra 3).
