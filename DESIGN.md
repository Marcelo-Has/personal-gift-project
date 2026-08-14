# DESIGN.md — Nossa História

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

| Campo | Valor |
| --- | --- |
| **Status** | `aprovado` |
| **Data** | 2026-08-13 |
| **Gate** | [D-080] — aprovado pelo dono em 2026-08-13 (gate "Identidade visual e narrativa", `docs/AUTONOMY.md` §2) |
| **Categoria de interface** | site de produto/marketing (primária) + fluxo guiado, formulário multi-etapa (secundária) |
| **Perfil de stack** | SvelteKit 2 + Svelte 5 + TypeScript, CSS com escopo de componente, **sem biblioteca de UI** |
| **Skill de direção ativa** | `frontend-design` |

---

## 1. Direção visual

**Nome:** **Tinta de Esferográfica**

**Por quê (3 frases):**

1. O que separa este produto de uma caneca com foto — a alternativa real que o comprador considera
   na mesma faixa de R$80–130 — não é a imagem, é **o texto escrito sobre aquelas duas pessoas**;
   logo o protagonista da tela é a palavra, não a galeria.
2. Quem compra é uma das duas pessoas do casal, sozinho e escondido, no celular, disposto a gastar
   cinco minutos: o mundo certo é o do **caderno em que se escreve depressa**, não o do convite
   cerimonioso que pede tempo e reverência que ele não tem.
3. A promessa é *"você já tem a história, nós só encadernamos"* — e a esferográfica é exatamente a
   ferramenta comum, barata e pessoal que sustenta essa frase; caligrafia dourada diria o contrário
   do preço e do gesto.

**O risco estético assumido (um só):** **paleta fria, sem nenhum creme, bege ou rosa, num produto
de presente afetivo** — o único acento é o azul de tinta de esferográfica. O calor da tela vem do
**conteúdo do casal**, nunca da moldura: a interface é o papel, e papel não é o sentimento. É a
escolha que um gerador cauteloso não faria (o default para "livro afetivo artesanal" é
creme + serifa itálica + terracota, que é literalmente o anti-pattern 35), e é ela que faz a foto do
casal ser a única coisa quente e saturada em qualquer tela do produto.

---

## 2. Referências e anti-referências

**Referências:**

| Referência | O que exatamente se toma dela |
| --- | --- |
| Caderno pautado escolar (Tilibra, Foroni) | Como a **régua de margem** divide a página: uma única linha fina define território sem caixa, sem card e sem sombra. É a origem direta da assinatura da §3. |
| Caderno de bolso Field Notes | Como a capa trata a informação: tipografia utilitária estreita e pesada, dado impresso direto no papel, zero ornamento — o objeto parece útil antes de parecer bonito. É a voz do sistema (Archivo 800). |
| Miolo de livro de bolso (Penguin Modern Classics) | Como a página de rosto trata o título: serifa de texto em corpo grande, **peso normal e caixa reta**, alinhada à esquerda — nunca itálico display. É a voz do livro (Lora). |

**Anti-referências:**

| Anti-referência | O que exatamente se recusa |
| --- | --- |
| Convite de casamento com caligrafia dourada | Recusa a serifa itálica display gigante (anti-pattern 45), o dourado e a superfície creme (35). O produto custa R$80–130 e é comprado no celular em cinco minutos: cerimônia aqui é mentira de preço. |
| Loja de presente personalizado de marketplace (Elo7, Shopee) | Recusa a grade de miniaturas com selo de desconto e a vitrine de variações. Aqui a prova é **um trecho impresso legível**, não a quantidade de fotos do produto. |
| Landing de SaaS | Recusa o hero centrado com badge + título + subtítulo + dois botões (anti-pattern 2) e os três cards idênticos logo abaixo (1). |
| Página de "memórias" com colagem de polaroids espalhadas e giradas | Recusa a foto tratada como enfeite — girada, sobreposta, com fita adesiva desenhada. A foto do casal é conteúdo, e conteúdo não se decora. |

---

## 3. Assinatura visual

**A assinatura:** **a régua de margem.** Uma linha vertical de **1px** em `border`, contínua do topo
ao rodapé de **toda** tela do produto, posicionada a `space-md` (24px) da borda esquerda da coluna
de conteúdo no 375 e a `space-2xl` (64px) a partir de 768. Ela não é decorativa: **ela separa as
duas vozes do produto.**

- **À direita da régua fica tudo que vem do casal** — o que o comprador escreveu, os nomes, as
  fotos, os trechos do livro. Sempre em **Lora**, a mesma fonte em que o livro é impresso.
- **À esquerda da régua fica tudo que o sistema diz** — rótulo, contagem de passo, ajuda, unidade,
  prazo, mensagem de erro. Sempre em **Archivo 800**, corpo 14.
- **Nenhum elemento cruza a régua.** No 375, onde não cabe uma coluna à esquerda, a voz do sistema
  sobe para imediatamente **acima** do bloco, alinhada à régua, mantendo a mesma família e o mesmo
  peso — a divisão continua legível, só muda de eixo.

**Onde aparece:** em toda tela do produto, **inclusive acima da primeira dobra** (é o que a torna
reconhecível com o logo recortado), e na imagem de compartilhamento (OG).

**Onde NÃO aparece:** dentro do PDF do livro e na prévia em tela cheia — ali só existe conteúdo do
casal, não há voz do sistema para separar, e uma linha sem esse trabalho vira enfeite. Também não
aparece dentro de controles (botão, campo, chip).

---

## 4. Tokens semânticos

### 4.1 Cor por papel

Todos os valores verificados nesta Fundação com a fórmula WCAG 2.x de luminância relativa.

