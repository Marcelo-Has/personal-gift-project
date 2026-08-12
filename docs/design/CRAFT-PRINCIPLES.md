# Princípios de craft visual

> **O que é isto.** O piso de qualidade visual da fábrica. Vale para **qualquer** interface que
> este repositório produza, com qualquer framework, com qualquer direção estética ativa.
> Não descreve *o gosto* de um projeto — isso é papel do `DESIGN.md` de cada projeto (D-078).
> Descreve a **mecânica** que separa uma tela construída de uma tela montada.
>
> **Por que existe.** O baseline EV1.2 mediu a fábrica gerando UI e o resultado foi *design 1,5/4
> com acessibilidade 100*: tecnicamente correta, visualmente muda. Esse é o gap G1. Acessibilidade
> passa em teste automático; craft não passa — precisa estar escrito. Está aqui.
>
> **Hierarquia de autoridade.** `DESIGN.md` do projeto > este documento > qualquer skill estética.
> Ver `docs/design/SKILL-ROUTER.md`. A lista do que é proibido como reflexo está em
> `.claude/rules/design-antipatterns.md`.

---

## 1. Hierarquia visual

Toda tela responde a uma pergunta antes de qualquer outra: **o que o olho vê primeiro, segundo e
terceiro?** Se a resposta for "depende", não há hierarquia — há uma lista.

- Decida a ordem de leitura **antes** de escrever CSS, e escreva-a em uma frase. Se não couber em
  uma frase, a tela está fazendo duas coisas.
- Hierarquia se constrói com **quatro alavancas**: tamanho, peso, cor/contraste e espaço. Use duas
  ou três com convicção; usar as quatro em tudo achata de volta ao nada.
- **Espaço é a alavanca mais barata e a menos usada.** Agrupar por proximidade resolve o que caixas,
  bordas e sombras tentam resolver por decoração.
- O elemento mais importante ganha **um** tratamento diferenciado, não todos.
- Nem todo texto precisa competir: rebaixar o secundário é tão hierárquico quanto destacar o
  primário, e costuma custar menos.
- Contêiner (card, painel, borda) não é hierarquia. Só use quando a elevação comunica uma diferença
  real de camada — caso contrário, agrupe com espaço, um divisor fino ou tipografia.

## 2. Sistema tipográfico

Tipografia é a maior superfície da tela. Ela é o principal lugar onde a "voz default de LLM"
aparece — e o mais barato de consertar.

- **Papéis antes de tamanhos.** Defina os papéis que o produto realmente tem (display, título de
  seção, corpo, apoio, rótulo, dado numérico) e dê um token a cada um. Componente novo escolhe um
  papel existente; não inventa um tamanho.
- **Escala, não valores soltos.** Uma escala com poucos passos e razão perceptível (≈1,2–1,33 entre
  passos). Escala com dez passos quase iguais é a mesma coisa que nenhuma escala.
- **Contraste de peso é obrigatório.** Um sistema saudável tem um par distante — algo como **200 e
  800**, ou 300 e 700. Uma tela inteira em 400/500 é o sintoma tipográfico número um de interface
  gerada sem decisão: tudo tem o mesmo volume de voz.
- **Uma família, duas no máximo**, e a segunda só com papel declarado (ex.: mono só para dado,
  código ou medida — nunca como fantasia de "técnico").
- **Medida de linha entre 45 e 75 caracteres.** Acima disso o olho perde a linha de volta; abaixo,
  o texto vira serrote.
- Entrelinha inversamente proporcional ao tamanho: título grande respira pouco, corpo respira mais.
- `letter-spacing` negativo é ajuste ótico de display, não efeito. Passar de -0,04em destrói a
  forma das letras.
- Rode **o texto real** em todos os breakpoints. Título que só funciona com o lorem que você
  escolheu não funciona.

## 3. Sistema de espaçamento

Espaçamento é a gramática invisível. Quando ela é consistente, ninguém percebe; quando não é, tudo
parece ligeiramente errado sem que se saiba dizer por quê.

- **Uma escala, derivada de uma base** (tipicamente 4px ou 8px). Todo valor de gap, padding e
  margin sai dela. Número mágico no meio do componente é dívida.
- **Ritmo, não uniformidade.** O mesmo valor entre tudo não é sistema — é ausência de decisão.
  Itens relacionados ficam **apertados**; grupos diferentes ficam **generosamente separados**. A
  distância entre blocos deve ser visivelmente maior que a distância dentro do bloco.
- **Mais espaço acima de um título do que abaixo dele.** Um título pertence ao que vem depois.
- Ritmo vertical: seções da mesma página usam o mesmo intervalo de respiro. Uma seção com metade do
  padding das vizinhas lê como bug, não como ênfase.
- Espaço interno de um componente escala com sua densidade (ver §7), não com o gosto do momento.

