# DESIGN.md — template

> **O que é isto.** O molde do `DESIGN.md` que **todo projeto da fábrica preenche na Fundação**
> (D-078, §1 e §2). Este arquivo é o *template*: ele não vale para nenhum projeto por si só. O que
> vale é a cópia preenchida e aprovada que mora na raiz de cada projeto como `DESIGN.md`.
>
> **Como usar.** Copie este arquivo para `DESIGN.md`, preencha campo a campo e **apague as linhas
> de instrução**. Convenção deste template:
>
> - `<!-- COMO PREENCHER: … -->` — a instrução. **Sai** do arquivo preenchido.
> - `> _Exemplo:_ …` — mostra o **tipo** de resposta esperada, não a resposta. **Sai** também.
> - `[A PREENCHER]` — campo obrigatório ainda vazio. Um `DESIGN.md` com qualquer `[A PREENCHER]`
>   restante **não é candidato a aprovação**.
>
> **Nada é opcional.** Se um campo não se aplica ao projeto, escreva `Não se aplica —` seguido do
> motivo. Campo apagado é campo esquecido; campo com motivo é decisão.

---

## As três regras deste documento

Estas três valem no `DESIGN.md` de qualquer projeto e vêm coladas na cópia. **Não apague esta
seção ao preencher.**

1. **Todo agente que toca UI relê este arquivo no início da tarefa.** Antes de escrever a primeira
   linha de markup ou CSS, não depois. Trabalho de UI que não abriu o `DESIGN.md` é trabalho a
   refazer, não trabalho a revisar (D-078, §2).
2. **Este arquivo vence qualquer skill.** Skill de direção estética, skill de mecânica de
   componentes, heurística de biblioteca: em conflito, ganha o `DESIGN.md`, sem "mas a skill
   recomenda". A ordem completa de autoridade está em `docs/design/SKILL-ROUTER.md` — *brief
   explícito do dono → `DESIGN.md` → conceitos absorvidos no core → skill de direção → skill de
   mecânica*.
3. **Alterar este arquivo depois de aprovado = novo Decision Gate.** A Fundação **propõe**; o dono
   **aprova** (D-078, §9). Depois disso a Construção roda autônoma *derivando* daqui. Se a decisão
   registrada estiver errada, o caminho é abrir gate para mudá-la — nunca desviar em silêncio
   dentro de uma tarefa. Toda alteração aprovada deixa rastro na **Memória de design** (§15).

E dois pisos que este arquivo **não** pode rebaixar, porque são do core e valem sempre
(D-078, §4): `docs/design/CRAFT-PRINCIPLES.md` e `.claude/rules/design-antipatterns.md`. O
`DESIGN.md` decide o *gosto*; ele não mexe no *piso*.

---

## 0. Cabeçalho

<!-- COMO PREENCHER: o estado formal do documento. Enquanto for "candidato", nenhum código de UI
     pode ser derivado dele. "aprovado" exige data e o identificador do gate que aprovou. -->

| Campo | Valor |
| --- | --- |
| **Status** | `[A PREENCHER]` — `candidato` \| `aprovado` |
| **Data** | `[A PREENCHER]` — data do status atual (AAAA-MM-DD) |
| **Gate** | `[A PREENCHER]` — identificador do Decision Gate que aprovou (vazio enquanto candidato) |
| **Categoria de interface** | `[A PREENCHER]` |
| **Perfil de stack** | `[A PREENCHER]` |
| **Skill de direção ativa** | `frontend-design` |

> _Exemplo:_ `aprovado` · `2026-09-04` · `D-0xx` · `fluxo guiado + site de produto` ·
> `SvelteKit + TypeScript, CSS com escopo de componente, sem biblioteca de UI` · `frontend-design`.

<!-- COMO PREENCHER (categoria de interface): escolha uma primária e, no máximo, uma secundária.
     A categoria é o que decide a densidade em §7 e o peso do motion em §4. Vocabulário:
     site de produto/marketing · e-commerce e checkout · fluxo guiado (formulário multi-etapa) ·
     painel operacional/dashboard · ferramenta de criação · superfície de leitura · outra (nomeie). -->

