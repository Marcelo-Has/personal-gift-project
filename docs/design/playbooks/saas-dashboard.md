# Playbook — SaaS / dashboard

> **Categoria:** painel operacional, produto interno, console de administração, aplicação de trabalho
> repetido.
> **Status:** completo. É a categoria dos briefs do benchmark **EV2.5**.
>
> **O que é isto.** A **estratégia** desta categoria de interface (D-078): onde a Fundação gasta o
> esforço, o que o `design-critic` olha com mais rigor, que gates específicos ativam e quais
> armadilhas esta categoria produz sozinha.
>
> **O que isto NÃO é.** Não há aqui nenhuma escolha de identidade — nenhuma paleta, nenhuma fonte,
> nenhum estilo, nenhum nome de direção. Identidade é o `DESIGN.md` do projeto e só ele. Este
> playbook também não rebaixa nada: `docs/design/CRAFT-PRINCIPLES.md` é o piso e
> `.claude/rules/design-antipatterns.md` vale sempre. Ver `docs/design/playbooks/README.md`.

---

## 1. Onde a Fundação foca

Um painel não é uma página bonita com dados dentro. É uma **ferramenta que alguém usa muitas vezes
por dia** — e a diferença entre uma boa e uma ruim aparece na décima visita, não na primeira.

### 1.1 Arquitetura de informação **antes** de estética

Esta é a inversão que define a categoria. Nada de tokens, direção ou composição antes de responder:

- **Que objetos existem** no produto, como se chamam na boca do usuário, e como se aninham.
- **Onde a pessoa cai** ao entrar, e por quê — a tela inicial é a tarefa mais frequente, não um
  resumo genérico.
- **Como se navega** entre objetos: o modelo de navegação (lateral fixa, hierarquia, busca como
  entrada principal) é decisão de Fundação e entra no `DESIGN.md` §6 como conceito de layout.
- **Quantas telas-arquétipo** o produto tem — lista, detalhe, criação/edição, configuração. Todo
  wireframe da §6 é de um arquétipo, não de uma tela avulsa; as telas concretas herdam dele.

O teste: se você não consegue desenhar o mapa de objetos numa folha, nenhum pixel vai salvar a
interface.

### 1.2 Densidade calibrada por tarefa

CRAFT §7 diz que operação repetida pede **alta densidade** — respiro demais aqui é hostil, obriga a
rolar para ver o que deveria caber junto. O que este playbook acrescenta: a densidade se declara
**por arquétipo de tela**, não uma vez para o produto inteiro.

| Arquétipo | Densidade | Por quê |
| --- | --- | --- |
| Lista / tabela | Alta | Comparar muitas linhas de uma vez é a tarefa. |
| Detalhe de um objeto | Média | Ler e agir sobre um item; agrupamento forte importa mais que quantidade. |
| Criação / edição | Média, com agrupamento forte | Fluxo guiado (CRAFT §7): um passo por vez. |
| Configuração | Média | Visita rara, decisão consequente; clareza vale mais que compactação. |

Dentro de um arquétipo a densidade é **uniforme**: densidade que muda de seção para seção lê como
inconsistência. E nenhuma densidade justifica alvo de toque pequeno (CRAFT §7) nem texto de UI
abaixo de 14px (anti-pattern 41).

### 1.3 Legibilidade de dados

- **Alinhamento carrega significado**: número à direita, texto à esquerda, cabeçalho alinhado com a
  sua coluna. Coluna numérica desalinhada destrói a comparação vertical que é a razão da tabela.
- **Precisão constante por coluna.** Duas casas numa linha e nenhuma na outra é ruído com aparência
  de dado.
- **Unidade e escala visíveis** — no cabeçalho da coluna, não repetidas em cada célula.
- **Toda métrica precisa de referência**: comparado a quando, a qual meta, a qual período. Número
  sozinho não é informação.
- Cor **nunca** é o único portador de estado (CRAFT §4): status precisa de forma, ícone ou texto.
- Papel tipográfico de **dado numérico** é papel próprio na §4.5 do `DESIGN.md` — não é o `body`.

### 1.4 Hierarquia de ações primária e secundária

- **Uma ação primária por tela**, visualmente inequívoca. Se há duas, a tela está fazendo duas
  coisas (CRAFT §1).
- Ações secundárias rebaixadas de forma **consistente entre telas** — o mesmo peso significa o mesmo
  papel em todo o produto.
- **Ação destrutiva é separada fisicamente** das outras e nunca ocupa a posição da primária.
- Ação em massa (seleção múltipla) declara o que acontece com a seleção, quantos itens serão
  afetados e como se desfaz.