## 4. Cor semântica

**Papel antes de matiz.** A pergunta certa nunca é "que azul?", é "o que esta cor *significa*?".

- Nomeie por função — `superficie`, `superficie-elevada`, `texto`, `texto-suave`, `borda`,
  `acento`, `perigo`, `sucesso` —, nunca por aparência (`azul-500`, `cinza-claro`). Trocar a
  identidade do produto deve ser trocar o valor por trás do token, não caçar hex no código.
- **Um acento.** Um produto com três cores de destaque não tem destaque. Estado semântico
  (erro, sucesso, aviso) é exceção declarada, não um segundo acento.
- **Neutros não são cinza puro.** Neutros com uma pitada da temperatura do acento amarram a paleta;
  `#000` e cinzas 100% dessaturados são o default de quem não escolheu.
- Texto secundário sobre superfície colorida sai **da própria cor da superfície** (mais escura ou
  mais clara), não de um cinza neutro — cinza sobre cor sempre parece sujo.
- Cor nunca é o único portador de informação. Estado precisa de forma, ícone ou texto junto.
- **Tema é decisão de contexto de uso**, não de identidade. Onde o produto é olhado, sob que luz,
  por quanto tempo. Escuro por default porque "parece premium" é reflexo, não decisão.

## 5. Composição e grid

- **CSS Grid primeiro.** Ele é a ferramenta para *layout de duas dimensões*: colunas, linhas,
  áreas. Flex é para *uma* dimensão — uma fileira de controles, uma pilha.
- **Flex aninhado com aritmética de porcentagem é um cheiro.** `calc(33% - 1rem)` dentro de flex
  dentro de flex é sempre um grid mal declarado.
- Estruture por **áreas nomeadas** quando o layout tem regiões estáveis; o nome documenta a
  intenção melhor que qualquer comentário.
- Responsividade não é "quebrar em 768px": é declarar como cada região se comporta quando o espaço
  muda. Prefira o layout que se adapta sozinho (`minmax`, `auto-fit`, `clamp`) e reserve breakpoint
  para mudanças **de composição**, não de tamanho.
- Toda composição multi-coluna declara explicitamente o seu colapso no mobile, no mesmo lugar em
  que foi definida.
- **Repetição de família de layout é o que faz uma página parecer template.** Se duas seções
  seguidas usam a mesma estrutura, a segunda precisa de um motivo. Três, e a página vira fôrma.
- Unidades de viewport: use as dinâmicas (`dvh`/`dvi`) para superfícies de altura total. As
  estáticas (`vh`) pulam quando a barra do navegador móvel entra e sai.

## 6. Estados como design

Interface não é uma foto do caso feliz. **Todo componente que carrega dado tem cinco estados**, e
todos eles são design — não tratamento de exceção.

| Estado | O que precisa acontecer |
| --- | --- |
| **Vazio** | Explica por que está vazio e qual é a próxima ação. Nunca uma caixa em branco. |
| **Carregando** | Esqueleto com a **forma do resultado final**, para o layout não pular. Spinner genérico é o último recurso. |
| **Erro** | Nomeia o problema *e* a saída, no lugar onde o erro acontece. |
| **Overflow** | Nome longo, 300 itens, texto de 4 linhas onde cabia 1. Teste com o pior conteúdo plausível, não com o melhor. |
| **Offline / degradado** | Diz o que ainda funciona, o que não funciona e o que acontece com o que o usuário já digitou. |

Complementos que valem o mesmo:
- **Foco de teclado é um estado visível**, sempre. Remover `outline` sem substituir é um defeito.
- Estados de interação (hover, active, disabled, selecionado) fazem parte do componente desde o
  primeiro commit, não de um "polimento" depois.
- Superfícies que o navegador desenha por você — seleção de texto, cursor, barra de rolagem, anel
  de foco, sublinhado de link — também são o seu design. Deixá-las no default é a diferença mais
  barata entre uma tela construída e uma tela montada.

## 7. Densidade por contexto

Não existe densidade certa em abstrato; existe densidade certa **para o que a pessoa está fazendo**.

- **Tarefa de leitura ou de decisão emocional** (uma página de produto, a prévia de um presente):
  baixa densidade, tipografia grande, muito respiro. O tempo é do usuário.
- **Tarefa de operação repetida** (uma tabela, um painel interno, uma lista de pedidos): alta
  densidade. Ali, respiro demais é hostil — obriga a rolar para ver o que deveria caber junto.
- **Formulário e fluxo guiado**: densidade média, com agrupamento forte. Um passo por vez,
  espaçamento que deixa óbvio o que pertence a quê.
- A escolha se aplica à tela inteira e é **explícita**: densidade que muda de seção para seção lê
  como inconsistência.
- Toque e mira: alvo mínimo confortável no mobile mesmo em layout denso. Densidade nunca justifica
  alvo de 20px.

