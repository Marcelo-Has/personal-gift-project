---
paths:
  - "src/lib/product-skills/**"
---
# Regras das skills de estilo do produto

- Toda geração de conteúdo passa pelo `registry.json`; **nada de prompt "solto"** no
  código de aplicação.
- Cada estilo/elemento é uma skill **versionada e isolada**, com contrato estável
  (entrada → saída), `golden-samples/` e testes de estilo.
- Melhorar um estilo = **nova versão** da skill; preserve as versões anteriores e as
  golden samples. Não altere silenciosamente um estilo existente.
- Novo estilo/tamanho = adicionar/estender skill + entrada no `registry.json`, **sem
  reescrever o motor**.
- Os testes de estilo (comparação com golden samples) precisam passar no CI.