- Ação por linha na tabela: declare se a linha inteira é clicável **e** o que a torna distinguível
  dos controles dentro dela.

### 1.5 Estados vazios como onboarding

O estado vazio não é uma exceção: é **a primeira tela que todo usuário real vê**. Ele é a única
oportunidade de onboarding que não interrompe ninguém.

- Diz **por que está vazio**, o que aparece ali quando houver conteúdo, e **qual é a próxima ação** —
  com o controle real, não com uma frase.
- Vazio **por filtro** é diferente de vazio **por ausência de dado**: um oferece limpar o filtro, o
  outro oferece criar o primeiro item. Tratar os dois com o mesmo texto é achado.
- Vazio **por permissão** diz quem pede acesso a quem.

---

## 2. Rubrica extra do `design-critic`

Soma-se — não substitui — ao checklist `[CRITIC]` de `.claude/rules/design-antipatterns.md` e ao
teste *"isso poderia sair de qualquer prompt parecido?"*. Roda **pós-render**, sobre os screenshots.

### 2.1 Escaneabilidade

Teste: com a tela cheia de dados plausíveis, **encontrar um registro específico** sem ler tudo.

- Existe uma **coluna-âncora** (o nome do objeto) que o olho percorre sozinha, e ela está visualmente
  distinta das colunas de apoio?
- É possível responder "quantos itens há e quantos precisam de atenção" sem contar?
- A tela sobrevive ao **pior conteúdo plausível**: nome de 80 caracteres, 300 linhas, campo vazio,
  valor negativo (CRAFT §6, estado de overflow).

Se para encontrar um registro é preciso ler linha por linha, a hierarquia da tabela é achado — não a
falta de um filtro.

### 2.2 Consistência de padrões entre telas

Aqui a repetição é **virtude**, não fôrma. O critic compara telas, não só cada uma isolada:

- O **mesmo objeto** é representado do mesmo jeito em toda parte (mesmas colunas essenciais, mesmo
  rótulo, mesmo formato de data e de número).
- Duas telas do mesmo arquétipo se comportam igual: mesma posição da ação primária, mesmo lugar da
  busca, mesmo padrão de paginação.
- O **vocabulário** é único: o mesmo conceito não muda de nome entre a navegação, o título e o botão.

> **Como o item 8 se lê aqui.** O anti-pattern 8 — mesma família de layout em três seções
> consecutivas — continua valendo integralmente e o critic continua aplicando-o **dentro de uma
> tela**: três blocos idênticos empilhados numa tela de detalhe são achado como em qualquer lugar.
> O que este playbook diz é **onde procurar**: duas telas de lista parecidas entre si não são
> instância do item 8 — são o requisito 2.2 sendo cumprido. Se houver conflito real, vence o
> anti-pattern, e a saída é a justificativa registrada no `DESIGN.md`, nunca o desvio silencioso.

### 2.3 Affordances de interação

- O que é clicável **parece** clicável parado — sem depender de hover. Descoberta que só existe no
  hover não existe no toque nem no teclado.
- Alvo clicável e área visual coincidem; não há armadilha de "só o texto é link".
- Estado **desabilitado diz por quê** — ou não está desabilitado, está escondendo um erro.
- Ordenação, filtro e seleção mostram o **estado atual** sem que seja preciso abrir nada.
- Toda ação dá **feedback no lugar onde foi disparada**, não só numa notificação no canto.

---

## 3. Gates e atenções da categoria

### 3.1 Sem "liberdade de hero"

**Não existe hero nesta categoria.** A tela abre com o trabalho, não com uma promessa: título curto,
contexto do objeto e a ação primária. Não há badge, não há subtítulo persuasivo, não há dois botões
centrados. O anti-pattern **2** aqui não tem a válvula de escape que teria numa página de produto —
"hero centrado" dentro de um painel é sinal de que a tela foi montada com o vocabulário da categoria
errada. Também caem por consequência: dica de rolagem (**67**), strip de metadados decorativos
(**66**) e placeholder poético (**61**).

### 3.2 Tabelas e números com `tabular-nums`

- Toda coluna numérica usa **algarismos tabulares** (`font-variant-numeric: tabular-nums`) e
  alinhamento à direita. Sem isso os dígitos dançam entre linhas e a comparação vertical se perde.
- Vale também para números fora de tabela que mudam no lugar: contadores, cronômetros, valores que
  atualizam. Largura instável faz o layout piscar.
- Cabeçalho de coluna acompanha o alinhamento da coluna.
- A família tipográfica escolhida na §4.5 do `DESIGN.md` **precisa suportar** tabular — isso é
  restrição de entrada da Fundação nesta categoria, não descoberta na Construção.

### 3.3 Teclado e foco impecáveis

