# Registro de variedade da fábrica

> **O que é isto.** O mecanismo **anti-homogeneização** da camada de Design Engineering
> (D-078, §8). Uma linha por projeto que passou pela Fundação, registrando **a identidade que
> ele levou**. O registro é **no nível da fábrica**, não do projeto: ele existe justamente para
> ser lido de fora, comparando um projeto com os outros.
>
> **O problema que ele resolve.** O baseline EV1.2 mediu o default inconsciente de um LLM: uma
> UI tecnicamente perfeita e visualmente muda. Esse default não some por projeto — ele reaparece
> **igual** no projeto seguinte. Duas marcas diferentes que chegam à mesma paleta e ao mesmo par
> tipográfico não descobriram a resposta certa; descobriram o mesmo default. Sem memória entre
> projetos, a fábrica converge sozinha e ninguém percebe, porque cada Fundação, isolada, parece
> defensável.

---

## Como usar

**Quem lê:** o `design-director`, no **passo 3 da Fundação** (`.claude/agents/design-director.md`)
— **antes** de explorar as direções, nunca depois de já ter uma proposta na mão. Consultar o
registro depois de escolher é procurar permissão, não evitar convergência.

**A regra:**

1. **A Fundação CONSULTA este registro antes de propor.** Ler as linhas existentes faz parte do
   passo 3; o que foi lido entra no relatório da Fundação.
2. **Convergir visualmente com um projeto recente exige justificativa ancorada** — e ancorada
   **nas três primeiras colunas**: *contexto/área de negócio*, *tipo/categoria de app* e o
   *projeto* em si. Convergência é: mesma família tipográfica, mesma temperatura de paleta,
   mesma densidade ou a mesma assinatura visual de uma linha já registrada.
3. **Justificativa ancorada** é a que liga a semelhança a uma restrição real e compartilhada —
   mesma área de negócio com convenção estabelecida, mesma categoria de interface com o mesmo
   padrão de leitura, mesmo público. "É o que funciona melhor", "é mais legível" e "combina com
   o produto" **não são âncoras**: servem para qualquer projeto, e é exatamente isso que as
   desqualifica.
4. **Sem justificativa ancorada → refazer a Fundação.** Não é um aviso a registrar e seguir: a
   proposta volta ao passo 4 (explorar ≥3 direções) e a convergência detectada entra na memória
   de design do projeto (§15) como alternativa descartada, com o motivo.

**Quem escreve:** a Fundação **aprovada** — a linha entra quando o dono aprova o `DESIGN.md`,
com os valores do documento aprovado, nunca do candidato. O registro é de fatos, não de
propostas.

**Nunca:** apagar ou reescrever uma linha existente. Se a identidade de um projeto mudar (o que
exige novo Decision Gate), **acrescente uma linha nova** com a data da mudança. Uma linha
removida é uma convergência que deixa de ser detectável.

---

## O registro

<!-- Uma linha por projeto, mais recente por último. Preencha assim:
     · Projeto              — nome do repositório/produto.
     · Contexto / área      — a área de negócio real (presentes personalizados, saúde, logística…).
     · Tipo / categoria     — a categoria de interface declarada na §0 do DESIGN.md.
     · Direção nomeada      — o nome próprio da §1. Adjetivo não é nome ("moderno", "clean",
                              "minimalista", "elegante", "premium" são proibidos pelo template).
     · Paleta               — os PAPÉIS principais, não a lista de hex: base, superfície, tinta,
                              acento (com o hex de cada um entre parênteses).
     · Par tipográfico      — display / texto.
     · Assinatura visual    — a da §3, descrita pela MECÂNICA, não pela impressão.
     · Data                 — a da aprovação do DESIGN.md (AAAA-MM-DD). -->

| Projeto | Contexto / área de negócio | Tipo / categoria de app | Direção nomeada | Paleta (papéis principais) | Par tipográfico | Assinatura visual | Data |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `personal-gift-project` — "Nossa História" | Presentes personalizados; livro impresso sob demanda sobre um casal | Site de produto/marketing (primária) + fluxo guiado, formulário multi-etapa (secundária) | **Tinta de Esferográfica** | base `#F2F4F7` (papel, neutros puxando azul) · superfície `#FFFFFF` (a folha) · tinta `#15181F` · acento **único** `#26397F` (azul de esferográfica) — paleta **fria**, sem creme, bege nem rosa; sem tema escuro | display/leitura **Lora** 400 (a fonte em que o livro é impresso) / voz do sistema **Archivo** 800 estreita — par de pesos 400 / 800 | **A régua de margem:** linha vertical de 1px contínua do topo ao rodapé de toda tela, a 24px (375) / 64px (≥768) da borda da coluna; à direita dela só entra o que vem do casal (Lora), à esquerda só a voz do sistema (Archivo 800/14). Nenhum elemento cruza a linha | 2026-08-13 |