| Token | Papel | Valor | Contraste verificado |
| --- | --- | --- | --- |
| `surface` | fundo base do produto (a mesa) | `#F2F4F7` | — |
| `surface-raised` | a folha: única camada real, onde vive o conteúdo do casal | `#FFFFFF` | 1,10:1 sobre `surface` — a folha se distingue por **elevação**, não por contraste de cor |
| `foreground` | texto e ícone primários | `#15181F` | **16,12:1** sobre `surface` · **17,76:1** sobre `surface-raised` |
| `muted` | texto e ícone secundários, rebaixados de propósito | `#565E70` | **5,90:1** sobre `surface` · **6,50:1** sobre `surface-raised` |
| `accent` | **o único** acento — a tinta | `#26397F` | **9,65:1** sobre `surface` · branco sobre ele: **10,64:1** |
| `destructive` | ação destrutiva e erro | `#A32118` | **6,84:1** sobre `surface` · branco sobre ele: **7,53:1** |
| `success` | confirmação, conclusão | `#1B6B4C` | **5,86:1** sobre `surface` · branco sobre ele: **6,45:1** |
| `warning` | atenção sem bloqueio | `#7A5310` | **6,20:1** sobre `surface` · branco sobre ele: **6,84:1** |
| `border` | limite de **componente** (campo, botão de contorno, a régua da §3) | `#7E8698` | **3,31:1** sobre `surface` · **3,65:1** sobre `surface-raised` — cumpre o piso de 3:1 para limites de componente |
| `border-subtle` | divisor **puramente decorativo** entre blocos de texto | `#D2D7E0` | 1,31:1 — **nunca** delimita controle nem carrega informação; existe só para não engrossar todo divisor até 3:1 |
| `focus` | anel de foco de teclado | `#15181F` | **16,12:1** sobre `surface`. Aplicado como `outline: 2px solid` + `outline-offset: 2px`, o anel encosta em `surface`, não no fundo do controle — por isso funciona também sobre `accent` (onde 1,67:1 seria insuficiente sem o offset). |

**Um acento só.** `accent` `#26397F` é **a tinta**. Ele aparece em exatamente três lugares: a ação
primária, o link dentro de texto corrido, e a marca do passo atual no fluxo. Quando ele aparece,
significa *"isto avança o livro"*. `destructive`/`success`/`warning` são estado semântico declarado,
não um segundo acento, e nunca são usados como cor de destaque.

**Temperatura dos neutros:** puxam do próprio acento — todos os neutros carregam uma pitada de azul
(`#F2F4F7`, `#15181F`, `#565E70` têm o canal azul acima dos outros dois). Nem `#000` nem cinza 100%
dessaturado entram em lugar nenhum (anti-patterns 28 e 29).

**Tema escuro:** **não existe.** Não é omissão: a identidade é papel, e papel iluminado por trás não
é papel. O contexto de uso que justificaria escuro (celular à noite, escondido) foi considerado e
descartado — ver §15. `prefers-color-scheme: dark` não altera a paleta; o que o produto respeita é
`prefers-contrast` (§12).

### 4.2 Escala de espaçamento

**Base:** 4px.

| Token | Valor | Uso típico |
| --- | --- | --- |
| `space-3xs` | 4px | entre rótulo e o campo que ele rotula |
| `space-2xs` | 8px | dentro de um par indivisível (ícone + rótulo) |
| `space-xs` | 12px | entre itens do **mesmo** grupo |
| `space-sm` | 16px | padding interno de controle (botão, campo) |
| `space-md` | 24px | padding interno da folha no 375; offset da régua no 375 |
| `space-lg` | 32px | entre **grupos diferentes** |
| `space-xl` | 48px | padding interno da folha a partir de 768 |
| `space-2xl` | 64px | entre seções da página no 375; offset da régua a partir de 768 |
| `space-3xl` | 96px | entre seções da página a partir de 768 |

**Regra de ritmo do projeto:** dentro de um grupo, no máximo `space-xs` (12px); entre grupos
diferentes, no mínimo `space-lg` (32px) — uma razão de **2,5×**, que é o que torna o agrupamento
visível sem borda nem card. Entre seções, `space-2xl`/`space-3xl`. E **mais espaço acima de um
título do que abaixo dele**: `space-lg` acima, `space-xs` abaixo, porque o título pertence ao que
vem depois.

### 4.3 Raio

| Token | Valor | Onde se aplica |
| --- | --- | --- |
| `radius-sm` | 2px | campo, botão, chip de escolha (estilo, tamanho, formato) |
| `radius-md` | 4px | a folha, contêiner de conteúdo, contêiner da prévia |
| `radius-lg` | **Não se aplica** — nenhuma superfície do produto pede raio grande: o mundo é papel, e papel tem canto reto. Raio ≥ 24px uniforme é anti-pattern 18 e aqui contradiz a direção. |
| `radius-full` | 999px | apenas no marcador de passo do fluxo e no avatar, se houver |

### 4.4 Elevação

| Token | Valor | Quando é legítimo usar |
| --- | --- | --- |
| `elevation-0` | `none` | **default de tudo** em fluxo normal. Card, seção e bloco de texto ficam aqui. |
| `elevation-1` | `0 1px 2px rgba(21, 24, 31, .10)` | **só na folha** (`surface-raised`) e no contêiner da prévia — a única camada real do produto: papel sobre a mesa. Estes elementos **não recebem borda** (regra dos anti-patterns 17). |
| `elevation-2` | `0 8px 24px rgba(21, 24, 31, .16)` | só em superfície que o usuário pode fechar: diálogo e folha de ação do mobile. |

Sombra multicamada, halo colorido de offset zero e sombra decorativa não existem neste produto
(anti-patterns 15 e 16).

### 4.5 Papéis tipográficos

| Papel | Onde se usa | Família | Peso |
| --- | --- | --- | --- |
| `display` | promessa da primeira dobra; título da prévia | Lora | 400 |
| `heading` | título de seção e de passo (h2, h3) | Lora | 400 (h2) / 700 (h3, quando dois níveis competem no mesmo bloco) |
| `body` | texto corrido, resposta do comprador, trecho do livro | Lora | 400 |
| `caption` | **voz do sistema**: rótulo, contagem de passo, ajuda, unidade, prazo, erro | Archivo (wdth 87) | 800 |

