# Playbook — institucional / marketing

> **Categoria:** site institucional, página de produto, landing de conversão.
> **Status:** completo. É a categoria do produto atual da fábrica (mini livro "Nossa História").
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

O `DESIGN.md` desta categoria é preenchido inteiro, como qualquer outro. O que muda é **onde a
Fundação gasta o tempo** e o que ela precisa entregar a mais.

### 1.1 Hierarquia persuasiva — a ordem de leitura é um argumento

CRAFT §1 exige que a tela responda "o que o olho vê primeiro, segundo, terceiro". Nesta categoria a
resposta não é só visual: **é a ordem do argumento**. A página inteira tem uma linha de raciocínio
— promessa → prova → objeção respondida → ação — e a hierarquia visual existe para servir a ela.

- Escreva o argumento da página em **uma linha**, antes de qualquer wireframe. Ele entra na §6 do
  `DESIGN.md` junto da ordem de leitura de cada tela-chave.
- **Toda seção tem um trabalho nomeável no argumento.** Seção que não sabe dizer qual objeção
  responde ou qual prova entrega não é seção: é preenchimento, e sai.
- Uma página, **uma ação primária**. Tudo o mais é secundário e visualmente rebaixado — rebaixar o
  secundário é tão hierárquico quanto destacar o primário (CRAFT §1).

### 1.2 Narrativa e conversão — a sequência é projeto, não ordem de chegada

- Declare a **sequência de seções** e o motivo de cada posição. A ordem em que as objeções aparecem
  é uma decisão de design, não o resultado de ir empilhando blocos.
- Mapeie as **objeções reais do público** (§8 do `PRODUCT.md`) e diga onde cada uma é respondida.
  Objeção não respondida na página é conversão perdida em silêncio.
- Cada seção declara também **o que ela não faz** — evita que a seguinte repita o mesmo trabalho com
  outra fôrma.

### 1.3 Peso emocional da primeira dobra

- A primeira dobra é onde a promessa do produto **é sentida**, não explicada. Declare no `DESIGN.md`
  §6, no wireframe da tela-chave, **o que a pessoa deve sentir** ali — em uma frase ancorada no
  produto e no público, nunca em adjetivo de aparência.
- A **assinatura visual** (§3 do `DESIGN.md`) precisa estar presente acima da dobra. Se a primeira
  dobra é reconhecível sem o logo, ela existe; se não, ela é um cabeçalho.
- Densidade **baixa** (CRAFT §7): leitura e decisão emocional. O tempo é do usuário.

### 1.4 Copy como protagonista

Aqui a copy não é material de design como em qualquer tela (CRAFT §9) — ela é **o produto da
página**. O layout é derivado do texto real, nunca o contrário.

- **O texto real primeiro, o layout depois.** Título que só funciona com o comprimento que você
  imaginou não funciona.
- Rode o texto real nos três breakpoints do Visual Verification Loop (375/768/1280) antes de
  considerar a composição resolvida.
- Um registro de voz por página, declarado na §9 do `DESIGN.md`.

---

## 2. Rubrica extra do `design-critic`

Soma-se — não substitui — ao checklist `[CRITIC]` de `.claude/rules/design-antipatterns.md` e ao
teste *"isso poderia sair de qualquer prompt parecido?"*. Roda **pós-render**, sobre os screenshots.

### 2.1 Clareza da proposta de valor em 5 segundos

Teste: **cobrir tudo abaixo da primeira dobra** e responder, em cinco segundos, olhando só o que
sobrou:

1. **O que** este produto é;
2. **para quem**;
3. **o que muda** para quem comprar.

Falhou alguma das três, ou a resposta exigiu rolar? **Achado.** E o achado é da hierarquia da
dobra, não da falta de texto: acrescentar parágrafo costuma piorar.

### 2.2 CTA sem ambiguidade

- **Uma** ação primária por página, visualmente inequívoca.
- O rótulo **nomeia a ação que executa** (CRAFT §9) e deixa previsível o que acontece depois do
  clique. "Ver a prévia" diz o que vem; "Comece agora" não diz nada (anti-pattern 62).
- Dois controles com a **mesma intenção** e rótulos diferentes na mesma página é achado
  (anti-pattern 70).
- CTA repetido ao longo da página é legítimo — desde que seja **o mesmo rótulo e a mesma ação**.

### 2.3 Prova social sem clichê

- Prova é **nomeada, específica e verificável**. Depoimento de "João Silva" é dado de exemplo
  genérico (anti-pattern 64); número redondo demais apresentado como real — 99,9%, 10x — é achado
  (anti-pattern 71).
- Prova genérica é **pior que nenhuma**: ela ativa no leitor a suspeita que a página inteira estava
  tentando dissolver.
- Nada de screenshot falso do produto montado com `div`s (anti-pattern 25) nem de SVG à mão imitando
  cena ou foto (24). Se ainda não há prova real, entregue a seção **vazia e marcada**, não inventada.

---

## 3. Gates e atenções da categoria

