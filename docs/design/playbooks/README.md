# Playbooks de categoria de interface

> **O que é isto.** A camada de **estratégia por categoria de interface** da Design Engineering
> (D-078). Um playbook responde: nesta categoria de produto, **onde a Fundação concentra o esforço**,
> **o que o `design-critic` olha com mais rigor** e **que gates específicos ativam**.
>
> **O que um playbook nunca é.** Não é identidade. Nenhum playbook escolhe paleta, família
> tipográfica, estilo, nome de direção ou assinatura visual — isso é o `DESIGN.md` de cada projeto,
> aprovado em Decision Gate (D-078, §9). Playbook com escolha de identidade dentro é defeito do
> playbook, não decisão do projeto.

---

## Os arquivos

| Playbook | Categoria | Estado |
| --- | --- | --- |
| [`institucional-marketing.md`](institucional-marketing.md) | Site institucional, página de produto, landing de conversão | **Completo** — categoria do produto atual |
| [`saas-dashboard.md`](saas-dashboard.md) | Painel operacional, produto interno, console | **Completo** — categoria dos briefs do benchmark EV2.5 |
| [`mobile.md`](mobile.md) | Superfície móvel (modificador de plataforma) | Esqueleto |
| [`editorial.md`](editorial.md) | Superfície de leitura, texto longo | Esqueleto |
| [`data-heavy.md`](data-heavy.md) | Análise e exploração de grande volume | Esqueleto |

**Esqueleto** significa: a categoria tem lugar e nome, as ênfases óbvias estão anotadas e a lista do
que falta decidir está escrita. Um esqueleto **não é autoridade** — enquanto não amadurecer, valem
apenas o piso de craft, os anti-patterns e o `DESIGN.md`. Ele amadurece **com o primeiro uso real**,
em issue própria, nunca dentro do PR que o usou pela primeira vez.

---

## Como um projeto declara a categoria

No campo **Categoria de interface** da §0 do `DESIGN.md` (`docs/design/DESIGN-TEMPLATE.md`): **uma
primária e, no máximo, uma secundária**. É essa declaração que decide qual playbook entra.

O vocabulário do template e os arquivos deste diretório se correspondem assim:

| Categoria declarada na §0 | Playbook |
| --- | --- |
| site de produto/marketing | `institucional-marketing.md` |
| painel operacional/dashboard | `saas-dashboard.md` |
| superfície de leitura | `editorial.md` (esqueleto) |
| e-commerce e checkout · fluxo guiado · ferramenta de criação | **sem playbook ainda** — craft + anti-patterns + `DESIGN.md` |

Duas observações de fronteira:

- **`mobile.md` não é categoria primária.** É modificador de plataforma: combina com qualquer
  categoria e conversa com a §13 do `DESIGN.md` (regras de plataforma).
- **`data-heavy.md` é especialização de `saas-dashboard.md`**, não substituto. Enquanto for
  esqueleto, use o painel como base e as ênfases dele como camada.

Categoria sem playbook é situação normal, não lacuna a preencher por antecipação: o playbook nasce
do primeiro projeto real da categoria (`.claude/rules/right-sizing.md`).

---

## Como o playbook compõe com o resto

São três camadas com papéis distintos, e nenhuma faz o trabalho da outra:

| Camada | O que decide | Escopo |
| --- | --- | --- |
| `docs/design/CRAFT-PRINCIPLES.md` + `.claude/rules/design-antipatterns.md` | **O piso.** A mecânica que separa uma tela construída de uma tela montada, e o que é proibido como default inconsciente. | Toda interface da fábrica, sempre |
| **Playbook de categoria** (este diretório) | **A estratégia.** Onde focar, o que o critic olha com mais rigor, que gates ativam. | Todos os projetos de uma mesma categoria |
| `DESIGN.md` do projeto | **A identidade.** Direção, tokens, assinatura, voz. | Um projeto |

O playbook fica **entre** as outras duas e não sobrescreve nenhuma:

- **Para baixo, nunca rebaixa o piso.** Onde o craft admite uma faixa — densidade, peso do motion,
  quanto contêiner é demais — o playbook escolhe dentro dela e **justifica pela tarefa** da
  categoria. Onde o craft fecha uma questão, o playbook obedece. Um playbook só pode **apertar** a
  exigência; nunca afrouxar.
- **Para cima, nunca decide identidade.** O playbook diz que a primeira dobra carrega peso
  emocional; **qual** peso, com que direção e com que voz, é o `DESIGN.md`.

### Ordem de desempate

> **`DESIGN.md` do projeto → playbook de categoria → `CRAFT-PRINCIPLES.md`**
> — e **`design-antipatterns.md` vale sempre**, em qualquer posição da disputa.

Como ler isso sem contradizer `docs/design/SKILL-ROUTER.md`: na cadeia de autoridade de lá — *brief
explícito do dono → `DESIGN.md` → conceitos absorvidos no core → skill de direção estética → skill
de mecânica* — o playbook é **uma especialização dos conceitos do core**, logo abaixo do
`DESIGN.md` e acima de qualquer skill. Ele aparece antes do craft na ordem acima apenas porque
**escolhe dentro do que o craft deixa em aberto**; onde o craft não deixa nada em aberto, não há
disputa a desempatar.

Os anti-patterns ficam fora dessa hierarquia de propósito. Um playbook pode dizer **onde procurar**
um item e **com que rigor** (é o que `saas-dashboard.md` faz com o item 8), e pode declarar que um
item **não tem válvula de escape** naquela categoria (é o que faz com o item 2). O que ele não pode
é dispensar um item: a única saída para um anti-pattern continua sendo a **justificativa registrada
no `DESIGN.md`, ligada a este produto e a este público**.

Se um playbook e o `DESIGN.md` aprovado entrarem em conflito real, ganha o `DESIGN.md` — e o
caminho para corrigir o playbook é uma issue própria, nunca o desvio silencioso dentro da tarefa.

---

## Quem lê e quando

- **`design-director`**, na **Fundação**: lê o playbook da categoria declarada **antes** de propor a
  direção, e usa a seção "Onde a Fundação foca" para saber o que o `DESIGN.md` precisa entregar a
  mais nessa categoria.
- **`developer-frontend`**, na **Construção**: lê a seção de gates e atenções junto do `DESIGN.md`,
  no início da tarefa.
- **`design-critic`**, **pós-render**: aplica a rubrica extra do playbook **somada** ao checklist
  `[CRITIC]` dos anti-patterns e ao teste *"isso poderia sair de qualquer prompt parecido?"* — nunca
  no lugar deles.

## Como se cria um playbook novo

Quando o primeiro projeto de uma categoria sem playbook termina a Fundação. O conteúdo sai de duas
fontes: **o que a Fundação precisou decidir e não estava escrito em lugar nenhum**, e **o que o
critic achou no pós-render que era característico da categoria, não do projeto**. Formato: as cinco
seções dos playbooks completos — foco da Fundação, rubrica extra do critic, gates e atenções,
armadilhas com os números dos anti-patterns, e o que o playbook não decide.