<!-- COMO PREENCHER (perfil de stack): framework, linguagem, estratégia de CSS e se há biblioteca
     de componentes. É o campo que o SKILL-ROUTER lê para decidir se shadcn ou SkillUI podem entrar
     na Construção — mecânica de componentes é POR PERFIL, nunca por gosto (D-078, §4). -->

<!-- COMO PREENCHER (skill de direção ativa): `frontend-design` é o DEFAULT e deve ficar assim a
     menos que o projeto tenha optado explicitamente por outra. NO MÁXIMO UMA — duas direções
     ativas não somam, produzem uma tela que não é nenhuma das duas (SKILL-ROUTER, regra 1). -->

---

## 1. Direção visual

<!-- COMO PREENCHER: dê à direção um NOME PRÓPRIO — duas ou três palavras que evocam um mundo
     concreto, com lastro no produto e no público. O nome é o teste: se ele serviria para qualquer
     outro produto da mesma categoria, não é uma direção, é um adjetivo. "Moderno", "clean",
     "minimalista", "elegante" e "premium" estão PROIBIDOS aqui — não descrevem nada e são
     exatamente o default inconsciente que a camada de design existe para evitar. -->

**Nome:** `[A PREENCHER]`

> _Exemplo:_ **Arquivo de Família** · **Oficina de Bairro** · **Caderno de Campo** · **Sala de Espera**.

<!-- COMO PREENCHER: exatamente três frases, e cada uma ancora em algo que existe fora do design —
     quem é o público (§8 do PRODUCT.md), o que o produto promete, ou o contexto de uso. Frase que
     só fala de aparência ("dá um ar sofisticado") não conta; reescreva ligando ao produto. -->

**Por quê (3 frases):**

1. `[A PREENCHER]`
2. `[A PREENCHER]`
3. `[A PREENCHER]`

> _Exemplo (uma delas):_ "Quem compra está guardando uma memória, não comprando um serviço — a
> interface precisa parecer um lugar onde memória se guarda, não um checkout."

---

## 2. Referências e anti-referências

<!-- COMO PREENCHER: produtos, sites ou objetos REAIS e nomeáveis, nunca categorias. O formato é
     "como X faz Y" — o nome sozinho é inútil porque não diz o que se está copiando. Mínimo 2 de
     cada. As anti-referências são tão obrigatórias quanto as referências: elas é que fecham a
     porta que a direção quer fechar. Se algo tem link público, coloque em design/assets/references.md
     e cite aqui (ver docs/design/BRAND-ASSETS.md). -->

**Referências — mínimo 2:**

| Referência | O que exatamente se toma dela |
| --- | --- |
| `[A PREENCHER]` | `[A PREENCHER]` |
| `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ "como o site de uma editora independente trata a ficha técnica: dado denso em corpo
> pequeno, sem caixa nem card em volta."

**Anti-referências — mínimo 2:**

| Anti-referência | O que exatamente se recusa |
| --- | --- |
| `[A PREENCHER]` | `[A PREENCHER]` |
| `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ "nunca como um painel de SaaS: hero centrado com dois botões e três cards iguais
> logo abaixo."

---

## 3. Assinatura visual

<!-- COMO PREENCHER: UM elemento — um só — que faz alguém reconhecer o produto num screenshot com
     o logo recortado. Precisa ser reproduzível por outro agente sem ver a tela original, então
     descreva a mecânica, não a impressão. Um teste: se a assinatura sumisse, o produto ficaria
     igual a qualquer outro da categoria? Se não ficaria, ela é assinatura. -->

**A assinatura:** `[A PREENCHER]`

**Onde aparece:** `[A PREENCHER]`
**Onde NÃO aparece:** `[A PREENCHER]`

> _Exemplo:_ "Toda superfície que guarda algo do usuário tem a borda inferior mais grossa que as
> outras três, como a aba de uma pasta. Aparece em card de item salvo e no contêiner da prévia;
> não aparece em botão, campo nem barra de navegação."

---

## 4. Tokens semânticos