**Famílias:** duas, com papel declarado e semântico — **Lora** é a voz do livro e de tudo que vem do
casal; **Archivo** é a voz do sistema, e vive à esquerda da régua da §3. A troca de família **nunca**
é ênfase dentro de uma frase (anti-pattern 46): ela marca *quem está falando*. Fallback declarado:
`Lora, Georgia, 'Times New Roman', serif` e `Archivo, 'Arial Narrow', system-ui, sans-serif`, ambas
auto-hospedadas com `font-display: swap` (o navegador in-app da §13 não pode depender de CDN).

### 4.6 Motion

| Token | Valor | O que comunica |
| --- | --- | --- |
| `duration-instant` | 120ms | feedback de ação — o controle confirma que ouviu |
| `duration-base` | 200ms | transição de estado no mesmo lugar (campo válido, chip selecionado) |
| `duration-deliberate` | 320ms | continuidade espacial na troca de passo do questionário |
| `ease-papel` | `cubic-bezier(.2, .7, .2, 1)` | desaceleração exponencial: objeto real que para. É a **única** curva do produto |
| `ease-simetrico` | `cubic-bezier(.4, 0, .2, 1)` | só em elemento que entra e sai pelo mesmo caminho (diálogo) |

Nenhuma curva com overshoot (anti-pattern 47). Só `transform` e `opacity` são animados.

**O momento autoral do produto:** **a régua cresce.** Ao avançar um passo do questionário, o único
movimento da tela é a régua de margem se estendendo verticalmente (`transform: scaleY`, origem no
topo, `duration-deliberate` + `ease-papel`) até a altura do conteúdo novo — como a página sendo
preenchida. Não há cascata de entrada nas seções (57), não há revelação por scroll, não há
`translateY` de hover em tudo que é clicável (48).

**Comportamento sob `prefers-reduced-motion`:** a régua já nasce na altura final (sem `scaleY`), a
troca de passo é instantânea e o foco vai direto para o primeiro campo do passo novo. Nenhuma
informação depende do movimento.

---

## 5. Escala tipográfica

**Razão:** ≈1,25 (cada passo entre 1,21× e 1,29× o anterior).

| Passo | Tamanho | Entrelinha | Papel que o usa |
| --- | --- | --- | --- |
| `text-caption` | 14px | 1,45 | `caption` — voz do sistema |
| `text-body` | 17px | 1,60 | `body` |
| `text-lead` | 21px | 1,45 | frase de apoio da primeira dobra; `body` em destaque |
| `text-h3` | 27px | 1,25 | `heading` nível 3 |
| `text-h2` | 33px | 1,20 | `heading` de seção |
| `text-h1` | 42px | 1,12 | título de página; `display` no 375 |
| `text-display` | 52px | 1,05 | `display` a partir de 768 |

Nenhum texto de corpo abaixo de 17px e nenhum texto de UI abaixo de 14px (anti-pattern 41).
`letter-spacing` só como ajuste ótico em `text-h1`/`text-display` (`-0,02em`), nunca além de
-0,04em (39).

**Medida de linha do corpo:** **62** caracteres (travada em `62ch`, dentro da faixa 45–75).

### Pares de peso

| Par | Pesos | Onde o contraste aparece |
| --- | --- | --- |
| Par principal | **400 / 800** | Lora 400 do texto do casal contra Archivo 800 do rótulo do sistema — os dois lados da régua da §3, lado a lado na mesma linha de base |
| Par de apoio | **400 / 700** | dentro de Lora: corpo 400 contra `heading` nível 3 em 700, quando dois níveis de título competem no mesmo bloco |

Nenhuma tela fica inteira em 400/500 (anti-pattern 37): a voz do sistema em 800 está presente em
toda tela, por construção da assinatura.

---

## 6. Grid e conceito de layout

**Grid:** 12 colunas em 1280 (medianiz 24px, conteúdo máximo 1120px, margem externa 40px) · 6
colunas em 768 (medianiz 20px, margem 32px) · 4 colunas em 375 (medianiz 16px, margem 20px). A
**coluna de leitura é travada em 62ch** em qualquer largura; espaço extra vira margem, nunca linha
mais longa. CSS Grid com áreas nomeadas (`margem` / `conteudo`) para a divisão da régua; flex só
dentro de uma fileira de controles.

**Conceito de layout em uma frase:** *uma folha ao centro com uma régua de margem à esquerda — à
direita da régua o que é do casal, à esquerda o que o sistema diz.*

**O argumento da página, em uma linha:** *você já tem a história; em cinco minutos ela vira um livro
que a outra pessoa vai poder segurar.*

**Sequência de seções da página de produto, e o trabalho de cada uma:**

| # | Seção | O trabalho no argumento | O que ela NÃO faz |
| --- | --- | --- | --- |
| 1 | Promessa + ação | fazer sentir a promessa e oferecer a ação | não explica o processo |
| 2 | O que está impresso (trecho real de uma página) | responde *"por que não é uma caneca com foto?"* — porque o que está impresso é **texto escrito sobre vocês** | não mostra preço |
| 3 | Em cinco minutos (3 passos, em linha) | responde *"vai dar trabalho?"*, a objeção do comprador de impulso | não repete o conteúdo do livro |
| 4 | Quanto custa e quando chega | responde preço e prazo — e prazo é restrição real, há data marcada | não introduz novo argumento emocional |
| 5 | Quem escreve é você | responde a objeção honesta *"isso é feito por máquina?"*: você escreve, a máquina encaderna, e você vê a prévia antes de fechar | não esconde nem vende a automação |
| 6 | Prova | **fica vazia e marcada** até existir prova real de cliente (playbook §2.3) | não inventa depoimento nem número |
| 7 | Ação, repetida | recolher quem desceu lendo | **mesmo rótulo e mesma ação** da seção 1 (anti-pattern 70) |

