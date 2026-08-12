---
description: Conduz a Fundação de design de um projeto (roda UMA vez): lê design/assets/, explora 3 direções nomeadas, aplica a autocrítica anti-default e produz o DESIGN.md CANDIDATO. Termina no gate humano — nunca aprova identidade. Uso: /design-foundation
---

Você vai conduzir a **Fundação de design** deste projeto, no papel do `design-director`
(`.claude/agents/design-director.md`). A Fundação roda **uma vez por projeto** ([D-078] §1) e
produz o `DESIGN.md` — a fonte de verdade visual de que toda tarefa de UI vai derivar depois.

**Antes de começar, confira se ela já rodou.** Se existe `DESIGN.md` na raiz com
`Status: aprovado`, **pare**: alterar identidade aprovada é **novo Decision Gate** (D-078 §9), não
uma nova Fundação. Se existe com `Status: candidato`, você está retomando um candidato — continue
de onde ele parou em vez de recomeçar.

Leia primeiro o contrato do papel (`.claude/agents/design-director.md`) e depois execute os sete
passos abaixo, na ordem.

## 1. Ler `design/assets/` inteiro — R-ASSETS

Convenção em `docs/design/BRAND-ASSETS.md`. Leia os quatro itens, **inclusive os vazios**:
`logos/`, `images/`, `palette.md`, `references.md`.

**Anote o que encontrou em cada um** — essa lista é artefato de saída e vai para a §14 do
`DESIGN.md`. Asset existente é **fonte primária**; criação do zero só na ausência **comprovada por
esta leitura**.

## 2. Ler o contrato de entrada

- `docs/PRODUCT.md` **§8.1–8.3** — quem compra e quem recebe, mercado e posicionamento,
  personalidade da marca. Os campos **[A CONFIRMAR NA FUNDAÇÃO — P6]** são lacunas que esta sessão
  **propõe** e o dono aprova.
- O **playbook da categoria** de interface do projeto (`docs/design/playbooks/README.md` faz o
  roteamento). Playbook *esqueleto* é anotação, não autoridade; categoria sem playbook é normal.
- `docs/design/CRAFT-PRINCIPLES.md` e `.claude/rules/design-antipatterns.md` — o piso, que a
  Fundação não rebaixa.
- `docs/design/DESIGN-TEMPLATE.md` — o molde que você vai preencher no passo 6.

## 3. Consultar o registro de variedade, se existir

D-078 §8. **Se não existir como arquivo, registre isso e siga** — não invente o registro.
Onde existir: convergir com um projeto recente exige **justificativa ancorada** em contexto do
produto, tipo de app e área de negócio.

## 4. Explorar ≥3 direções NOMEADAS e distintas

Três direções, **não** três variações do mesmo default. Cada uma com:

- **nome próprio** que evoca um mundo concreto — adjetivo ("moderno", "clean", "premium") é
  proibido pela §1 do template;
- **referência real** no formato *"como X faz Y"*, **anti-referência** com o que exatamente se
  recusa, e uma **assinatura candidata** descrita pela mecânica;
- **a consequência prática** em tipografia, cor, densidade e motion, para as três serem comparáveis.

Três propostas com a mesma família tipográfica, a mesma temperatura de paleta e a mesma densidade
são uma direção e dois ajustes: volte e refaça.

## 5. Autocrítica anti-default

> **"Um brief semelhante, dado a qualquer gerador, chegaria a este mesmo resultado?"**

Se a resposta honesta for "provavelmente sim", é o default vestido de decisão. **Escreva o que a
autocrítica mudou** — o que havia antes, o que ficou depois, e por quê. Se não mudou nada, escreva
isso; autocrítica que não muda nada não aconteceu.

## 6. Preencher o `DESIGN.md` CANDIDATO

Copie `docs/design/DESIGN-TEMPLATE.md` para `DESIGN.md` na raiz do projeto e preencha **campo a
campo**:

- apague as linhas de instrução (`<!-- COMO PREENCHER -->`, `> _Exemplo:_`) e **mantenha** a seção
  "As três regras deste documento";
- **§0**: `Status: candidato`, data de hoje, **campo `Gate` vazio**, categoria de interface e perfil
  de stack preenchidos;
- **nenhum `[A PREENCHER]` sobrando**; campo que não se aplica recebe `Não se aplica —` seguido do
  motivo;
- **§4** com tokens semânticos e o **contraste verificado aqui** (WCAG AA é piso, não descoberta do
  critic);
- **§14** com a proveniência de cada decisão (`derivada-de-asset` / `criada-na-Fundação` /
  `herdada-de-DS-existente` + fonte) e a **lista de assets lidos** no passo 1;
- **§15**, primeira entrada: as direções descartadas no passo 4, cada uma com o motivo ligado ao
  produto, ao público ou a uma restrição concreta.

## 7. PARAR no gate humano

Apresente o resultado ao dono e **pare**.

### Artefatos de saída desta skill

1. **`DESIGN.md` candidato** na raiz do projeto — template completo, `Status: candidato`.
2. **Resumo das 3 direções** — as três nomeadas, **qual foi a escolhida e por quê**, e o que a
   autocrítica do passo 5 mudou.
3. **Lista do que foi lido em `design/assets/`** — a mesma que sustenta a §14.

### O gate

Esta skill **nunca** marca a identidade como aprovada: não escreve `Status: aprovado`, não preenche
o campo `Gate`, e não deriva código de UI do candidato. Quem aprova identidade é **o dono, sempre**
(D-078 §9) — e "Identidade visual e narrativa" já é Decision Gate aberto em `docs/AUTONOMY.md` §2.

Terminar aqui é o **desfecho correto** da Fundação, não trabalho pela metade. Depois da aprovação,
a Construção (`developer-lead` + `developer-frontend`) roda autônoma **derivando** deste arquivo.