<!-- COMO PREENCHER: esta seção é A PONTE (D-078, §6). É o que a Construção lê para derivar valores
     em vez de inventá-los, e é o que torna a identidade portável entre frameworks. Regra de ouro
     do CRAFT-PRINCIPLES §4: o nome diz o PAPEL, nunca a aparência — `surface`, não `cinza-100`.
     O idioma do nome é escolha do projeto (`surface` ou `superficie`); o que não se admite é nome
     por matiz. Valor literal de cor, tamanho ou raio dentro de componente é achado de lint
     (anti-patterns 30 e 44). -->

### 4.1 Cor por papel

<!-- COMO PREENCHER: preencha TODOS os papéis. `—` só com motivo escrito na coluna de observação.
     A coluna de contraste não é decorativa: o piso WCAG AA (4,5:1 corpo / 3:1 texto grande e
     limites de componente) é verificado aqui, não descoberto no critic. Se o produto tem tema
     escuro, a tabela ganha uma coluna a mais — e o tema escuro é decisão de contexto de uso,
     não de identidade (CRAFT §4). -->

| Token | Papel | Valor | Contraste verificado |
| --- | --- | --- | --- |
| `surface` | fundo base do produto | `[A PREENCHER]` | — |
| `surface-raised` | superfície acima da base (só onde há camada real) | `[A PREENCHER]` | — |
| `foreground` | texto e ícone primários | `[A PREENCHER]` | `[A PREENCHER]` sobre `surface` |
| `muted` | texto e ícone secundários, rebaixados de propósito | `[A PREENCHER]` | `[A PREENCHER]` sobre `surface` |
| `accent` | **o único** acento do produto | `[A PREENCHER]` | `[A PREENCHER]` |
| `destructive` | ação destrutiva e erro | `[A PREENCHER]` | `[A PREENCHER]` |
| `success` | confirmação, conclusão | `[A PREENCHER]` | `[A PREENCHER]` |
| `warning` | atenção sem bloqueio | `[A PREENCHER]` | `[A PREENCHER]` |
| `border` | limite entre superfícies | `[A PREENCHER]` | `[A PREENCHER]` |
| `focus` | anel de foco de teclado | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo de linha:_ `accent` · o único acento · `#7A3E2B` (terracota queimado) · 5,9:1 sobre `surface`.

**Um acento só.** `[A PREENCHER]` — nomeie o acento e diga o que ele significa quando aparece.
Estado semântico (`destructive`/`success`/`warning`) é exceção declarada, não um segundo acento.

**Temperatura dos neutros:** `[A PREENCHER]` — de qual matiz os neutros puxam. Cinza 100%
dessaturado e `#000` são default de quem não escolheu (anti-patterns 28 e 29).

### 4.2 Escala de espaçamento

<!-- COMO PREENCHER: uma base (4px ou 8px) e a escala inteira derivada dela. Todo gap, padding e
     margin do produto sai daqui; número mágico no componente é dívida (CRAFT §3). -->

**Base:** `[A PREENCHER]`

| Token | Valor | Uso típico |
| --- | --- | --- |
| `space-3xs` … `space-3xl` | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ base 4px · `space-xs 8px` (dentro de um grupo) · `space-lg 32px` (entre grupos) ·
> `space-3xl 96px` (entre seções da página).

**Regra de ritmo do projeto:** `[A PREENCHER]` — qual passo separa itens do mesmo grupo e qual
separa grupos diferentes. Espaçamento monótono é achado (anti-pattern 9).

### 4.3 Raio

| Token | Valor | Onde se aplica |
| --- | --- | --- |
| `radius-sm` / `radius-md` / `radius-lg` / `radius-full` | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ `radius-sm 2px` em campo e botão; `radius-lg 6px` em contêiner de conteúdo;
> `radius-full` só em avatar.

<!-- Raio ≥ 24px uniforme em tudo, do botão ao contêiner, é anti-pattern 18. Diferenciar por papel
     é o que impede que o produto vire um monte de retângulos arredondados iguais. -->

### 4.4 Elevação

<!-- COMO PREENCHER: elevação só existe onde há CAMADA REAL — algo que flutua acima de outra coisa.
     Sombra como decoração, sombra multicamada e glow de offset zero são achados (15, 16). Borda
     hairline E sombra difusa no mesmo elemento: escolha uma (17). Um produto totalmente plano é
     uma resposta válida — escreva "sem elevação" e diga como as camadas se distinguem. -->

