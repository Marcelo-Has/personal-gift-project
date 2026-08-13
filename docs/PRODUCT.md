# PRODUCT.md — Personal Gift Project

> Este documento é o "contrato de produto" entre você (humano) e a IA que vai
> construir e manter o projeto de forma autônoma. Fonte da verdade sobre "o que
> estamos construindo". A IA NÃO muda decisões de produto por conta própria — só
> propõe mudanças via Decision Gate (ver AUTONOMY.md).

## 1. Visão em uma frase
Uma plataforma de **presentes personalizados**, totalmente construída e mantida por
IA, cujo primeiro produto é o mini livro **"Nossa História"**: um pequeno livro
impresso sob demanda sobre o relacionamento de um casal, gerado automaticamente a
partir de um questionário guiado.

## 2. O primeiro produto: "Nossa História"
**Promessa:** *"Um pequeno livro sobre tudo aquilo que fez vocês virarem vocês."*

O comprador responde a um questionário guiado, **escolhe um estilo visual e um
tamanho**, e recebe um livro com narrativa única, ilustrações, polaroids, linha
do tempo e uma carta final.

**O produto é o livro impresso.** É ele que vira presente: se embrulha, se
entrega, fica na estante. A versão digital **não é um produto paralelo** — é a
porta de entrada para quem não quer, ou ainda não quer, pagar pela impressão. O
livro já fica pronto e guardado, então o caminho para o impresso continua aberto
a qualquer momento, sem refazer nada (ver §6).

### Dados coletados na compra
nomes → fotos → como se conheceram → características de cada um → momentos
importantes → piadas/manias → viagens → dificuldades → planos futuros → mensagem
especial → **escolha de estilo** → **escolha de tamanho** → **escolha de formato**
(impresso por padrão, ver §6).

## 3. Princípio central de geração: tudo por skills/agentes versionados
Toda geração de conteúdo — narrativa (e seus estilos), estilização/caracterização das
fotos, e os elementos de layout (ex.: a polaroid junto com o texto) — é feita por
**skills versionadas e isoladas**, não por prompts soltos no código. Cada estilo é uma
"receita" com contrato estável.

Por que é regra de produto:
- **Consistência:** toda vez que um estilo é escolhido, sai no mesmo padrão.
- **Evolução sem quebrar:** melhorar/enriquecer uma skill = nova versão, sem afetar as
  outras nem os pedidos antigos.
- **Escala de catálogo:** novo estilo/tamanho = estender skill, não reescrever o motor.

Tipos de skill (biblioteca versionada — ver ARCHITECTURE.md):
- `narrative-style-*` — estilos de narrativa (romântico, poético, bem-humorado…).
- `photo-style-*` — estilos de estilização das fotos (aquarela, caricato, cinematográfico…).
- `layout-element-*` — elementos (polaroid+texto, timeline, carta, dedicatória).

Cada skill tem golden samples e testes de estilo para não descaracterizar o padrão.

## 4. Estilos visuais (múltiplos)
O produto oferece **mais de um estilo**, escolhido pelo comprador. A arquitetura
suporta N estilos; a V1 lança com um conjunto inicial. Quais entram na V1 = Decision
Gate (D-105).

## 5. Tamanhos (múltiplos modelos)
Cada tamanho é um SKU de impressão próprio (template, sangria, custo). Ponto de partida:

| Modelo | Formato          | Uso                        | Status    |
|--------|------------------|----------------------------|-----------|
| Mini   | 15 × 15 cm (S150)| protótipo já validado      | base      |
| Médio  | 20 × 20 cm       | opção "premium"            | a validar |

Modelo base: 15×15 cm, 32 páginas internas (16 spreads), página de produção 156×156 mm
(150×150 final + 3 mm de sangria/lado), softcover/perfect binding (hardcover opcional),
colorido, tiragem mínima 1. Quais tamanhos e preços na V1 = Decision Gate (D-106/D-101).

## 6. Formatos de compra: digital e impresso ([D-074])
O mesmo livro é vendido em dois formatos. **O impresso já inclui o digital**; o digital
tem upsell para o impresso.

**A intenção comercial é assimétrica, e quem constrói precisa saber disso:** o objetivo é
sempre vender o **impresso** — é ele que é o presente. O digital existe porque nem todo
comprador vai querer gastar com impressão logo de cara, e é melhor tê-lo como cliente no
digital, com o livro pronto e guardado, do que perdê-lo no checkout. Consequências de
desenho: o impresso é a opção apresentada como padrão, e o caminho digital → impresso
precisa ser visível e sem atrito — não um link escondido depois da compra.