**Elemento LCP (decisão de design, playbook §3.1):** é a **promessa em `display`** — texto, não
imagem. Enquanto não existir foto real de um livro produzido, a primeira dobra não tem imagem, e
isso é decisão, não falta: uma foto de banco de imagens de casal genérico contradiria o produto
inteiro (§7.2). Quando a foto real existir, ela passa a ser o LCP, com `width`/`height` declarados,
`fetchpriority="high"` e **sem** `lazy`.

### Wireframes ASCII das telas-chave

**Tela:** Página de produto (a que o anúncio abre) — 1280
**Ordem de leitura, em uma frase:** a promessa, depois a página do livro ao lado dela, depois o
botão — e só então quanto custa.

```
┌─┬──────────────────────────────────────────────────────┐
│ │ Nossa História                        [ Começar ]    │  barra: marca à esq.
├─┼─────────────────────────────────┬────────────────────┤
│ │  PROMESSA (display, 2 linhas)   │                    │
│ │  frase de apoio (lead)          │  FOTO REAL DE UM   │
│ │  [ Começar o meu livro ]        │  LIVRO ABERTO      │
│ │  quanto custa · quando chega    │  (ausente na V1)   │
├─┼─────────────────────────────────┴────────────────────┤
│ │  O QUE ESTÁ IMPRESSO — trecho real de uma página     │
├─┼──────────────────────────────────────────────────────┤
│ │  EM CINCO MINUTOS — 3 passos em linha, sem card      │
├─┼──────────────────────────────────────────────────────┤
│ │  QUANTO CUSTA E QUANDO CHEGA                         │
├─┼──────────────────────────────────────────────────────┤
│ │  QUEM ESCREVE É VOCÊ                                 │
├─┼──────────────────────────────────────────────────────┤
│ │  PROVA — vazia e marcada até haver prova real        │
├─┼──────────────────────────────────────────────────────┤
│ │  [ Começar o meu livro ]                             │
└─┴──────────────────────────────────────────────────────┘
  ↑ a régua de margem, contínua do topo ao rodapé
```

**Colapso desta composição no mobile (375):** a coluna da foto desce para baixo do bloco de
promessa (o texto é o argumento, a imagem é a confirmação); a régua encosta a `space-md` da margem
e a voz do sistema (`quanto custa · quando chega`) sobe para **acima** do botão, alinhada à régua;
o botão passa a ocupar a largura da coluna e **fixa no rodapé** assim que a promessa sai da tela —
a compra é por impulso e o polegar não deve procurar a ação.

---

**Tela:** Um passo do questionário
**Ordem de leitura, em uma frase:** a pergunta, o campo, e só depois onde estou no fluxo.

```
┌─┬──────────────────────────────────────────────────────┐
│ │  PERGUNTA (heading, Lora)                            │
│3│                                                      │
│d│  ┌──────────────────────────────────────────────┐    │
│e│  │ campo de escrita (Lora 400, 17px, 62ch)      │    │
│7│  │                                              │    │
│ │  └──────────────────────────────────────────────┘    │
│ │                                                      │
│e│  ajuda: o que entra aqui, em uma linha               │
│x│                                                      │
│. │  [ Continuar para as fotos ]      [ voltar ]        │
└─┴──────────────────────────────────────────────────────┘
  ↑ à ESQUERDA da régua, Archivo 800/14: "3 de 7", "ex.:", rótulo
```

**Colapso desta composição no mobile (375):** a coluna da esquerda não cabe — "3 de 7" e o rótulo
sobem para acima da pergunta, alinhados à régua, na mesma família e peso; a ajuda fica logo abaixo
do campo; a ação primária ocupa a largura e fica fixa acima do teclado.

---

**Tela:** Prévia do livro, antes de fechar a compra
**Ordem de leitura, em uma frase:** o spread aberto, depois o que ainda dá para mudar, depois o
botão que fecha.

```
┌─┬──────────────────────────────────────────────────────┐
│ │  ┌────────────────────┬────────────────────┐         │
│ │  │  página esquerda   │  página direita    │  ← a folha,
│p│  │  (foto do casal:   │  (texto em Lora)   │    elevation-1,
│á│  │   único elemento   │                    │    sem borda
│g│  │   saturado)        │                    │         │
│ │  └────────────────────┴────────────────────┘         │
│4│  ◀  spread 4 de 16  ▶                                │
├─┼──────────────────────────────────────────────────────┤
│ │  O que ainda dá para mudar · o que não dá            │
│ │  [ Fechar e pagar R$ xx ]                            │
└─┴──────────────────────────────────────────────────────┘
```

**Colapso desta composição no mobile (375):** o spread duplo vira **uma página por vez** com deslize
horizontal (o objeto físico é quadrado; duas páginas em 375 não são legíveis); o indicador de spread
vira "página 7 de 32"; a ação de fechar fixa no rodapé, e o aviso do que não dá para mudar aparece
**acima** dela, nunca só depois do clique.

---

## 7. Iconografia · Ilustração e foto · Densidade

### 7.1 Iconografia

**Família:** Lucide, única · **Espessura:** 1,5px, única · **Tamanhos permitidos:** 16 / 20 / 24px.

**Quando um ícone é permitido:** apenas em quatro papéis funcionais nomeados — enviar foto, remover
foto, navegar entre páginas da prévia, baixar o PDF. **Ícone nunca aparece sozinho** em controle de
ação: sempre acompanha o rótulo. Não existe ícone decorativo, não existe ícone acima de título
(anti-pattern 23) e emoji não substitui ícone (20).

### 7.2 Ilustração e foto

**Origem:** exclusivamente (a) as fotos que o próprio comprador envia e (b) o render real das
páginas do livro produzido. Nada mais.

