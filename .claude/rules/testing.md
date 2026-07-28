---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "tests/**"
  - "e2e/**"
---
# Regras de teste

- Todo código novo vem com testes. Nomes descritivos: "deve [resultado] quando [condição]".
- E2E com Playwright cobrindo os fluxos de usuário (compra ponta a ponta por estilo/tamanho).
- Mocke dependências externas (Stripe, print-on-demand, provedor de imagem), não módulos internos.
- Limpe efeitos colaterais entre testes.
- Um PR não é "pronto" se `lint`, `test` e `build` (e os scans) não passarem.
