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
tamanho**, e recebe um livro físico impresso, com narrativa única, ilustrações,
polaroids, linha do tempo e uma carta final.

### Dados coletados na compra
nomes → fotos → como se conheceram → características de cada um → momentos
importantes → piadas/manias → viagens → dificuldades → planos futuros → mensagem
especial → **escolha de estilo** → **escolha de tamanho**.

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

## 6. Painel de administração (requisito de produto)
Página de admin onde você acompanha tudo que for "trackeável": vendas, pedidos, status,
envios/tracking, **custo unitário** (impressão + frete + IA + imagem), **margem**, custo
de IA/tokens, logs, erros, conversão, por estilo/tamanho. Detalhes em ARCHITECTURE.md.
Acesso restrito e seguro.

## 7. Público-alvo
Presente afetivo (namoro, casamento, Dia dos Namorados). Brasil primeiro;
internacionalização é fase posterior.

## 8. Definition of Done da V1
Sem nenhuma intervenção manual, um cliente real consegue: entender a proposta →
preencher questionário, enviar fotos, escolher estilo e tamanho → pagar (Stripe) → ter o
livro gerado pelas skills → ver prévia → ter o pedido enviado ao print no tamanho certo →
receber e-mails → e você acompanhar tudo pelo dashboard, entrando só em Decision Gates.
A V1 lança com no mínimo 2 estilos e 2 tamanhos (conjunto exato via Decision Gate).

## 9. Fora de escopo na V1
Outros tipos de presente; app mobile nativo; marketplace/venda em dólar; editor visual
avançado para o cliente.

## 10. Riscos e temas sensíveis (Decision Gates)
- **LGPD e vazamento:** coleta fotos íntimas e histórias pessoais no Brasil. Segurança,
  privacidade, base legal, consentimento e retenção/exclusão das fotos = decisão humana.
- **Conteúdo por IA:** a narrativa não pode contradizer o que o casal informou.
- **Consistência de estilo:** cada skill precisa de golden samples e testes.
- **Impressão:** RGB vs CMYK, 300 DPI, PDF/X-4, lombada variável por SKU.