**Tratamento:** a foto do casal é **o único elemento saturado e quente de qualquer tela** — a
interface é papel e tinta, e nenhum outro elemento recebe cor cheia. Sem filtro, sem sobreposição de
gradiente, sem moldura desenhada, sem rotação ou escala no hover (anti-pattern 54). A foto se
distingue da moldura do produto por ser a única coisa colorida, não por borda. Toda foto de usuário
é servida por **URL assinada e expirável**, nunca por cache público (`CLAUDE.md`, regra 3).

**Proibido:** foto de banco de imagens de casal genérico (contradiz o produto inteiro: a página fala
de *uma* história específica); ilustração de estoque; SVG montado à mão imitando cena ou foto
(anti-pattern 24); screenshot falso do produto feito com `div`s (25). Enquanto não existir render
real de um livro produzido, a região fica **vazia e marcada**, nunca preenchida com substituto.

### 7.3 Densidade

**Densidade escolhida:** **baixa** na página de produto e na prévia; **média com agrupamento forte**
no questionário.

**Por qual tarefa:** a página de produto é leitura e decisão emocional e a prévia é conferência de um
objeto que não é reproduzível — nas duas, o tempo é do usuário (CRAFT §7). O questionário é fluxo
guiado com orçamento de cinco minutos: densidade média, um passo por vez, agrupamento óbvio. A
escolha vale por **tela inteira**; nenhuma seção muda de densidade em relação às vizinhas.

**Alvo mínimo de toque no mobile:** 44 × 44 CSS px, sem exceção — inclusive no chip de escolha de
estilo e tamanho.

---

## 8. Filosofia de componentes

**Possuído pelo projeto:** tudo que o comprador associa ao produto — a régua de margem e o par de
vozes da §3, a folha, o passo do questionário, o campo de escrita, o chip de escolha (estilo,
tamanho, formato), o contêiner da prévia, o cartão de pedido, o botão. Estes carregam a identidade e
não se importam de biblioteca nenhuma.

**Primitivo de biblioteca:** **nenhum hoje.** O perfil de stack da §0 é Svelte 5 sem biblioteca de
UI, e `shadcn` é incompatível com ele (é React) — ver `docs/design/SKILL-ROUTER.md`. Se e quando o
produto precisar de mecânica de acessibilidade não trivial (diálogo modal, combobox), entra uma
primitiva **headless** de Svelte (Melt UI ou Bits UI), nunca uma biblioteca com estilo próprio, e a
decisão vira entrada nova nesta seção via gate.

**Regra de customização obrigatória:** todo primitivo importado recebe, antes de entrar em qualquer
tela, os tokens de cor (§4.1), raio (§4.3), tipografia (§4.5) e o anel de foco (`focus`) deste
documento. Componente entregue em estado default da biblioteca é achado, não entrega.

---

## 9. Tom de copy

**Voz em uma frase:** fala como quem ajuda a escrever — com as palavras que o próprio comprador
usaria para falar do relacionamento dele —, nunca como plataforma que oferece um serviço.

**Pessoa e tratamento:** **"você"** (2ª do singular) para quem compra, sempre. **"vocês"** só quando
o texto fala do casal como conteúdo do livro. O produto nunca diz "nós", "nossa plataforma" nem
"nosso sistema": quem escreve é o comprador.

**Registro:** um só — conversa direta e concreta. Sem prosa poética, sem punch de marketing, sem
jargão técnico (anti-pattern 74).

**Como se nomeia um controle:** o rótulo nomeia a ação que executa **e deixa previsível o que vem
depois** — "Continuar para as fotos", "Ver a prévia", "Fechar e pagar". Nunca "Continuar" sozinho,
"OK" ou "Começar agora" (anti-pattern 62). O mesmo destino tem sempre o mesmo rótulo na página
inteira (70).

**Como se escreve um erro:** nomeia o problema e a saída, no lugar onde o erro aconteceu, na voz do
sistema (Archivo, à esquerda da régua) — "A foto tem 12 MB; o limite é 8 MB. Escolha outra ou
reduza." Nunca "Algo deu errado" (72).

**O que este produto NUNCA diz:**

| Nunca | Por quê |
| --- | --- |
| "jornada", "experiência única", "eternize", "surpreenda quem você ama" | placeholder poético e buzzword (anti-patterns 61 e 63); e um produto sobre *esta* história não fala em genérico |
| "feito com inteligência artificial" como argumento de venda | a automação é verdade e não se esconde (seção 5 da página a explica), mas ela **não é** o motivo de comprar: o motivo é o texto sobre aquelas duas pessoas. Vender a máquina é vender a coisa errada |
| exclamação em confirmação de compra ou de geração | o produto não comemora pelo usuário; a emoção é do livro, não da interface |
| travessão (—) como pontuação default de interface | anti-pattern 69. **Exceção declarada:** o texto narrativo *dentro do livro* pode usá-lo — ali o travessão é da língua |
| "Etapa 1 / Etapa 2 / Etapa 3" | rótulo genérico de etapa (65); cada passo tem nome — "como se conheceram", "as fotos", "a mensagem final" |
| qualquer número redondo apresentado como dado real ("+10 mil casais") | anti-pattern 71, e hoje seria falso: não há prova |

---

## 10. Responsividade projetada

| Largura | O que muda de intenção | Por quê |
| --- | --- | --- |
| **375** | A ação primária **fixa no rodapé** assim que a promessa sai da tela; a voz do sistema muda de eixo (sobe para acima do bloco em vez de ficar à esquerda da régua); a prévia mostra **uma página por vez**, não o spread. | É a tela real do público: 18–30, chegando de anúncio, comprando por impulso. O polegar não deve procurar a ação, e duas páginas de um livro quadrado lado a lado não são legíveis em 375. |
| **768** | A régua ganha coluna própria: a voz do sistema entra **à esquerda**, na horizontal do conteúdo que ela rotula. Duas colunas só onde existe um par real (foto ↔ texto da página do livro). | É a partir daqui que a assinatura da §3 funciona no eixo em que foi projetada. Duas colunas sem par é grid decorativo. |
| **1280** | A coluna de leitura **não cresce** (trava em 62ch): o espaço extra vira margem. A prévia abre em **spread duplo**, como o objeto aberto na mão. | Linha mais longa que 75 caracteres perde o olho de volta (CRAFT §2). E o spread duplo é a única coisa que a tela grande entrega de verdade: o livro como objeto. |