Painel é ferramenta de uso repetido: quem usa todo dia usa pelo teclado. Isto é gate, não polimento.

- **Percurso completo** por teclado, na ordem visual, com **foco visível em cada parada**. `outline:
  none` sem substituto é defeito (anti-pattern 55).
- Sem armadilha de foco. Diálogo devolve o foco ao controle que o abriu quando fecha.
- Componentes compostos (tabela, menu, combobox, abas) respondem às teclas esperadas — isso é
  mecânica de primitiva acessível, e é exatamente onde o `SKILL-ROUTER` admite biblioteca de
  componentes; primitiva importada em estado default, porém, continua sendo achado.
- Rótulo real acima do campo; `placeholder` não é rótulo (anti-pattern 56) — inclusive em filtro e
  em busca.

### 3.4 Estados de dados obrigatórios

Quatro estados, **todos**, para todo componente que carrega dado — preenchidos na §11 do
`DESIGN.md` com texto e forma, nunca com "mostrar mensagem":

| Estado | Exigência |
| --- | --- |
| **Vazio** | Ver §1.5. Distinguir vazio-por-filtro, vazio-por-ausência e vazio-por-permissão. |
| **Carregando** | Esqueleto com a **forma do resultado final** — a tabela já sabe quantas colunas terá. Spinner genérico onde um esqueleto serve é achado (**59**). |
| **Erro** | Nomeia o problema **e** a saída, no lugar onde o erro acontece (**72**). Erro de um widget não derruba a tela inteira. |
| **Parcial** | O estado em que um painel realmente vive: uma fonte respondeu, outra não; dado desatualizado; total que não fecha. A tela diz **o que está faltando e desde quando** — nunca apresenta um número incompleto como se fosse completo. |

Só o estado feliz implementado é achado (**58**), e nesta categoria é o achado mais caro: um painel
que só funciona com dados perfeitos não funciona.

---

## 4. Armadilhas desta categoria

| Armadilha | Itens | Por que aparece aqui |
| --- | --- | --- |
| **Hero importado do marketing** | **2**, **67**, **66**, **61** | Ver §3.1. É a categoria errada vazando para dentro do produto. |
| **Contêiner como substituto de hierarquia** | **5**, **17**, **18**, **15** | Card dentro de card (5) é o default de todo dashboard gerado sem decisão; borda + sombra no mesmo elemento (17), raio gigante uniforme (18) e sombra multicamada (15) vêm juntos. Em painel denso, contêiner custa espaço que era do dado — agrupe com espaço e divisor (CRAFT §1). |
| **Espaçamento monótono** | **9** | Alta densidade não é "o mesmo valor pequeno entre tudo". Sem ritmo, uma tela densa vira uma parede. |
| **Modal por reflexo** | **11** | Modal para tarefa que não precisa interromper nem proteger o foco — em ferramenta de uso repetido, cada modal é um passo a mais, todo dia. |
| **Só o estado feliz** | **58**, **59**, **72** | Ver §3.4. |
| **Foco e formulário** | **55**, **56** | Ver §3.3. |
| **Densidade usada como desculpa** | **41**, **31**, **43** | Texto de UI abaixo de 14px (41), contraste abaixo de AA em dado e rótulo (31) e heading pulado por tamanho (43) aparecem sempre justificados por "cabe mais". Não cabe: fica ilegível. |
| **Iconografia de painel** | **20**, **21**, **23** | Emoji no lugar de ícone (20), famílias e espessuras misturadas (21) e ícone em tile arredondado acima de cada título (23). Ícone sem rótulo em ação destrutiva é armadilha própria da categoria. |
| **Escuro por reflexo** | **32**, **33** | Painel tem argumento real para tema escuro — uso longo, ambiente controlado. Argumento real **se escreve** no `DESIGN.md`; escolhido por reflexo continua sendo achado (32), e tema invertido no meio da tela também (33). |

---

## 5. O que este playbook não decide

- **Identidade** — nome da direção, paleta, famílias tipográficas, assinatura visual, tom de voz:
  tudo isso é o `DESIGN.md` do projeto (`docs/design/DESIGN-TEMPLATE.md`), aprovado em Decision
  Gate (D-078, §9).
- **Piso de craft** — `docs/design/CRAFT-PRINCIPLES.md` vale integral, sem desconto de categoria.
- **Biblioteca de componentes** — mecânica é por perfil de stack, decidida em
  `docs/design/SKILL-ROUTER.md`. Que exista primitiva acessível de tabela e diálogo **não** define a
  identidade do painel: se a tela pronta é reconhecível como "uma tela da biblioteca X", a mecânica
  venceu a identidade, e isso é o defeito (D-078, §6).
