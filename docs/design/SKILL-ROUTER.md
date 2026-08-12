# Roteador de skills de design

> **O que é isto.** A tabela de roteamento da camada de Design Intelligence (D-078, §4). Diz
> **qual** skill de design entra, **quando** entra e **sob que condição** — e, principalmente, o que
> nenhuma delas pode sobrescrever.
>
> Existe porque skills de design se sobrepõem. Duas direções estéticas ativas ao mesmo tempo não
> somam: produzem uma tela que não é nenhuma das duas. Este documento é o desempate, escrito antes
> de o conflito acontecer.

---

## As fases

O processo de design da fábrica tem duas fases (D-078, §1). O roteamento é por fase.

- **Fundação** — roda **uma vez por projeto**, conduzida pelo `design-director`. Produz o
  `DESIGN.md`: identidade, tokens semânticos, direção estética, memória de design. **Nenhum código
  de UI antes de o `DESIGN.md` existir.**
- **Construção** — toda tarefa de UI, conduzida pelo `developer-frontend`. **Deriva** dos tokens do
  `DESIGN.md`; não inventa valores.
- **Pós-render** — a crítica. Roda sobre a tela renderizada, nunca sobre o código antes de existir
  pixel.

## A tabela

| Skill | Responsabilidade | Momento | Condição de ativação |
| --- | --- | --- | --- |
| **`frontend-design`** | Direção estética: composição, linguagem visual, tradução do posicionamento do produto em decisões de tela. É a skill que dá *voz* à interface. | Fundação (define a direção) e Construção (aplica) | **Default.** Ativa em todo projeto que não tenha optado por outra direção. |
| **Impeccable** | Direção estética alternativa, com vocabulário próprio de craft e um conjunto de comandos de refino. | Fundação e Construção | **Opt-in por config do projeto.** Nunca junto com `frontend-design` — ligar uma desliga a outra. |
| **shadcn (skill / CLI)** | Mecânica de componentes: scaffolding de primitivas acessíveis que o projeto passa a **possuir** e customizar. Não é identidade visual. | Construção apenas | **Perfil de stack.** Só quando o perfil do projeto é compatível e o `DESIGN.md` já existe. Entra como **skill/CLI, não como MCP**. Componente entregue em estado default é achado, não entrega. |
| **SkillUI** | Mecânica de componentes e padrões de interface para o caso **"DS existente"**: o projeto já tem design system ou biblioteca definida e o trabalho é aderir a ela, não criar linguagem nova. | Construção apenas | **Caso "DS existente".** Ativa quando o `DESIGN.md` registra um design system herdado como fonte de verdade. |
| **`design-critic`** | Crítica independente, read-only: aplica o checklist [CRITIC] e o teste *"isso poderia sair de qualquer prompt parecido?"*. | **Pós-render apenas** | **Default** em todo PR que toca UI. Veredito em arquivo publicado por step não-IA, fail-closed. |

**Component library ≠ design system ≠ identidade.** shadcn e SkillUI entregam mecânica. A
identidade continua vindo do `DESIGN.md`. Se a tela pronta é reconhecível como "uma tela de
biblioteca X", a mecânica venceu a identidade — e isso é o defeito, não o resultado.

## As três regras invariantes

Estas não têm exceção por configuração de projeto.

### 1. Máximo uma direção estética ativa

`frontend-design` **ou** Impeccable. Nunca as duas. Direção estética é um sistema de escolhas
coerentes entre si; misturar dois sistemas produz incoerência com aparência de variedade. Mecânica
de componentes (shadcn, SkillUI) **não** conta como direção estética e pode coexistir com a direção
ativa — desde que subordinada a ela.

### 2. Crítica só pós-render

Nenhuma skill de crítica opina antes de existir tela renderizada. Crítica sobre código-fonte
antecipa problemas que o render desmente e deixa passar os que só aparecem no pixel. O
`design-critic` roda sobre screenshots em 375/768/1280 (D-078, §7), depois do build, nunca antes.

### 3. O `DESIGN.md` do projeto vence qualquer conflito

Skill contra `DESIGN.md`: ganha o `DESIGN.md`, sempre, sem discussão e sem "mas a skill recomenda".
O `DESIGN.md` é aprovado pelo dono num Decision Gate (D-078, §9); uma skill é uma heurística.
Heurística não sobrescreve decisão aprovada. Se a skill está certa e o `DESIGN.md` está errado, o
caminho é **novo gate para alterar o `DESIGN.md`** — não desviar em silêncio na tarefa.

Ordem completa de autoridade, do mais forte para o mais fraco:

> **brief explícito do dono → `DESIGN.md` do projeto → conceitos absorvidos no core → skill de
> direção estética ativa → skill de mecânica de componentes**

## Os conceitos absorvidos valem sempre

`docs/design/CRAFT-PRINCIPLES.md` e `.claude/rules/design-antipatterns.md` são **do core**, não de
nenhuma skill. Eles valem:

- com `frontend-design` ativa;
- com Impeccable ativa;
- com shadcn ou SkillUI em uso;
- e quando **nenhuma** skill de design está ativa.

Foi exatamente por isso que os detectores e bans das skills externas foram **absorvidos e
reescritos no core** (D-078, §4) em vez de virarem dependência: uma regra que só existe enquanto
uma skill específica está ligada não é um piso de qualidade — é um efeito colateral de
configuração. Trocar a direção estética do projeto muda o *gosto*; não muda o **piso**.

## Onde isto é aplicado

Este documento é roteamento, não enforcement. Os gates que fazem valer — lint determinístico do
subconjunto [LINT], checklist [CRITIC] do `design-critic`, Visual Verification Loop, teto de 3
rodadas de iteração — são a EV2.4 (D-078, §7).