**O que NÃO muda em nenhuma largura:** a régua de margem e a divisão das duas vozes (só muda de
eixo); a foto do casal como único elemento saturado; a medida de 62ch do corpo; o rótulo da ação
primária. **A assinatura sobrevive aos três** — em 375 ela é uma linha vertical na borda da coluna
com a voz do sistema alinhada a ela; em 768 e 1280 ela é a divisão de duas colunas.

---

## 11. Estados obrigatórios por componente-chave

| Componente-chave | Vazio | Carregando | Erro | Overflow | Offline / degradado |
| --- | --- | --- | --- | --- | --- |
| **Campo de escrita do questionário** | a pergunta e, na margem, um exemplo real e específico do que entra ali (nunca "João Silva") | não se aplica — o campo não carrega dado | na margem, à esquerda: "Falta responder isto para o livro ter o que contar." O campo ganha `border` em `destructive` **e** o texto do erro (cor nunca sozinha) | texto de 40 linhas: o campo cresce até 12 linhas e passa a rolar internamente; nada é truncado sem aviso | o rascunho fica no dispositivo e a margem diz "Salvo aqui neste aparelho. Vai subir quando a conexão voltar." **O que foi digitado nunca se perde** |
| **Envio de foto** | contorno tracejado em `border` + "Uma foto de vocês dois. JPG ou PNG, até 8 MB." | esqueleto com a **proporção exata** da miniatura final, para o layout não pular (nunca spinner) | "A foto tem 12 MB; o limite é 8 MB. Escolha outra ou reduza." — no lugar da miniatura que falhou, com a ação de trocar ali mesmo | 30 fotos onde cabem 8: as 8 primeiras aparecem e a margem diz quantas ficaram de fora e quais entram no livro | envio pausa e retoma; a margem diz o que já subiu e o que falta, por nome de arquivo |
| **Contêiner da prévia** | "A prévia aparece aqui quando o livro terminar de ser montado." + o tempo estimado | esqueleto com a forma do spread (dois quadrados) e a contagem real de páginas prontas — a geração é lenta e o progresso é informação, não enfeite | "A montagem parou na página 12. Já tentamos duas vezes. Escreva para a gente e resolvemos sem você refazer nada." — o erro nunca sugere recomeçar do zero | nome do casal com 60 caracteres: quebra em duas linhas no `display`, nunca reticências | a prévia já baixada continua visível e navegável; a ação de pagar fica desabilitada com o motivo escrito ao lado |
| **Pedido (acompanhamento)** | "Você ainda não tem nenhum livro." + a ação de começar | esqueleto de uma linha de pedido | "Não conseguimos ler o status agora. Seu pedido está seguro; recarregue em instantes." | 300 pedidos (caso do admin): lista virtualizada, densidade alta — é a única superfície de operação repetida do produto | mostra o último status conhecido **com a hora em que foi lido**, nunca um status velho sem data |

**Estados de interação:** hover, active, disabled, selecionado e **foco visível** fazem parte de todo
controle desde o primeiro commit. O foco usa `focus` (`#15181F`) com `outline: 2px` e
`outline-offset: 2px` — `outline: none` sem substituto é defeito (55). `disabled` nunca aparece sem
o motivo escrito ao lado: um botão apagado sem explicação é um beco.

---

## 12. Acessibilidade

**Piso:** WCAG 2.2 AA (obrigatório, não negociável).

| Exigência além do piso | Por quê |
| --- | --- |
| Texto de corpo em `foreground` sobre `surface`/`surface-raised`, ou seja **≥ 16:1**, e não os 4,5:1 do piso. `muted` (5,90:1) nunca carrega informação essencial — só repete o que já está dito. | O corpo de texto **é** o produto, e ele é lido no celular, à noite, com brilho baixo e possivelmente às escondidas. |
| **Discrição como requisito**: nada do conteúdo do casal — nomes, trecho, prévia — aparece em `<title>`, em notificação do navegador, no assunto do e-mail, na prévia de link ou em qualquer lugar visível sem abrir a página. | O comprador é uma das duas pessoas do casal e a compra é **surpresa**. Um vazamento visual não é incômodo: destrói o presente. |
| Nada do que foi digitado se perde em erro, queda de conexão ou volta de passo. | Ele está escrevendo o que não escreveria duas vezes — e o livro não é reproduzível (`PRODUCT.md` §6.1). |
| Alvo de toque de 44px mesmo nos chips de escolha, e ação primária sempre alcançável com o polegar em 375. | Uso com uma mão, deitado, no celular. |

**Preferências de sistema respeitadas:** `prefers-reduced-motion` (§4.6), `prefers-contrast`
(reforça `border` e `muted` para `foreground`) e `prefers-reduced-transparency` (sem efeito prático
aqui: o produto não tem superfície translúcida).
**Zoom:** conteúdo e função preservados até 200%.

---

## 13. Regras de plataforma

Web responsiva, sem plataforma hospedeira nativa — **mas com uma restrição real de hospedeiro**: o
canal de aquisição é anúncio em Instagram e TikTok, então a maior parte das primeiras visitas abre
no **navegador in-app** dessas redes, não no Safari nem no Chrome.

**O que o produto segue por causa disso:**

- Fonte **auto-hospedada** no mesmo domínio, com `font-display: swap` e fallback declarado (§4.5).
  Nada de CDN de fonte: o navegador in-app é o pior caso de rede e de bloqueio.
- Nenhuma função depende de abrir aba nova, de instalar PWA, de `window.open` ou de API de
  compartilhamento nativo. Onde uma dessas ajudar, é **enriquecimento**, com caminho equivalente sem
  ela.
