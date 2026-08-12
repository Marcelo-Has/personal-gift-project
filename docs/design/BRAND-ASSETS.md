# R-ASSETS — a convenção de assets de marca

> **O que é isto.** A convenção que faz valer o requisito **R-ASSETS** do D-078 §6: *"o DS nasce
> dos assets de marca quando existirem — logos, imagens, cores, wireframes/Figma num diretório
> lido pela Fundação — com a proveniência registrada no `DESIGN.md`."*
>
> **Por que existe.** Sem um lugar combinado, a Fundação inventa uma paleta enquanto o logo do
> produto está numa pasta do dono. O resultado não é só retrabalho: é um design system que
> **contradiz a marca que já existe**. Um diretório com endereço fixo transforma "ver se tem
> asset" de boa intenção em passo obrigatório do processo.

---

## A regra em uma frase

**Asset existente é fonte primária. Criação do zero só na ausência comprovada — e a Fundação prova
a ausência lendo `design/assets/` antes de criar qualquer coisa.**

## O diretório

`design/assets/` fica **na raiz do repositório**, não dentro de `docs/` nem de `static/`. É
matéria-prima de design, não documentação e não asset servido pelo app — o que o app publica
continua saindo do fluxo normal de build.

```
design/assets/
├── README.md        ← aponta para esta convenção
├── logos/           ← marca em formato vetorial quando houver; variações (positivo, negativo, ícone)
├── images/          ← fotos e imagens do produto que já estão no ar ou já foram aprovadas
├── palette.md       ← cores que já existem, com o hex e ONDE cada uma já é usada hoje
└── references.md    ← links: wireframes, Figma, produtos-referência, moodboard
```

**`palette.md` e `references.md` são markdown de propósito.** Uma cor sem a anotação de onde ela já
é usada não é um asset — é um hex solto, e hex solto a Fundação não consegue distinguir de chute.
O mesmo vale para um link sem a frase que diz o que se quer daquela referência.

## O que a Fundação faz com isto

Passo obrigatório, **antes** de propor qualquer coisa no `DESIGN.md` (D-078, §1):

1. **Ler `design/assets/` inteiro.** Todos os quatro itens, mesmo os vazios.
2. **Derivar primeiro.** Cor, tipografia, forma e tom que puderem sair de um asset existente saem
   dele. A paleta do `DESIGN.md` §4.1 nasce do `palette.md` e dos logos quando eles existem.
3. **Criar só o que faltar**, e registrar por que faltava.
4. **Registrar a proveniência** de cada decisão na §14 do `DESIGN.md` — `derivada-de-asset`,
   `criada-na-Fundação` ou `herdada-de-DS-existente`, com a fonte citada (ver
   `docs/design/DESIGN-TEMPLATE.md`).
5. **Listar o que leu** na mesma §14: os assets encontrados na data da Fundação. É essa lista que
   justifica cada linha `criada-na-Fundação` — sem ela, não há como distinguir "não existia asset"
   de "não olhei".

**Decisão marcada como `criada-na-Fundação` onde existia asset disponível é violação de R-ASSETS**,
e é achado de revisão do `design-critic`, não preferência.

## O que entra e o que não entra

**Entra:** logo e variações; fotos e imagens já usadas em produção; cores já no ar; wireframes e
links de Figma; produtos-referência com a frase do que se toma deles; qualquer material de marca
que o dono já tenha aprovado fora do repositório.

**Não entra:** asset gerado pela própria IA sem aprovação (isso nasce no `DESIGN.md`, não aqui, e
sua origem é `criada-na-Fundação`); material com direito de terceiros que o projeto não pode usar;
foto de usuário real ou qualquer derivado dela — o repositório **nunca** versiona material de
cliente (`CLAUDE.md`, regra 3).

## Estado atual — inventário

**Data:** 2026-08-12. **Resultado da varredura: o inventário está vazio.** Verificado no
repositório, não presumido:

| Verificação | Resultado |
| --- | --- |
| Arquivos de imagem ou fonte versionados (`png`, `jpg`, `svg`, `webp`, `ico`, `woff*`, `ttf`, `otf`) | **nenhum** (`git ls-files`) |
| Diretório `static/` | **não existe** |
| Favicon ou `<link>` de fonte em `src/app.html` | **nenhum** |
| Imagens ou logo na home (`src/routes/+page.svelte`) | **nenhum** — a página é texto, um CTA e ~25 linhas de CSS de largura e espaçamento |
| Cor declarada no CSS da home | **nenhuma** — o CTA usa `currentColor` |

Isso **não contradiz** o brief que pede o inventário dos assets do produto no ar: o produto no ar
hoje não tem assets. O `README.md` já registrava o mesmo fato em outras palavras — *"a home page
atual é um placeholder mínimo (sem identidade visual/naming definidos)"* —, e o nome comercial e o
logo continuam sendo Decision Gate aberto (`docs/AUTONOMY.md` §2, "Identidade visual e narrativa").

**Consequência para a Fundação:** com o inventário assim, praticamente toda a §14 do `DESIGN.md`
sairá como `criada-na-Fundação`. Isso é legítimo **porque a ausência está verificada e registrada
acima** — é exatamente a prova que a regra exige.

**Até a P6 — [A CONFIRMAR NA FUNDAÇÃO — P6]:** se o dono tiver material de marca **fora** do
repositório (rascunho de logo, paleta, referência, wireframe, board), ele entra em
`design/assets/` **antes** de a Fundação rodar. Depositado depois, chega tarde: a direção visual já
terá sido proposta sem ele, e reconciliar significa novo Decision Gate (D-078, §9).
