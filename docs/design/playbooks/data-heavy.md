# Playbook — data-heavy

> **Esqueleto — amadurece com o primeiro uso real (D-078).**
>
> Este arquivo existe para que a categoria tenha lugar e nome antes de ter conteúdo. Ele registra as
> ênfases óbvias e, principalmente, **o que ainda não está decidido**. Um esqueleto **não** é
> autoridade: até amadurecer, o que vale é `docs/design/CRAFT-PRINCIPLES.md` (piso) e
> `.claude/rules/design-antipatterns.md` (sempre), mais o `DESIGN.md` do projeto (identidade).
>
> **Categoria:** análise, exploração e monitoramento de grandes volumes — não é "um painel com mais
> linhas". Enquanto for esqueleto, use `saas-dashboard.md` como base e trate estas ênfases como
> camada adicional. Ver `docs/design/playbooks/README.md`.

---

## Ênfases óbvias

- **Densidade máxima legível:** o objetivo é caber o máximo de dado **sem** cair abaixo do piso —
  texto de UI nunca abaixo de 14px (anti-pattern **41**), contraste nunca abaixo de AA (**31**).
  Densidade é conquistada tirando decoração e contêiner (**5**), nunca encolhendo texto.
- **Drill-down como estrutura da navegação:** agregado → recorte → registro, com o caminho de volta
  sempre visível. Cada nível declara o que ganha e o que perde em relação ao anterior.
- **Latência percebida é design:** o que aparece nos primeiros 200ms, o que chega depois, e como a
  tela se comporta enquanto chega. Esqueleto com a forma final (**59**), nunca layout que salta —
  e resultado parcial exibido **marcado como parcial**.
- **Legibilidade numérica não negocia:** algarismos tabulares, alinhamento à direita, precisão
  constante por coluna, unidade no cabeçalho. Ver `saas-dashboard.md` §3.2.
- **Filtro e recorte são o estado principal da tela.** O recorte ativo é sempre visível, nomeável e
  reversível; dado sem recorte declarado é dado não interpretável.
- **Densidade não suspende os estados** (CRAFT §6): vazio, carregando, erro, overflow e **parcial**
  continuam obrigatórios — em volume alto, o parcial é a regra, não a exceção.
- **Escala de conteúdo é restrição de entrada:** projete com o pior volume plausível (centenas de
  milhares de linhas, série temporal longa, categoria com 300 valores), não com a amostra bonita.
- **Cor com papel semântico e nunca sozinha** (CRAFT §4): em volume alto, a cor vira o principal
  canal de leitura e é justamente onde ela falha — daltonismo, monitor ruim, impressão.

## O que falta definir

- **Visualização de dados**: esta é a lacuna maior. Que tipos de gráfico, quando cada um, escala de
  eixo, tratamento de zero, densidade de rótulo, legenda × rótulo direto — e **de onde sai a paleta
  categórica/sequencial** sem virar um segundo acento (CRAFT §4).
- Se a paleta de dados é decisão do `DESIGN.md` (identidade) ou derivada por regra da categoria.
- Rubrica extra do `design-critic` para gráfico: como se avalia distorção, cherry-picking de eixo e
  legibilidade de série sobreposta sobre um screenshot.
- Virtualização, paginação e rolagem infinita: qual é o default do produto e o que cada uma custa em
  teclado, foco e busca da página.
- Exportação (CSV, imagem, relatório) como entrega de design, não como sobra.
- Acessibilidade de gráfico: alternativa textual, tabela equivalente, navegação por teclado numa
  série.
- Limites de desempenho aceitáveis e como eles viram gate verificável na EV2.4.
- Onde termina `saas-dashboard.md` e começa este playbook — a fronteira ainda não está escrita.

## Como este esqueleto amadurece

Com o **primeiro projeto real** da categoria: o que a Fundação precisou decidir e não estava
escrito, e o que o critic achou no pós-render, viram as seções 1–4 no formato dos playbooks
completos (`institucional-marketing.md`, `saas-dashboard.md`). Amadurecer o esqueleto é trabalho de
uma issue própria, não do PR que o usou pela primeira vez.