| Formato | O que o cliente recebe | Entrega |
|---------|------------------------|---------|
| Digital | PDF do livro para download, por URL assinada e expirável | Assim que a geração termina |
| Impresso | Livro físico **+ o digital incluído** | Digital na hora; físico pelo print-on-demand |

Dois caminhos de compra:

- **Digital → upsell para impresso.** Compra o digital, recebe, e pode comprar a impressão
  depois. A segunda compra **reaproveita o livro guardado** — não regera nada, então o livro
  impresso é exatamente o que ele já viu.
- **Impresso.** Compra única; o digital fica disponível para download sem esperar a produção
  e o frete.

**Preço = f(tamanho, formato).** O estilo continua **não** alterando preço ([D-036]): entre
estilos não há custo diferencial, entre formatos há (impressão e frete existem num e não no
outro). Os números por SKU/formato são Decision Gate ([D-101]).

### 6.1. O livro gerado é guardado (requisito de produto)
Ao terminar a geração, **o livro e as fotos estilizadas são guardados**. Isso é requisito de
produto, não detalhe de implementação, porque **o livro não é reproduzível**: regerar o mesmo
pedido chama de novo o provedor de imagem, que não é determinístico, e produz **imagens
diferentes** (medido em [D-072]). Sem guardar, "reimprimir" significa fabricar um livro
diferente do que o cliente aprovou, e "vender o digital" é impossível.

O que isso viabiliza: download da versão digital, re-download, reimpressão, reenvio à gráfica
sem regerar, suporte e contestação de cobrança.

**São três PDFs distintos, não um** — entregar o de produção como versão digital é erro:

| Artefato | Geometria | Para quem |
|---|---|---|
| Produção | 156×156 mm (150 final + 3 mm de sangria/lado), PDF/X-4, CMYK | Gráfica |
| Preview | spreads em baixa resolução | Prévia no site |
| Digital do cliente | 150×150 mm aparado, RGB, sem marcas de corte | Comprador |

Por quanto tempo o arquivo fica disponível (e se o upsell tem prazo) é Decision Gate —
estende o [D-100], porque o PDF guardado **contém derivados das fotos do casal**: apagar as
fotos de origem **não** apaga o livro.

## 7. Painel de administração (requisito de produto)
Página de admin onde você acompanha tudo que for "trackeável": vendas, pedidos, status,
envios/tracking, **custo unitário** (impressão + frete + IA + imagem), **margem**, custo
de IA/tokens, logs, erros, conversão, por estilo/tamanho. Detalhes em ARCHITECTURE.md.
Acesso restrito e seguro.

## 8. Público-alvo
Presente afetivo (namoro, casamento, Dia dos Namorados). Brasil primeiro;
internacionalização é fase posterior.