- Altura de viewport sempre em `dvh`, nunca `vh` (anti-pattern 6): a barra do navegador in-app entra
  e sai, e a ação fixa no rodapé do 375 não pode ficar sob ela.
- O retorno do Stripe volta **para o mesmo contexto de navegação**; o fluxo nunca assume que o
  usuário consegue voltar por histórico.

---

## 14. Proveniência (R-ASSETS)

| Decisão | Seção | Origem | Fonte |
| --- | --- | --- | --- |
| Famílias tipográficas: **Lora** como voz do livro e do conteúdo do casal | §4.5, §5 | `derivada-de-asset` | O livro impresso **já é composto em Lora**: `src/lib/generation-engine/pdf/render-shared.ts` (`FONT_FAMILY = 'Lora'`), `render-carta.ts`, `render-dedicatoria.ts`, dependência `@fontsource/lora`, decisão registrada em `docs/DECISIONS.md` (fonte embutida por data URI). A tela passa a falar na fonte do objeto |
| Nome de marca = "Nossa História" | §0, §9 | `criada-na-Fundação` | Resposta do dono no gate desta Fundação (2026-08-13); nome já em uso em `docs/PRODUCT.md` §2 e `src/lib/home-content.ts` |
| Direção **Tinta de Esferográfica** e o risco estético da §1 | §1 | `criada-na-Fundação` | `docs/PRODUCT.md` §8.1–8.3 + respostas do dono (comprador é do casal e é surpresa; 18–30, celular; R$80–130 por impulso; alternativa = presente de marketplace) |
| Referências e anti-referências | §2 | `criada-na-Fundação` | Não havia `design/assets/references.md`. Todas propostas nesta Fundação |
| Assinatura: a régua de margem | §3 | `criada-na-Fundação` | Não havia asset. Derivada da promessa "você escreve, nós encadernamos" (`PRODUCT.md` §2, §8.2) |
| Paleta completa e contrastes | §4.1 | `criada-na-Fundação` | Não havia `design/assets/palette.md` nem cor no produto no ar (o CTA usa `currentColor`) — ausência verificada em `docs/design/BRAND-ASSETS.md` e reverificada nesta Fundação. Contrastes calculados aqui |
| Archivo como voz do sistema | §4.5 | `criada-na-Fundação` | Não havia segunda família. Escolhida pelo papel semântico da §3 |
| Espaçamento, raio, elevação, motion, escala | §4.2–§4.6, §5 | `criada-na-Fundação` | Não havia sistema anterior; a home no ar tem ~25 linhas de CSS de largura e espaçamento |
| Grid, argumento da página, sequência de seções, LCP | §6 | `criada-na-Fundação` | `docs/design/playbooks/institucional-marketing.md` §1 e §3.1 + as objeções que saem das respostas do dono |
| Iconografia e política de foto | §7.1, §7.2 | `criada-na-Fundação` | Não havia ícone nem imagem versionada no repositório |
| Densidade | §7.3 | `criada-na-Fundação` | `CRAFT-PRINCIPLES.md` §7 + tarefa declarada em `PRODUCT.md` §2 e §9 |
| Filosofia de componentes | §8 | `criada-na-Fundação` | Perfil de stack real (`package.json`: Svelte 5, sem biblioteca de UI) + `docs/design/SKILL-ROUTER.md` |
| Tom de copy | §9 | `criada-na-Fundação` | `docs/PRODUCT.md` §8.3 (adjetivos derivados) + o 4º adjetivo aprovado pelo dono nesta sessão |
| Regras de plataforma | §13 | `criada-na-Fundação` | Canal de aquisição respondido pelo dono (anúncio em Instagram/TikTok + busca) |

**Assets lidos nesta Fundação** (varredura de `design/assets/` em 2026-08-13, antes de propor
qualquer coisa):

| Item da convenção | Encontrado |
| --- | --- |
| `design/assets/README.md` | **existe** — aponta para a convenção e declara o diretório vazio |
| `design/assets/logos/` | **não existe** |
| `design/assets/images/` | **não existe** |
| `design/assets/palette.md` | **não existe** |
| `design/assets/references.md` | **não existe** |

O inventário datado de `docs/design/BRAND-ASSETS.md` (2026-08-12) foi confirmado: nenhum arquivo de
imagem ou fonte de marca versionado, sem `static/`, sem favicon, sem cor declarada na home. **É essa
ausência verificada que justifica cada linha `criada-na-Fundação` acima** — e é por tê-la verificado
que a única linha `derivada-de-asset` (Lora) foi encontrada onde ela realmente estava: no código de
render do livro, não em `design/assets/`.

**Registro de variedade:** `docs/design/VARIETY-REGISTRY.md` existe e está **vazio** — esta é a
primeira Fundação da fábrica. Não há projeto anterior com que convergir, logo não houve
justificativa de convergência a dar (D-078 §8). A primeira linha do registro é preenchida **depois**
da aprovação, com os valores deste documento aprovado.

---

## 15. Memória de design

### 2026-08-13 · Direção "Envelope de Revelação"
**Rejeitado porque:** o mundo do envelope de laboratório fotográfico (kraft, laranja de carimbo,
condensada industrial, densidade alta, número de pedido impresso) coloca **a foto** no centro — e a
foto é justamente onde este produto empata com a alternativa real do comprador, o presente
personalizado de marketplace. O que diferencia é o texto escrito sobre o casal, e essa direção o
rebaixava a legenda. Além disso, é uma nostalgia dos **pais** do comprador de 18–30, não dele.
**Substituído por:** "Tinta de Esferográfica" (§1), que põe a palavra como protagonista e trata a
foto como o único elemento colorido, sem transformá-la no argumento (§7.2).
**Origem:** Fundação.

