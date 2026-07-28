---
paths:
  - "**/*stripe*"
  - "src/**/checkout/**"
  - "src/**/billing/**"
---
# Regras de pagamentos

- Definir ou alterar **preço** (por estilo e por tamanho) é **Decision Gate** — nunca por
  conta própria.
- Ativar cobrança real (sair do modo teste do Stripe) é Decision Gate + primeiro deploy em prod.
- Todo webhook do Stripe valida a assinatura antes de processar.
- Nunca confie em valores vindos do cliente para preço; a fonte de verdade é o servidor.
- Registre custo real de cada pedido (impressão + frete + IA + imagem) para o dashboard.
