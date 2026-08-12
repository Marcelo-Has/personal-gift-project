# Playbook — editorial

> **Esqueleto — amadurece com o primeiro uso real (D-078).**
>
> Este arquivo existe para que a categoria tenha lugar e nome antes de ter conteúdo. Ele registra as
> ênfases óbvias e, principalmente, **o que ainda não está decidido**. Um esqueleto **não** é
> autoridade: até amadurecer, o que vale é `docs/design/CRAFT-PRINCIPLES.md` (piso) e
> `.claude/rules/design-antipatterns.md` (sempre), mais o `DESIGN.md` do projeto (identidade).
>
> **Categoria:** superfície de leitura — artigo, documentação, publicação, texto longo.
> Ver `docs/design/playbooks/README.md`.

---

## Ênfases óbvias

- **Tipografia é a estrutura, não o acabamento.** Aqui o sistema tipográfico (CRAFT §2) faz o
  trabalho que em outras categorias é feito por caixa, borda e cor. Se a página precisa de contêiner
  para se organizar, a tipografia não está resolvida.
- **Ritmo de leitura:** entrelinha, espaço entre parágrafos e distância entre níveis de título formam
  uma cadência única na página inteira. Mais espaço **acima** de um título do que abaixo — o título
  pertence ao que vem depois (CRAFT §3).
- **Medida de linha entre 45 e 75 caracteres** (anti-pattern **40**), mantida nos três breakpoints.
  É a restrição que define a coluna de leitura, e é ela que decide o grid — não o contrário.
- **Hierarquia de títulos é a estrutura do documento**, nunca escolha de tamanho: sem nível pulado
  (anti-pattern **43**), e a mesma estrutura serve a navegação, o índice e o leitor de tela.
- **Elementos intercalados** — citação, imagem com legenda, nota, código, tabela — têm tratamento
  declarado e **não quebram** o ritmo da coluna ao entrar.
- **Densidade baixa e tempo do leitor** (CRAFT §7): nada de elemento que compete com o texto
  enquanto se lê. Movimento por scroll, cascata de entrada (**57**) e marquee (**51**) são
  especialmente hostis aqui.
- **Contraste e conforto de leitura longa:** AA é piso (anti-pattern **31**); corpo nunca abaixo de
  16px (**41**); sem caixa alta em texto corrido nem texto justificado (**42**).
- **Ênfase sem trocar de família** (anti-pattern **46**): itálico, peso e espaço resolvem; palavra
  serifada dentro de título sem serifa, não.

## O que falta definir

- Rubrica extra do `design-critic`: como se mede "ritmo de leitura" sobre um screenshot, e com que
  extensão de texto real o critic avalia.
- Gates da categoria: tempo/profundidade de leitura, índice e âncoras, impressão, modo de leitura do
  navegador, `article`/microdados.
- Política de imagem dentro do texto — larguras permitidas, sangria, legenda como papel tipográfico
  próprio na §4.5 do `DESIGN.md`.
- Notas, referências e citações: um padrão só para o produto inteiro.
- Escala tipográfica fluida (`clamp`) × passos discretos, e qual das duas a categoria prefere.
- Tema de leitura (claro/escuro/sépia) — decisão de contexto de uso (CRAFT §4) ou de produto?
- Como esta categoria compõe com **mobile** (leitura longa em tela pequena é o caso majoritário).
- Relação com o conteúdo narrativo gerado pelas skills de produto (`src/lib/product-skills/`), onde
  o travessão é da língua e não do LLM (anti-pattern **69**, exceção já declarada).

## Como este esqueleto amadurece

Com o **primeiro projeto real** da categoria: o que a Fundação precisou decidir e não estava
escrito, e o que o critic achou no pós-render, viram as seções 1–4 no formato dos playbooks
completos (`institucional-marketing.md`, `saas-dashboard.md`). Amadurecer o esqueleto é trabalho de
uma issue própria, não do PR que o usou pela primeira vez.
