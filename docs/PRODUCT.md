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