| Token | Valor | Quando é legítimo usar |
| --- | --- | --- |
| `elevation-0` … `elevation-2` | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ `elevation-1` = `0 1px 2px rgba(60,40,30,.12)`, só em superfície que o usuário pode
> mover ou fechar (menu, diálogo). Card em fluxo normal fica em `elevation-0`.

### 4.5 Papéis tipográficos

<!-- COMO PREENCHER: papéis ANTES de tamanhos (CRAFT §2). Componente novo escolhe um papel que já
     existe; não inventa tamanho. Os valores numéricos da escala vão na §5 — aqui é a lista de
     papéis e o peso de cada um. -->

| Papel | Onde se usa | Família | Peso |
| --- | --- | --- | --- |
| `display` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` |
| `heading` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` |
| `body` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` |
| `caption` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` |

**Famílias:** `[A PREENCHER]` — uma, duas no máximo, e a segunda **com papel declarado**.
Inter, Roboto e a fonte de sistema como voz do produto são achado (anti-pattern 36).

### 4.6 Motion

<!-- COMO PREENCHER: durações e curvas NOMEADAS, mais a frase que cada uma comunica. Motion sem
     resposta para "o que isto comunica?" não entra (CRAFT §8). Curvas com overshoot (bounce,
     elastic) como default são achado (47). O bloco prefers-reduced-motion não é um token — é
     obrigação, e a ausência dele onde há animação é achado (49). -->

| Token | Valor | O que comunica |
| --- | --- | --- |
| `duration-instant` / `duration-base` / `duration-deliberate` | `[A PREENCHER]` | `[A PREENCHER]` |
| `ease-out` / `ease-in-out` (nomeie os seus) | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ `duration-base 180ms` + `ease-saida cubic-bezier(.2,.8,.2,1)` — feedback de ação; o
> controle confirma que ouviu.

**O momento autoral do produto:** `[A PREENCHER]` — o **um** movimento que vale a pena por tela
(CRAFT §8). **Comportamento sob `prefers-reduced-motion`:** `[A PREENCHER]`.

---

## 5. Escala tipográfica

<!-- COMO PREENCHER: poucos passos, razão perceptível (≈1,2–1,33). Escreva a RAZÃO escolhida — é
     ela que permite estender a escala depois sem chutar. Razão abaixo de ~1,2 entre vizinhos é
     achado (38): dez passos quase iguais equivalem a nenhuma escala. Corpo abaixo de 16px e
     texto de UI abaixo de 14px também são achado (41). -->

**Razão:** `[A PREENCHER]`

