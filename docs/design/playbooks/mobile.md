# Playbook — mobile

> **Esqueleto — amadurece com o primeiro uso real (D-078).**
>
> Este arquivo existe para que a categoria tenha lugar e nome antes de ter conteúdo. Ele registra as
> ênfases óbvias e, principalmente, **o que ainda não está decidido**. Um esqueleto **não** é
> autoridade: até amadurecer, o que vale é `docs/design/CRAFT-PRINCIPLES.md` (piso) e
> `.claude/rules/design-antipatterns.md` (sempre), mais o `DESIGN.md` do projeto (identidade).
>
> **Nota de escopo.** Mobile é, quase sempre, **modificador de plataforma** e não categoria
> primária: combina com institucional, com painel, com editorial. Enquanto este playbook for
> esqueleto, declare a categoria primária real e trate isto como camada adicional — e registre as
> convenções de plataforma na §13 do `DESIGN.md`. Ver `docs/design/playbooks/README.md`.

---

## Ênfases óbvias

- **Alvo de toque ≥ 44px** de área efetiva, com espaço entre alvos vizinhos. Nenhuma densidade
  justifica alvo menor (CRAFT §7) — e área clicável precisa coincidir com a área visível.
- **Safe areas e insets** respeitados: notch, indicador de gesto, barra de status, teclado aberto.
  Superfície de altura total usa `dvh`, nunca `vh` (anti-pattern **6**).
- **Gesto × botão:** todo gesto tem equivalente visível e alcançável. Gesto é atalho para quem já
  sabe; nunca é o único caminho para uma ação — nem para descobrir que ela existe.
- **Zona do polegar:** ação primária ao alcance de uma mão; ação destrutiva fora dele.
- **HIG (Apple) e Material (Google) como referência de convenção**, não como identidade. Convenção
  de plataforma resolve o que o usuário já sabe fazer; a identidade continua vindo do `DESIGN.md`.
  Onde o produto quebrar a convenção de propósito, o motivo se escreve na §13.
- **Teclado virtual é um estado de layout**, não um acidente: o campo em foco continua visível, o
  botão de confirmação não fica embaixo do teclado, o tipo de teclado combina com o campo.
- **Rede e bateria são restrições de design:** peso da página, imagem sob conexão lenta, e o que
  acontece quando a conexão cai no meio de um envio (CRAFT §6, estado degradado).
- **Orientação e zoom:** paisagem não quebra, e o zoom até 200% preserva conteúdo e função
  (CRAFT §10).

## O que falta definir

- Escopo real: web responsiva, PWA instalável, WebView ou app nativo — cada um muda os gates.
- Como este playbook **compõe** com a categoria primária quando as duas dão orientações diferentes
  (ex.: densidade alta de painel × alvo de toque).
- Rubrica extra do `design-critic` específica de mobile, e se ela roda além dos 375/768/1280 do
  Visual Verification Loop (D-078, §7).
- Onde termina "seguir a convenção da plataforma" e começa "parecer um app template".
- Gates verificáveis: quais viram `[LINT]` determinístico na EV2.4 e quais ficam com o critic.
- Política de navegação (aba inferior, gaveta, empilhada) e se ela é decisão de playbook ou de
  `DESIGN.md`.
- Tratamento de `prefers-reduced-motion` frente às transições de navegação nativas.

## Como este esqueleto amadurece

Com o **primeiro projeto real** da categoria: o que a Fundação precisou decidir e não estava
escrito, e o que o critic achou no pós-render, viram as seções 1–4 no formato dos playbooks
completos (`institucional-marketing.md`, `saas-dashboard.md`). Amadurecer o esqueleto é trabalho de
uma issue própria, não do PR que o usou pela primeira vez.