### 2026-08-13 · Direção "Luz de Abajur"
**Rejeitado porque:** superfície escura e quente, densidade baixa e movimento lento, ancorada no
contexto real de "à noite, escondido, no celular". O contexto é verdadeiro, mas é o contexto do
**questionário**, não do produto inteiro: a tela decisiva é a página que abre a partir de um anúncio
ou de uma busca, e um teste de proposta de valor em 5 segundos (playbook §2.1) é mais difícil numa
superfície escura de baixa densidade. Fazer da tela menos decisiva a identidade seria otimizar o
lugar errado — e tema é decisão de contexto de uso, não de identidade (CRAFT §4).
**Substituído por:** superfície de papel clara com neutros puxando azul (§4.1) e a declaração
explícita de que **não há tema escuro** neste produto.
**Origem:** Fundação.

### 2026-08-13 · A primeira versão da própria direção escolhida (creme + terracota + serifa display)
**Rejeitado porque:** a primeira formulação de "Tinta de Esferográfica" tinha superfície **creme
`#F5EFE3`**, acento **terracota**, `display` em serifa grande e um fundo de papel pautado como
textura. Foi o que a autocrítica anti-default (D-078 §7) derrubou: essa combinação é exatamente o
que qualquer gerador produz para o brief "livro afetivo artesanal de casal" — e é nominalmente o
anti-pattern 35 (bege/creme "de bom gosto" como superfície default de produto afetivo ou artesanal),
acompanhado do 45 e do 22. Também contradizia as respostas do dono: creme e terracota leem como
premium e cerimonioso, e o produto é R$80–130 comprado por impulso em cinco minutos.
**Substituído por:** paleta fria com azul de esferográfica como único acento (§4.1), `display` em
Lora **400 e caixa reta** em vez de serifa itálica display (§4.5), e o fundo pautado trocado por
**uma** linha de margem com trabalho semântico — separar a voz do casal da voz do sistema (§3).
**Origem:** Fundação — autocrítica anti-default.

### 2026-08-13 · Tipografia inicialmente proposta: Source Serif 4 como voz do produto
**Rejeitado porque:** foi escolhida por reflexo, antes de terminar a varredura do repositório. O
livro impresso — que é o produto — **já é composto em Lora** (`render-shared.ts`, `@fontsource/lora`,
decisão registrada em `DECISIONS.md`). Propor outra serifa para a tela criaria duas vozes para o
mesmo objeto e violaria R-ASSETS: seria `criada-na-Fundação` onde existia asset disponível.
**Substituído por:** Lora como voz do livro e de todo conteúdo do casal (§4.5), com a proveniência
`derivada-de-asset` registrada na §14.
**Origem:** Fundação — passo 1 (R-ASSETS).

### 2026-08-14 · Novo token de espaço: `--space-4xl`, para alinhar a voz do sistema do herói ao CTA

**Por que um token novo:** a `.hero-sistema-desktop` (§3, "quanto custa · quando chega") vive na
`.margem`, uma coluna separada da `.hero` que contém a promessa/apoio/CTA — as duas colunas não
compartilham linha de grid, então a única forma de aproximar o rótulo da altura do CTA sem medir o
DOM em runtime é um `margin-top` fixo. `--space-3xl` (96px), o maior degrau existente, terminava
muito antes do botão em 768/1280 (achado do dono, PR #178, rodada 6). O gate de tokens do CI não
aceita `calc()` composto nessa propriedade — por isso um novo degrau, não uma expressão.

| Token | Valor | Papel |
| --- | --- | --- |
| `space-4xl` | `21.5rem` (344px) | `margin-top` da voz do sistema do herói (`.hero-sistema-desktop`) a partir de 768, aproximando-a da altura do CTA (§3, §6) |

**Aproximação deliberada, não medição exata:** o valor é uma estimativa a partir da altura somada do
`h1` (`display`), a frase de apoio e o `gap` até o CTA — não uma medição de render (sem browser
disponível nesta sessão, como nas rodadas anteriores). Se o próximo render mostrar o valor ainda
errado, o ajuste é só o valor deste token, não a abordagem.
**Origem:** achado do dono no PR #178, rodada 6.

### 2026-08-14 · Correção do `--space-4xl`: a estimativa da rodada 6 assumia o `h1` errado

**Por que corrigir:** a estimativa da rodada 6 (192px) partiu de um `h1` de 2 linhas — mas o render
mostrou 3 linhas em 1280 e 4 em 768 (a `.margem` fixa em 64px de largura não muda a largura da
coluna de leitura da `.folha`, só a do rótulo). Recalculando com o número de linhas real: `folha`
padding-top (`--space-xl`, 48px) + altura do `h1` (`--text-display`/`--leading-display`, 3 ou 4
linhas conforme o breakpoint) + `margin-top` do `.apoio` (`--space-xs`, 12px) + altura do `.apoio`
(2 linhas em ambos) + `gap` até o `.cta` (`--space-lg`, 32px) dá ≈317px em 1280 e ≈371px em 768. Um
token só (sem breakpoint próprio) não acerta os dois exatamente — `21.5rem` (344px) é a média,
minimizando o erro em cada um.
**Origem:** achado do dono no PR #178, rodada 6 (correção de cálculo aplicada na rodada 7, mesma
issue #177).

### 2026-08-14 · Barra de topo do wireframe da §6 — omitida na landing da V1

**O quê:** a barra de topo do wireframe da §6 ("Nossa História" à esquerda, ação "Começar" à
direita, primeira linha da composição) não foi entregue na landing (`/`) desta V1.
**Por quê:** é chrome global — mora no `+layout.svelte` e apareceria em toda rota, inclusive no
`/questionário`, que é a issue seguinte da onda. Entregá-la dentro do PR da landing acoplaria um
componente global ao PR de uma rota só, contra `.claude/rules/right-sizing.md`.
**Consequência aceita:** até essa issue existir, a landing e o questionário abrem sem marca e sem
navegação no topo. É omissão registrada, não esquecimento.
**Origem:** achado [High] do `design-critic` no PR #178, e decisão do dono.