Nesta categoria a página **é** o canal de aquisição. Performance e SEO não são polimento futuro:
são requisito da fase, e por isso não caem no filtro de adiamento do `.claude/rules/right-sizing.md`.

### 3.1 Performance e LCP

- O **elemento LCP é uma decisão de design**, tomada na Fundação e escrita no `DESIGN.md` §6 — não
  algo que se descobre medindo depois.
- Imagem de LCP: dimensões declaradas, carregamento prioritário, **sem** `lazy`. O que está abaixo
  da dobra é que carrega tarde.
- **Conteúdo nasce visível** (CRAFT §8). Texto que nasce em `opacity: 0` esperando JS é achado
  (anti-pattern 12) e é também um LCP artificialmente adiado.
- Fonte com fallback declarado e sem lampejo de texto invisível — a voz tipográfica é da §4.5 do
  `DESIGN.md`; **como** ela carrega é gate desta categoria.

### 3.2 SEO técnico básico

- **Um** `h1` por página; ordem de heading sem buracos (anti-pattern 43). A estrutura de títulos é a
  estrutura do argumento — a mesma coisa serve o leitor de tela e o buscador.
- `title` e meta descrição **reais e específicos**, escritos com a voz da §9 do `DESIGN.md`. Valem as
  mesmas regras de copy: sem buzzword (63), sem placeholder poético (61).
- `alt` real em toda imagem não decorativa (anti-pattern 68); decorativa recebe `alt=""`.
- HTML semântico com landmarks únicos (CRAFT §10).
- A **imagem de compartilhamento** (OG) é entrega de design, com a assinatura da §3 — não uma sobra
  gerada no fim.

### 3.3 Imagens otimizadas

- Formato moderno, com fallback; `width` e `height` declarados em tudo, para não haver salto de
  layout.
- Variantes responsivas de verdade: servir a imagem de 1280 no 375 é custo puro no dispositivo em
  que a maioria chega.
- Foto do usuário, quando existir, segue a política da §7.2 do `DESIGN.md` **e** a regra de URL
  assinada e expirável do `CLAUDE.md` — otimizar nunca vira cache público.

---

## 4. Armadilhas desta categoria

Estes itens de `.claude/rules/design-antipatterns.md` são os que **esta categoria produz sozinha**,
por reflexo. A política geral continua valendo: nenhum é proibido em absoluto, todos exigem
justificativa registrada no `DESIGN.md` ligada a *este* produto e *este* público.

| Armadilha | Itens | Por que aparece aqui |
| --- | --- | --- |
| **Hero-template** | **2**, e junto **45**, **26**, **27**, **67** | Badge + título + subtítulo + dois botões é o default que sai sozinho quando ninguém decidiu a primeira dobra. Vem acompanhado de serifa itálica display gigante (45), gradiente roxo→ciano (26), texto com gradiente (27) e dica de rolagem (67). |
| **Seções-vitrine iguais** | **1**, **8**, **3**, **4**, **23** | Três cards idênticos como estrutura (1) e três seções da mesma família de layout (8) são o que faz a página parecer fôrma. O eyebrow em caixa alta acima de cada título (3), a numeração decorativa `01/02/03` (4) e o ícone em tile arredondado acima de cada título (23) são a decoração que tenta disfarçar isso. |
| **Depoimentos genéricos** | **64**, **71**, **25**, **60**, **61** | Prova social é a seção mais fácil de preencher com nada: nome inventado (64), número redondo (71), screenshot falso (25), lorem (60) ou frase poética de preenchimento (61). |
| **Copy de marketing por reflexo** | **63**, **62**, **73**, **69**, **74** | Buzzword (63), CTA genérico (62), cadência aforística repetida "não é X, é Y" (73), travessão como pontuação default (69) e mais de um registro de voz na mesma tela (74). |
| **Movimento como substituto de hierarquia** | **57**, **47**, **49** | Animação de entrada em cascata em todas as seções (57) e easing com overshoot (47) aparecem exatamente quando a hierarquia estática não está resolvida. O bloco `prefers-reduced-motion` ausente (49) vem no mesmo pacote. |
| **Ruído de página de produto** | **66**, **51**, **22** | Strip decorativo de metadados (66), marquee auto-rolante (51) e fundo de listras/grade sem superfície que peça (22). |

Faltam ainda os estados: página institucional também tem formulário, envio e erro. Só o estado
feliz implementado é achado (**58**), spinner genérico onde um esqueleto serve é achado (**59**) e
mensagem de erro que não nomeia problema nem saída é achado (**72**).

---

## 5. O que este playbook não decide

- **Identidade** — nome da direção, paleta, famílias tipográficas, assinatura visual, tom de voz:
  tudo isso é o `DESIGN.md` do projeto (`docs/design/DESIGN-TEMPLATE.md`), aprovado em Decision
  Gate (D-078, §9).
- **Piso de craft** — `docs/design/CRAFT-PRINCIPLES.md` vale integral, sem desconto de categoria.
- **Skill de direção estética ativa** — é o `docs/design/SKILL-ROUTER.md` que decide, por projeto.
