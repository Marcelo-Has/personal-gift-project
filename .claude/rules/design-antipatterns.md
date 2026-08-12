---
paths:
  - "src/routes/**"
  - "src/lib/components/**"
  - "src/app.html"
  - "**/*.svelte"
  - "**/*.css"
---
# Anti-patterns de design (carregam ao tocar UI)

## A política

Nada nesta lista é proibido em absoluto. **É proibido como default inconsciente** — a escolha que
sai sozinha quando ninguém decidiu nada. Cada item é permitido quando existir **justificativa
registrada e ligada ao produto**: uma linha no `DESIGN.md` do projeto dizendo por que *este*
produto, para *este* público, quer *isto*. Sem essa linha, o item é achado.

**O brief explícito do dono vence.** Se o pedido nomeia o padrão ("quero glassmorphism", "faz em
dark mode"), ele deixa de ser default inconsciente e passa a ser requisito — registre no `DESIGN.md`
e siga. A ordem de autoridade é: **brief do dono > `DESIGN.md` do projeto > esta regra > skill
estética ativa** (ver `docs/design/SKILL-ROUTER.md`).

Os princípios que sustentam esta lista estão em `docs/design/CRAFT-PRINCIPLES.md`. Esta lista vale
**sempre**, com qualquer skill de direção estética ativa.

## Como ler as marcas

- **[LINT]** — verificável por grep/AST/regra estática. Vira gate determinístico no CI na EV2.4.
  Enquanto o gate não existe, é checagem manual do `developer-frontend`.
- **[CRITIC]** — exige julgamento sobre o resultado renderizado. É checklist do `design-critic`,
  pós-render, nunca lint.

Achado não é veto automático: ou se corrige, ou se registra a justificativa. O que **não** é
aceitável é o item existir sem nenhuma das duas coisas.

---

## Estrutura e composição

1. [CRITIC] Grid de cards idênticos (ícone + título + parágrafo, 3 iguais) como estrutura da página.
2. [CRITIC] Hero centrado no padrão badge + título + subtítulo + dois botões.
3. [CRITIC] Eyebrow / kicker (rótulo pequeno em caixa alta) acima de cada título de seção.
4. [LINT] Numeração decorativa de seção (`01` / `02` / `03`) que não carrega informação de sequência.
5. [LINT] Card dentro de card.
6. [LINT] `100vh` em superfície de altura total, onde o certo é `100dvh`.
7. [LINT] Aritmética de porcentagem em flex (`calc(33% - 1rem)`) onde CSS Grid resolve.
8. [CRITIC] Mesma família de layout em três seções consecutivas (zigzag imagem+texto repetido).
9. [CRITIC] Espaçamento monótono: o mesmo valor entre tudo, sem agrupamento por proximidade.
10. [CRITIC] Célula vazia deixada num grid tipo bento para "fechar" a fôrma.
11. [CRITIC] Modal para uma tarefa que não precisa interromper nem proteger o foco.
12. [LINT] Conteúdo que nasce em `opacity: 0` / `visibility: hidden` esperando JS para aparecer.
13. [CRITIC] Colapso mobile não declarado no mesmo lugar em que o layout multi-coluna foi definido.

## Superfície e materialidade

14. [LINT] Glassmorphism / `backdrop-filter` decorativo, sem sobreposição real de camadas.
15. [LINT] Sombra multicamada decorativa (três ou mais `box-shadow` empilhadas no mesmo elemento).
16. [LINT] Halo colorido de offset zero (glow) fazendo as vezes de elevação.
17. [LINT] Borda hairline **e** sombra larga difusa no mesmo elemento: escolha uma.
18. [LINT] `border-radius` gigante e uniforme (≥ 24px em tudo, do botão ao contêiner de página).
19. [LINT] Faixa colorida grossa (`border-left`/`border-right` > 1px) em card, callout ou alerta.
20. [LINT] Emoji no lugar de ícone.
21. [LINT] Ícones de famílias diferentes no mesmo produto, ou espessuras de traço inconsistentes.
22. [LINT] Fundo decorativo de listras ou grade via `repeating-linear-gradient` sem superfície que peça.
23. [CRITIC] Ícone dentro de tile arredondado acima de cada título.
24. [CRITIC] SVG montado à mão imitando ilustração, foto ou cena.
25. [CRITIC] Screenshot falso do produto construído com `div`s.

## Cor

26. [LINT] Gradiente roxo → ciano/lilás como paleta default.
27. [LINT] Texto com gradiente.
28. [LINT] Preto puro (`#000`) como texto ou fundo.
29. [LINT] Cinza neutro como texto sobre fundo colorido.
30. [LINT] Valor de cor literal no componente em vez de token semântico do `DESIGN.md`.
31. [LINT] Contraste abaixo de WCAG AA (4,5:1 corpo, 3:1 texto grande e limites de componente).
32. [CRITIC] Dark mode como identidade única do produto, escolhido por reflexo e não pelo uso.
33. [CRITIC] Tema invertido no meio da página (uma seção clara entre seções escuras).
34. [CRITIC] Mais de uma cor de acento sem papel semântico declarado.
35. [CRITIC] Bege/creme "de bom gosto" como superfície default de produto afetivo ou artesanal.

## Tipografia

36. [LINT] Inter, Roboto ou a fonte de sistema como voz tipográfica default do produto.
37. [LINT] Tela inteira em 400/500, sem par de pesos contrastantes (200/800 ou equivalente).
38. [LINT] Escala de tamanhos achatada — razão menor que ~1,2 entre passos vizinhos.
39. [LINT] `letter-spacing` além de -0,04em.
40. [LINT] Medida de linha do corpo fora da faixa de 45–75 caracteres.
41. [LINT] Corpo de texto abaixo de 16px, ou texto de UI abaixo de 14px.
42. [LINT] Caixa alta em texto corrido, ou texto justificado.
43. [LINT] Nível de heading pulado (`h2` → `h4`) ou usado por tamanho em vez de estrutura.
44. [LINT] `font-size` literal fora da escala tipográfica do `DESIGN.md`.
45. [CRITIC] Serifa itálica display gigante como headline de hero.
46. [CRITIC] Ênfase trocando de família (palavra serifada dentro de um título sem serifa).

## Comportamento

47. [LINT] `bounce` / `elastic` / cubic-bezier com overshoot como easing default.
48. [LINT] `scale` ou `translateY` de hover aplicado como default a tudo que é clicável.
49. [LINT] Ausência de bloco `prefers-reduced-motion` onde existe animação.
50. [LINT] Animar `width`, `height`, `top`, `left`, `margin` ou `padding`.
51. [LINT] Marquee auto-rolante, ponto pulsante decorativo ou cursor piscando fora de campo editável.
52. [LINT] Cursor customizado.
53. [LINT] `window.addEventListener('scroll', ...)` dirigindo animação, em vez de IntersectionObserver ou animação por scroll do CSS.
54. [LINT] Imagem que escala ou rotaciona no hover.
55. [LINT] `outline: none` no foco sem indicador visível de substituição.
56. [LINT] `placeholder` usado como rótulo de campo.
57. [CRITIC] Animação de entrada em cascata aplicada a todas as seções da página.
58. [CRITIC] Só o estado feliz implementado — faltam vazio, carregando, erro, overflow ou offline.
59. [CRITIC] Spinner circular genérico onde um esqueleto com a forma do resultado final serve.

## Conteúdo e copy

60. [LINT] Lorem ipsum ou qualquer texto de preenchimento.
61. [LINT] Placeholder poético do tipo "Your Journey Starts Here" / "Bem-vindo à sua jornada".
62. [LINT] "Get Started" / "Comece agora" em botão azul genérico como CTA primário.
63. [LINT] Buzzword de marketing: revolucione, potencialize, experiência única, next-gen, seamless.
64. [LINT] Dado de exemplo genérico ("João Silva", "Acme", "usuario@email.com").
65. [LINT] Rótulo de etapa genérico ("Etapa 1 / Etapa 2 / Etapa 3") no lugar do nome da etapa.
66. [LINT] Strip decorativo de metadados (cidade · hora · versão · build) em página de produto.
67. [LINT] Dica de rolagem ("↓ role para explorar", ícone de mouse animado).
68. [LINT] `alt` ausente, ou genérico ("imagem", "foto"), em imagem que não é decorativa.
69. [LINT] Travessão (—) em copy de interface como default de pontuação. Texto narrativo do livro é exceção declarada — ali o travessão é da língua, não do LLM.
70. [CRITIC] Dois CTAs com a mesma intenção na mesma página com rótulos diferentes.
71. [CRITIC] Número redondo demais apresentado como dado real (99,9%, 50%, 10x).
72. [CRITIC] Mensagem de erro que não nomeia o problema nem a saída.
73. [CRITIC] Cadência aforística repetida ("Não é X. É Y.", "X. Só Y.") em três ou mais seções.
74. [CRITIC] Mais de um registro de voz na mesma tela sem que a marca peça.

---

*Lista absorvida de **Impeccable** (Apache 2.0) e **taste-skill** (MIT), reescrita. Os detectores e
bans dessas duas fontes foram lidos, traduzidos para o nosso vocabulário e reformulados como regras
curtas e verificáveis; nenhum texto foi copiado. A classificação [LINT]/[CRITIC], o escopo por
paths do repositório e a política de justificativa registrada são nossos.*