> As seções **8.1 a 8.3** foram **acrescentadas** por [D-078] §2 ("`PRODUCT.md` passa a carregar
> público, mercado, posicionamento e personalidade"), que é o contrato de entrada da Fundação de
> design. Nada do §8 acima foi alterado.
>
> **Regra de preenchimento:** aqui só entra o que já está documentado em algum lugar deste
> repositório, com a âncora citada. O que ainda não foi decidido fica marcado como
> **[A CONFIRMAR NA FUNDAÇÃO — P6]** — é lacuna conhecida, não campo esquecido, e a Fundação de
> design resolve cada uma delas propondo, com o dono aprovando em Decision Gate.
>
> **Estado em 2026-08-13:** as lacunas foram **fechadas**. A Fundação de design rodou, propôs cada
> uma delas e o dono aprovou em [D-080] (gate *"Identidade visual e narrativa"*, `AUTONOMY.md` §2).
> O que está escrito abaixo sem marcador é decisão aprovada; a âncora de cada resposta nova é o
> próprio [D-080], e a identidade que saiu delas vive em `DESIGN.md` na raiz.

### 8.1. Quem compra, quem recebe, contexto emocional

**Quem compra.** Quem responde ao questionário guiado e escolhe estilo, tamanho e formato (§2, §9).
O questionário pede *como se conheceram*, *características de cada um*, *piadas/manias* e uma
*mensagem especial* (§2): o comprador conhece a história por dentro e é ele quem a conta.

**O comprador é sempre uma das duas pessoas do casal, e a compra é surpresa** ([D-080]). Ele
preenche sozinho, escondido da outra pessoa. Compra por terceiros (família, amigos) **não é o caso
desenhado**: o questionário pede material que só quem vive a história tem. Consequência de produto,
não só de design: **discrição é requisito funcional** — nada do conteúdo do casal pode aparecer em
título de aba, notificação, assunto de e-mail ou prévia de link (`DESIGN.md` §12). Vazamento visual
aqui não é incômodo; destrói o presente.

**Quem recebe.** O presente é **o livro impresso**: "se embrulha, se entrega, fica na estante"
(§2). Quem recebe abre um objeto, não um link — e o abre na frente de quem deu.

**Contexto emocional.**
- **Data marcada.** As três ocasiões nomeadas no §8 — namoro, casamento, Dia dos Namorados —
  têm dia certo. Produção e frete do print-on-demand consomem parte desse prazo (§6), então o
  prazo é uma restrição do produto e não um detalhe de logística.
- **Erro caro.** O livro **não é reproduzível**: regerar o mesmo pedido produz imagens diferentes
  (§6.1, medido em [D-072]). Não existe "faz de novo igual" — o que o comprador aprovou é o que
  existe.
- **Confiança.** O produto recebe fotos e histórias pessoais de um casal brasileiro (§11). Quem
  preenche está entregando material que não entregaria a qualquer site.
- **Idioma e praça:** português do Brasil (`src/app.html`, `lang="pt-BR"`); internacionalização é
  fase posterior (§8).

**Perfil e contexto de compra** ([D-080]):

- **Faixa etária e renda:** 18–30 anos, renda média. É a faixa das ocasiões nomeadas no §8 (namoro,
  Dia dos Namorados) e a que sustenta a leitura de valor do §8.2.
- **Dispositivo:** **celular**. Não é "também mobile" — é a tela real em que a decisão acontece.
- **Canal de aquisição:** anúncio em **Instagram/TikTok** e **busca no Google**. Consequência
  técnica: a maior parte das primeiras visitas abre no **navegador in-app** dessas redes, o que é
  restrição de plataforma registrada em `DESIGN.md` §13 (fonte auto-hospedada, nada que dependa de
  aba nova ou de instalação, `dvh` em vez de `vh`).
- **Tempo que ele aceita gastar:** **até 5 minutos — compra por impulso.** É orçamento de produto,
  não meta de UX: o questionário precisa caber nele, com perguntas opcionais claramente marcadas se
  não couber.
- **Sozinho ou acompanhado:** sozinho, e escondido — ver §8.1 acima.

### 8.2. Mercado e posicionamento

**O que já está decidido e posiciona o produto** (tudo com âncora neste documento):

- **Presente pronto, não ferramenta de criação.** O comprador responde e escolhe estilo e tamanho
  (§2); editor visual avançado está **fora de escopo na V1** (§10). Ele não diagrama páginas, não
  arrasta caixas de texto, não escolhe fonte.
- **Feito por máquina, ponta a ponta.** A DoD da V1 é um cliente real concluir tudo **sem nenhuma
  intervenção manual** (§9). Não há um designer humano no meio do pedido.
- **Único por construção, não por edição limitada.** Tiragem mínima 1 no print-on-demand (§5) e
  livro não reproduzível (§6.1).
- **O objeto é o produto; o digital é a porta.** A intenção comercial é assimétrica e declarada:
  o objetivo é vender o **impresso**, e o digital existe para não perder no checkout quem ainda
  não quer pagar impressão ([D-074], §6).
- **Catálogo que cresce sem reescrever o motor.** Novo estilo ou tamanho é uma skill versionada
  a mais, com golden samples e testes (§3, §4).

**Decidido em [D-080]:**

- **Alternativas concretas contra as quais o comprador decide.** Duas, e cada uma cobra uma
  resposta diferente:
  1. **Presente personalizado de marketplace** (caneca, quadro, caixa com foto — Elo7, Shopee), na
     mesma faixa de preço. A objeção é *"por que isto não é mais uma caneca com foto?"*, e a
     resposta é que **o que está impresso é texto escrito sobre aquelas duas pessoas**, não uma
     foto aplicada num objeto. É daqui que sai o eixo da identidade (`DESIGN.md` §1).
  2. **Experiência** (jantar, viagem). A objeção é *"presente que se vive vs. presente que fica"*,
     e a resposta é o objeto: se embrulha, se entrega, fica na estante (§2).
- **Faixa de preço e leitura de valor.** O produto se apresenta como **acessível — R$80–130 — e a
  compra é por impulso**. Isso é *posicionamento*, e é o que a interface precisa comunicar; os
  **números por SKU e formato continuam sendo o gate pendente [D-101]**, que esta decisão não
  antecipa. Consequência: nada de teatro de exclusividade — a página justifica o preço pelo
  trabalho e pela unicidade, não por sinal de luxo.
- **Nome comercial e logo.** O nome comercial é **"Nossa História"** — nome do produto = nome da
  marca, o que já estava em uso (`src/lib/home-content.ts`, §2). O **logo é uma marca tipográfica**,
  sem símbolo, na tipografia do `DESIGN.md` §4.5. A identidade não depende dele: a assinatura visual
  (`DESIGN.md` §3) torna a primeira dobra reconhecível **com o logo recortado**.

### 8.3. Personalidade da marca

<!-- Os adjetivos abaixo foram DERIVADOS do que já está escrito, com a âncora em cada linha. O
     conjunto definitivo é Decision Gate ("Identidade visual e narrativa", AUTONOMY §2) e é a
     Fundação que o propõe. -->

| Adjetivo | Anti-adjetivo | Âncora documentada |
| --- | --- | --- |
| **Afetuoso** | sem ser **meloso** | "Presente afetivo" (§8) e a nota de público da home (`home-content.ts`); do outro lado, placeholder poético e buzzword são proibidos por `.claude/rules/design-antipatterns.md` (61, 63). |
| **Específico** | sem ser **genérico** | A promessa é sobre *o que fez vocês virarem vocês* (§2, [D-002]); a narrativa **não pode contradizer o que o casal informou** (§11). Um livro que serviria para outro casal falhou. |
| **Reservado** | sem ser **frio** | O produto guarda fotos íntimas e histórias pessoais (§11) e trata cada foto por URL assinada e expirável (§6, §11). Discrição é requisito, distanciamento não. |
| **Artesanal** | sem ser **rústico** | Tiragem mínima 1 (§5) e livro não reproduzível (§6.1): cada exemplar é peça única **por construção**, não por edição limitada (§8.2). Aprovado em [D-080]. |

**Status:** **aprovado** em [D-080] (2026-08-13), no gate *"Identidade visual e narrativa"*
(`AUTONOMY.md` §2), conforme [D-078] §9. São quatro adjetivos, dentro da faixa de 3–5. A voz que
sai deles vive no `DESIGN.md` §9 ("Tom de copy"), que **passa a ser a autoridade** sobre a voz da
interface — inclusive `alt`, `placeholder`, rótulo e mensagem de erro. Alterar este conjunto daqui
em diante é novo Decision Gate.

## 9. Definition of Done da V1
Sem nenhuma intervenção manual, um cliente real consegue: entender a proposta →
preencher questionário, enviar fotos, escolher estilo, tamanho **e formato** → pagar
(Stripe) → ter o livro gerado pelas skills **e guardado** → ver prévia → **baixar a versão
digital** e/ou ter o pedido enviado ao print no tamanho certo → receber e-mails → e você
acompanhar tudo pelo dashboard, entrando só em Decision Gates.
A V1 lança com no mínimo 2 estilos e 2 tamanhos (conjunto exato via Decision Gate), nos
**dois formatos** ([D-074]).

## 10. Fora de escopo na V1
Outros tipos de presente; app mobile nativo; marketplace/venda em dólar; editor visual
avançado para o cliente.

## 11. Riscos e temas sensíveis (Decision Gates)
- **LGPD e vazamento:** coleta fotos íntimas e histórias pessoais no Brasil. Segurança,
  privacidade, base legal, consentimento e retenção/exclusão das fotos = decisão humana.
  Desde o [D-074] há uma segunda pergunta: o livro guardado **contém derivados das fotos**,
  então retenção do artefato é decisão distinta da retenção da matéria-prima — apagar as
  fotos não apaga o livro, e o cliente que comprou o digital espera poder rebaixá-lo.
- **Conteúdo por IA:** a narrativa não pode contradizer o que o casal informou.
- **Consistência de estilo:** cada skill precisa de golden samples e testes.
- **Impressão:** RGB vs CMYK, 300 DPI, PDF/X-4, lombada variável por SKU.
