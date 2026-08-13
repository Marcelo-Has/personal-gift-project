# DESIGN-CRITIC-RUBRIC.md — Rubrica do design-critic (fonte única, versionada)

> Artefato de CORE (opinionado). O design-critic (workflow read-only, fail-closed, D-034)
> avalia o renderizado SEMPRE por esta rubrica — nunca deriva critérios em runtime. A
> variedade entre projetos vem do `DESIGN.md` de cada projeto, jamais desta régua.
>
> **Inspiração absorvida (§21 — princípio absorvido, sem dependência):** estrutura em 3
> pilares de Microsoft `frontend-design-review` (Frictionless / Quality Craft /
> Trustworthy); padrão "N dimensões × severidade × saída em arquivo" de jezweb
> `design-review`; testes operacionais swap/squint/signature/token de `interface-design`.
> Redigida nos nossos termos; se qualquer fonte sumir, esta rubrica não muda.

## Estrutura de avaliação

3 pilares (frame) → 7 dimensões (o que se avalia) → severidade por achado (High/Med/Low).
Saída: arquivo de veredito, publicado por step não-IA (D-034), fail-closed.

## Severidade

- **High** — viola o contrato do `DESIGN.md`, quebra um pilar, ou falha o teste final de
  originalidade. **Qualquer High → reprova** (mesmo funcionalmente correto).
- **Med** — deve corrigir; não bloqueia sozinho, mas 2+ Med na mesma dimensão = reprova.
- **Low** — polimento; registrar, não bloquear.

## As 7 dimensões (mapeadas nos 3 pilares)

1. **Hierarquia, composição e responsividade** *(Quality Craft)* — foco, ritmo, densidade,
   grid, uso do espaço; o olho sabe para onde ir. A composição é **projetada por
   breakpoint** (375/768/1280), não esticada; sem overflow.
2. **Sistema tipográfico** *(Quality Craft)* — escala, pesos e contraste de peso conforme o
   `DESIGN.md` (neste produto: Lora 400 × Archivo 800), legibilidade, medida de linha.
3. **Cor, superfície e elevação** *(Quality Craft / Trustworthy)* — usa os tokens
   semânticos do `DESIGN.md` (nada hardcoded fora do sistema), contraste suficiente,
   profundidade/elevação coerentes; paleta fiel (aqui: fria, acento único #26397F).
4. **Fluxo e affordances** *(Frictionless)* — a ação é óbvia, há feedback, a navegação não
   tem becos-sem-saída; interações previsíveis; sem gestos/hover decorativos que enganam.
5. **Estados e resiliência** *(Frictionless / Trustworthy)* — empty / error / loading /
   overflow / offline **desenhados** nos componentes-chave; nada quebra sob dado real,
   longo ou ausente.
6. **Conteúdo e microtexto** *(Trustworthy)* — voz do usuário, voz ativa, nomes
   consistentes, erros acionáveis; **nunca lorem ipsum**; a11y qualitativa que o score não
   pega (foco visível, ordem de leitura, rótulos).
7. **Coerência de identidade / signature test** *(Quality Craft / Trustworthy)* — bate com
   o `DESIGN.md` e sua **assinatura visual** (aqui: a régua de margem); passa os testes
   swap (troque o logo — ainda é reconhecível como este produto?), squint, signature e
   token. **Não "parece shadcn/genérico".**

## Teste final (obrigatório)

**"Poderia ter saído de qualquer prompt parecido?"** Se sim → **reprova como High na
dimensão 7, mesmo funcionalmente correto.** É o teste anti-default do produto.

## Insumos do critic

Screenshots multi-viewport (375/768/1280) da onda Q2 + `DESIGN.md` + a rule de
anti-patterns (`.claude/rules/…`). **Sem evidência de screenshot → fail-closed (vermelho).**