## 8. Motion com propósito

Animação tem que responder **"o que isto comunica?"** em uma frase. As respostas válidas são
quatro: hierarquia, continuidade espacial, feedback de ação, e transição de estado. "Ficou legal"
não é uma delas.

- **Um momento autoral por tela**, não efeito espalhado. Trinta micro-animações iguais não somam;
  cancelam.
- Curva: desaceleração exponencial (`ease-out`). *Bounce* e *elastic* como default são datados —
  objetos reais desaceleram, não quicam.
- Duração curta: transições de UI vivem entre ~120ms e ~300ms. Acima disso, o usuário espera a
  interface em vez de usá-la.
- Anime **`transform` e `opacity`**. Animar `width`, `height`, `top`, `margin` ou `padding` causa
  recálculo de layout e engasgo.
- **Conteúdo nasce visível.** Animação de entrada *realça* a chegada; nunca é o que decide se o
  texto existe. Se o JS falhar, a página precisa continuar legível.
- **`prefers-reduced-motion` é obrigatório e não negociável.** Loop infinito, parallax e revelação
  por scroll colapsam para o estado final estático. Isso não é acessibilidade opcional: é a
  diferença entre uma animação e uma tontura.

## 9. Copy como material de design

Texto não é o que se coloca depois que o layout ficou pronto. É a matéria-prima do layout.

- **A voz é a do usuário, não a do sistema.** O produto fala das coisas com as palavras que a
  pessoa usaria para falar delas.
- **Controle nomeia a ação que executa.** "Gerar prévia" > "Continuar" > "OK".
- **Erro nomeia o problema e a saída.** "A foto tem 12 MB; o limite é 8 MB. Escolha outra ou
  reduza." > "Erro ao enviar arquivo." > "Algo deu errado."
- **Nunca lorem ipsum.** Nem placeholder poético ("Your Journey Starts Here", "Bem-vindo à sua
  jornada"). Texto falso esconde exatamente os problemas que o texto real revela: comprimento,
  quebra, tom, hierarquia. Se o texto final não existe, escreva o texto plausível mais próximo e
  marque-o.
- **Sem buzzword.** "Revolucione", "potencialize", "experiência única", "next-gen" são ruído com
  formato de frase. Verbo concreto e substantivo concreto.
- Dado de exemplo é plausível e específico, nunca redondo demais nem genérico demais
  ("99,9%", "João Silva", "Acme").
- **Um registro por produto.** Não misture prosa editorial, punch de marketing e jargão técnico na
  mesma tela sem que a marca peça isso.
- Antes de dar por pronta uma tela, releia **todas** as strings visíveis, inclusive `alt`,
  `placeholder`, rótulos e mensagens de erro. Frase que você não conseguiria defender em voz alta
  vira frase funcional simples.

## 10. Acessibilidade by design

Acessibilidade não entra no fim. Ela é uma restrição de entrada, do mesmo tipo que "isto precisa
caber em 375px de largura".

- **HTML semântico primeiro.** `button` é `button`; `div` com `onclick` é um defeito com aparência
  de componente. Landmarks (`header`, `nav`, `main`, `footer`) presentes e únicos onde devem ser.
- **Ordem de heading sem buracos.** A estrutura de títulos é a estrutura do documento; ela é a
  navegação de quem usa leitor de tela.
- **Contraste WCAG AA como piso**: 4,5:1 para texto de corpo, 3:1 para texto grande e para os
  limites de componentes de interface. Placeholder, texto de ajuda e texto de erro contam.
- **Tudo alcançável pelo teclado**, na ordem visual, com foco visível em cada parada.
- Rótulo real em campo de formulário, **acima** do campo. `placeholder` não é rótulo — some quando
  a pessoa digita, justo quando ela precisa conferir.
- `alt` descreve a função da imagem no contexto; imagem decorativa recebe `alt=""` e sai da árvore.
- Movimento, transparência e contraste respeitam as preferências do sistema
  (`prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`).
- Zoom até 200% sem perda de conteúdo ou de função.

---

## Referências canônicas

Leituras de referência para quem for aprofundar. **Citadas, não reproduzidas** — o conteúdo deste
documento é nosso e nossos são os termos; nenhum trecho dessas obras está copiado aqui.

- **Refactoring UI** — Adam Wathan e Steve Schoger. Hierarquia por peso e cor, escalas discretas em
  vez de valores contínuos, espaço como ferramenta primária.
- **Every Layout** — Heydon Pickering e Andy Bell. Primitivas de layout que se adaptam sozinhas, em
  vez de breakpoints que enumeram tamanhos de tela.
- **CUBE CSS** — Andy Bell. Composição, utilitários, blocos e exceções: uma forma de organizar CSS
  que aproveita a cascata em vez de lutar contra ela.