| Passo | Tamanho | Entrelinha | Papel que o usa |
| --- | --- | --- | --- |
| `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo de linha:_ `text-2xl` · 30px · 1,15 · `heading` de seção.

<!-- COMO PREENCHER: entrelinha inversamente proporcional ao tamanho — título grande respira pouco,
     corpo respira mais. E declare a MEDIDA DE LINHA do corpo: fora de 45–75 caracteres é achado (40). -->

**Medida de linha do corpo:** `[A PREENCHER]` caracteres.

### Pares de peso

<!-- COMO PREENCHER: contraste de peso é OBRIGATÓRIO. Um sistema saudável tem um par distante
     (200/800, 300/700 ou equivalente). Tela inteira em 400/500 é o sintoma número um de interface
     gerada sem decisão (anti-pattern 37) — todo texto com o mesmo volume de voz. -->

| Par | Pesos | Onde o contraste aparece |
| --- | --- | --- |
| Par principal | `[A PREENCHER]` | `[A PREENCHER]` |
| Par de apoio | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ 300 / 700 — o `display` em 300 contra o rótulo de dado em 700, na mesma linha da prévia.

---

## 6. Grid e conceito de layout

<!-- COMO PREENCHER: CSS Grid primeiro; flex é para uma dimensão (CRAFT §5). Declare colunas,
     medianiz, largura máxima de conteúdo e as áreas nomeadas estáveis. Aritmética de porcentagem
     dentro de flex é sempre um grid mal declarado (anti-pattern 7). -->

**Grid:** `[A PREENCHER]` — colunas, medianiz, largura máxima, margem externa.
**Conceito de layout em uma frase:** `[A PREENCHER]`

> _Exemplo:_ 12 colunas em 1280 / 6 em 768 / 4 em 375, medianiz 24px, conteúdo de leitura travado
> em 68ch. Conceito: "uma coluna de leitura ao centro, com as ferramentas encostadas na margem".

### Wireframes ASCII das telas-chave

<!-- COMO PREENCHER: um bloco por tela-chave do produto — as telas que carregam a promessa, não
     todas. O wireframe declara a ORDEM DE LEITURA (o que o olho vê primeiro, segundo, terceiro:
     CRAFT §1) e o esqueleto de regiões. Não é mockup: sem cor, sem tipo, sem sombra.
     Repita o bloco quantas telas-chave o produto tiver. -->

**Tela:** `[A PREENCHER]`
**Ordem de leitura, em uma frase:** `[A PREENCHER]`

```
┌──────────────────────────────────────────────┐
│ [A PREENCHER — região 1]                     │
├───────────────────────────┬──────────────────┤
│ [A PREENCHER — região 2]  │ [região 3]       │
│                           │                  │
├───────────────────────────┴──────────────────┤
│ [A PREENCHER — região 4]                     │
└──────────────────────────────────────────────┘
```

**Colapso desta composição no mobile:** `[A PREENCHER]`

<!-- Declarar o colapso AQUI, junto do layout multi-coluna, é obrigatório: colapso não declarado no
     mesmo lugar em que a composição foi definida é achado (anti-pattern 13). -->

---

## 7. Iconografia · Ilustração e foto · Densidade

### 7.1 Iconografia

<!-- COMO PREENCHER: UMA família, com espessura de traço única. Famílias misturadas ou espessuras
     inconsistentes são achado (21); emoji no lugar de ícone também (20). Se o produto não usa
     ícones, escreva isso — é uma decisão legítima e forte. -->

**Família:** `[A PREENCHER]` · **Espessura:** `[A PREENCHER]` · **Tamanhos permitidos:** `[A PREENCHER]`
**Quando um ícone é permitido:** `[A PREENCHER]` — e se ele pode aparecer sem rótulo.

> _Exemplo:_ família única de traço 1,5px, tamanhos 16/20/24; ícone nunca aparece sozinho em
> controle de ação primária — sempre acompanha o rótulo.

### 7.2 Ilustração e foto

<!-- COMO PREENCHER: a política de imagem. De onde vem, que tratamento recebe, o que NUNCA entra.
     Se o produto exibe conteúdo visual do usuário, diga como ele se distingue da moldura do
     produto. SVG montado à mão imitando ilustração ou cena, e screenshot falso feito de divs,
     são achado (24, 25). -->

**Origem:** `[A PREENCHER]` · **Tratamento:** `[A PREENCHER]` · **Proibido:** `[A PREENCHER]`

### 7.3 Densidade

<!-- COMO PREENCHER: densidade é escolhida pela TAREFA, não pelo gosto (CRAFT §7) — leitura e
     decisão emocional pedem baixa densidade; operação repetida pede alta; formulário pede média
     com agrupamento forte. Vale para a tela inteira: densidade que muda de seção para seção lê
     como inconsistência. E nenhuma densidade justifica alvo de toque pequeno no mobile. -->

**Densidade escolhida:** `[A PREENCHER]` · **Por qual tarefa:** `[A PREENCHER]`
**Alvo mínimo de toque no mobile:** `[A PREENCHER]`

---

## 8. Filosofia de componentes

<!-- COMO PREENCHER: a linha entre o que o projeto POSSUI (código nosso, que carrega a identidade e
     a assinatura da §3) e o que é PRIMITIVO de biblioteca (mecânica de acessibilidade e
     comportamento que não se reescreve à toa). Component library ≠ design system ≠ identidade
     (D-078, §6): se a tela pronta é reconhecível como "uma tela da biblioteca X", a mecânica
     venceu a identidade, e isso é o defeito. Componente entregue em estado default da biblioteca
     é achado, não entrega (SKILL-ROUTER). -->

**Possuído pelo projeto:** `[A PREENCHER]`
**Primitivo de biblioteca:** `[A PREENCHER]` — e qual biblioteca, coerente com o perfil de stack da §0.
**Regra de customização obrigatória:** `[A PREENCHER]` — o que todo primitivo importado precisa
receber antes de entrar numa tela.

> _Exemplo:_ possuímos tudo que o usuário associa ao produto (contêiner de prévia, cartão de item,
> passo do fluxo); importamos apenas primitivas de comportamento acessível (diálogo, popover,
> combobox). Todo primitivo importado recebe, no mínimo, tokens de cor, raio e tipografia daqui.

---

## 9. Tom de copy

<!-- COMO PREENCHER: copy é material de design, não legenda colocada depois do layout pronto
     (CRAFT §9). Esta seção é normativa para quem escreve strings de interface — inclusive alt,
     placeholder, rótulo e mensagem de erro. -->

**Voz em uma frase:** `[A PREENCHER]`
**Pessoa e tratamento:** `[A PREENCHER]` — 1ª ou 2ª pessoa, singular ou plural, "você" ou "vocês".
**Registro:** `[A PREENCHER]` — um só por produto.

**Como se nomeia um controle:** `[A PREENCHER]`
> _Exemplo:_ o rótulo nomeia a ação que executa — "Gerar prévia", nunca "Continuar" nem "OK".

**Como se escreve um erro:** `[A PREENCHER]`
> _Exemplo:_ nomeia o problema e a saída, no lugar onde o erro acontece — "A foto tem 12 MB; o
> limite é 8 MB. Escolha outra ou reduza."

**O que este produto NUNCA diz:**

| Nunca | Por quê |
| --- | --- |
| `[A PREENCHER]` | `[A PREENCHER]` |
| `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo:_ nada de "jornada", "experiência única" nem "revolucione" (anti-patterns 61 e 63);
> nada de exclamação em confirmação de compra — o produto não comemora pelo usuário.

