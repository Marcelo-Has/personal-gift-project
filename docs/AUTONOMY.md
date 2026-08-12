# AUTONOMY.md — Política de Autonomia

> Define o que a IA pode decidir/fazer sozinha e o que exige decisão humana (Decision
> Gate). Mantém a fábrica segura rodando sem você olhando. Em dúvida, escolha o caminho
> mais conservador e abra um Decision Gate.

## 1. A IA PODE fazer sozinha (dentro do ROADMAP)
- Ler o Blueprint e escolher próximas tarefas não bloqueadas.
- Criar, refinar e fechar issues de implementação.
- Escrever, editar e refatorar código.
- Escrever e rodar testes (unitários, integração, E2E, **testes de estilo** das skills).
- Abrir PRs, revisar e fazer merge **se o CI passar** (inclui scan de segurança e testes
  de estilo) e a mudança estiver dentro desta política.
- Corrigir bugs, atualizar dependências menores, melhorar performance, acessibilidade e
  **reduzir custo unitário** sem mudar preço nem escopo.
- Criar/evoluir **skills do produto** como novas versões, preservando anteriores e golden samples.
- Construir/evoluir o **dashboard admin** e a instrumentação de métricas.
- Aplicar o baseline de segurança (ARCHITECTURE.md, Parte 3).
- Gerar documentação, changelog e release notes.
- Deploy para **staging** automaticamente.

## 2. A IA PRECISA de decisão humana (Decision Gate)
Abra issue `decision-needed` (Opções + Recomendação + o que bloqueia + outras tarefas
disponíveis). Não prossiga no item bloqueado. Gatilhos:
- **Dinheiro real:** definir/alterar **preço** (por estilo e tamanho); contratar serviço
  pago; provedor de imagem/impressão que impacte custo; gasto recorrente.
- **Produção com pagamento real:** primeiro deploy em `prod` e ativar cobrança real (sair do teste).
- **Dados pessoais / LGPD / vazamento:** retenção e **exclusão das fotos**; privacidade e
  termos; base legal/consentimento; qualquer coisa que exclua/exponha/amplie dados de usuário.
- **Catálogo:** quais estilos e tamanhos entram na V1 (criar a skill é livre; publicá-la
  como opção de compra é Gate).
- **Identidade visual e narrativa:** nome comercial, logo, "look" de cada estilo, tom da narrativa.
  O fluxo completo está decidido em **D-078 §9** e é este:
  1. **A Fundação propõe.** `/design-foundation`, conduzida pelo `design-director`, roda **uma
     vez por projeto** e entrega um **`DESIGN.md` CANDIDATO** acompanhado de **≥3 direções
     nomeadas e distintas** (com a escolhida e o porquê) e da **autocrítica anti-default** —
     *"um brief semelhante, dado a qualquer gerador, chegaria a este mesmo resultado?"* — com o
     que ela mudou na proposta. A Fundação **para aí**: nunca escreve `Status: aprovado`, nunca
     preenche o campo `Gate`. Enquanto o documento for candidato, **nenhum código de UI deriva
     dele**.
  2. **O dono aprova.** Escolher a identidade é decisão humana, não formalidade de fim de
     processo. A aprovação carimba `Status: aprovado`, a data e o gate na §0 do `DESIGN.md`.
  3. **O `DESIGN.md` aprovado é AUTORIDADE.** A partir daí a **Construção roda autônoma dentro
     dele**: toda tarefa de UI **deriva** dos tokens e das seções aprovadas — não inventa
     valores — e **não** abre gate por tarefa. Quem fiscaliza é o `design-critic` (read-only,
     por PR de UI) e os quality gates do CI, não um novo gate humano.
  - **Alterar o `DESIGN.md` aprovado = novo `decision-needed`, sempre.** Vale para qualquer
    seção aprovada, e vale por menor que pareça a mudança. Discordar do que está lá é motivo
    para abrir o gate — nunca para desviar em silêncio dentro de uma tarefa.
  - **Rastro obrigatório:** rejeições, alternativas descartadas e iterações aprovadas ficam
    registradas na **memória de design** (§15 do `docs/design/DESIGN-TEMPLATE.md`), que é
    **append-only**: entrada existente não se edita nem se apaga. Rejeição sem motivo escrito
    não conta — reabre sozinha na semana seguinte.
- **Mudanças de produto:** qualquer alteração no que está em PRODUCT.md.
- **Ações irreversíveis:** apagar dados, deletar recursos de produção, trocar provedor de
  impressão depois de haver pedidos reais.
- **Segurança de alto impacto:** autenticação, autorização, regras do Firebase, segredos,
  ou qualquer coisa que possa expor dados. (Aplicar o baseline é livre; afrouxá-lo é Gate.)

## 3. Regras permanentes (nunca violar)
- Nunca commitar segredos.
- Nunca fazer merge com CI vermelho.
- Nunca enfraquecer o baseline de segurança sem Gate.
- Nunca expor dados de usuário (sem storage público, sem PII em logs, URLs assinadas).
- Nunca alterar PRODUCT/AUTONOMY/DECISIONS sem Gate aprovado (pode propor).
- Nunca quebrar um estilo existente: melhorias vão como nova versão + testes.
- Nunca cobrar de cliente real fora de um fluxo aprovado.
- Toda decisão relevante vira entrada em DECISIONS.md.

## 4. Exemplo de Decision Gate
```
[DECISION] Retenção das fotos enviadas pelo casal
Opção A — Excluir 30 dias após a impressão.
Opção B — Manter até o usuário pedir exclusão.
Recomendação: A (menor risco de LGPD e vazamento).
Bloqueia: #313 (pipeline de exclusão)
Outras tarefas disponíveis: #121, #241, #407
```
Você responde "A"; uma Action grava em DECISIONS.md, remove o bloqueio e a tarefa volta
para a fila. Enquanto isso, a fábrica segue no resto.

## 5. Limites operacionais (recomendado)
- `--max-turns` e timeout por job; concurrency control.
- Teto/alerta de billing de API (revisar semanalmente no Mês 1), acompanhado no dashboard.
- Segredos com menor privilégio; rotação periódica.