---

## 10. Responsividade projetada

<!-- COMO PREENCHER: declare o que MUDA DE INTENÇÃO em cada breakpoint, não o que acontece por
     consequência de o espaço encolher. "Os cards viram uma coluna" é consequência. "No 375 a
     prévia sobe acima do formulário, porque no celular a pessoa quer ver o resultado antes de
     continuar" é projeto. Os três larguras são as do Visual Verification Loop (D-078, §7) e é
     nelas que o design-critic vai olhar. Prefira layout que se adapta sozinho (minmax, auto-fit,
     clamp) e reserve breakpoint para mudança de COMPOSIÇÃO (CRAFT §5). -->

| Largura | O que muda de intenção | Por quê |
| --- | --- | --- |
| **375** | `[A PREENCHER]` | `[A PREENCHER]` |
| **768** | `[A PREENCHER]` | `[A PREENCHER]` |
| **1280** | `[A PREENCHER]` | `[A PREENCHER]` |

**O que NÃO muda em nenhuma largura:** `[A PREENCHER]` — a assinatura da §3 sobrevive aos três?

---

## 11. Estados obrigatórios por componente-chave

<!-- COMO PREENCHER: uma linha por componente que carrega dado. Os cinco estados são design, não
     tratamento de exceção (CRAFT §6) — só o estado feliz implementado é achado (58). Preencha com
     o TEXTO E A FORMA de cada estado, não com "mostrar mensagem de erro". Overflow = o pior
     conteúdo plausível: nome longo, 300 itens, texto de 4 linhas onde cabia 1. -->

| Componente-chave | Vazio | Carregando | Erro | Overflow | Offline / degradado |
| --- | --- | --- | --- | --- | --- |
| `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` | `[A PREENCHER]` |

> _Exemplo de célula "carregando":_ esqueleto com a proporção exata do resultado, para o layout não
> pular — spinner genérico só onde a forma final é imprevisível (anti-pattern 59).

**Estados de interação:** `[A PREENCHER]` — hover, active, disabled, selecionado e **foco visível**
fazem parte do componente desde o primeiro commit. Remover `outline` sem substituir é defeito (55).

---

## 12. Acessibilidade

<!-- COMO PREENCHER: WCAG AA é o PISO da fábrica e não se registra aqui como conquista — está em
     CRAFT-PRINCIPLES §10 e vale sempre. O que se registra aqui é o que ESTE produto exige ALÉM do
     piso, por causa do público, do contexto de uso ou do conteúdo. Se não há nada além, escreva
     "apenas o piso" — mas pense antes: público mais velho, uso com uma mão, uso em luz forte,
     conteúdo emocional que não pode ser lido em voz alta por engano. -->

**Piso:** WCAG 2.2 AA (obrigatório, não negociável).

| Exigência além do piso | Por quê |
| --- | --- |
| `[A PREENCHER]` | `[A PREENCHER]` |

**Preferências de sistema respeitadas:** `[A PREENCHER]` — no mínimo `prefers-reduced-motion`.
**Zoom:** conteúdo e função preservados até 200%.

---

## 13. Regras de plataforma

<!-- COMO PREENCHER: quando o produto vive dentro das convenções de alguém — iOS, Android,
     extensão de navegador, e-mail, PWA instalável, superfície embarcada. Escreva quais convenções
     o produto SEGUE e quais ele quebra de propósito, com o motivo. Se o produto é web e só web,
     escreva "Não se aplica — web responsiva, sem plataforma hospedeira". -->

`[A PREENCHER]`

---

## 14. Proveniência (R-ASSETS)

<!-- COMO PREENCHER: para cada decisão registrada acima, de onde ela veio. É a exigência R-ASSETS
     do D-078 §6: o design system NASCE DOS ASSETS DE MARCA quando eles existem, e a proveniência
     fica registrada aqui. A convenção do diretório está em docs/design/BRAND-ASSETS.md — a
     Fundação LÊ design/assets/ ANTES de criar qualquer coisa; criação do zero só na ausência.
     Três origens possíveis:
       · derivada-de-asset      — extraída de um arquivo em design/assets/ (cite o arquivo)
       · criada-na-Fundação     — não havia asset; a Fundação propôs e o gate aprovou
       · herdada-de-DS-existente — vem de um design system que o projeto já adota (cite a fonte)
     Uma decisão "criada-na-Fundação" onde EXISTIA asset disponível é violação de R-ASSETS. -->

| Decisão | Seção | Origem | Fonte |
| --- | --- | --- | --- |
| `[A PREENCHER]` | `[A PREENCHER]` | `derivada-de-asset` \| `criada-na-Fundação` \| `herdada-de-DS-existente` | `[A PREENCHER]` |

> _Exemplo de linha:_ Paleta base · §4.1 · `derivada-de-asset` · `design/assets/palette.md` +
> `design/assets/logos/marca-principal.svg`.

**Assets lidos nesta Fundação:** `[A PREENCHER]` — a lista do que existia em `design/assets/` na
data da §0. Se o diretório estava vazio, escreva isso: é o que justifica as linhas
`criada-na-Fundação`.

---

## 15. Memória de design

<!-- COMO PREENCHER: seção APPEND-ONLY (D-078, §2). Registra o que foi TENTADO E REJEITADO — a
     alternativa, a data e o motivo. Existe para que a próxima tarefa, o próximo agente e a próxima
     rodada de crítica não reabram uma discussão já encerrada, nem "melhorem" o produto de volta
     para algo que já foi descartado por um motivo.
     Nunca edite nem apague uma entrada. Se uma decisão mudar, ACRESCENTE uma entrada nova dizendo
     que mudou, com o gate que autorizou (regra 3 do topo). Rejeição sem motivo escrito não conta —
     "não gostei" reabre sozinho na semana seguinte. -->

<!-- Formato de cada entrada:

### AAAA-MM-DD · [o que foi tentado]
**Rejeitado porque:** [motivo ligado ao produto, ao público ou a uma restrição concreta]
**Substituído por:** [o que ficou no lugar, com link para a seção acima]
**Origem:** [Fundação | crítica pós-render | brief do dono | gate DE-xxx]

-->

`[A PREENCHER — a primeira entrada é da própria Fundação: o que foi considerado e descartado ao
propor a direção da §1.]`
