---
description: Cria o esqueleto de um novo estilo de produto (narrative/photo/layout) em src/lib/product-skills, com golden samples e registro no registry.json. Uso de desenvolvimento.
argument-hint: <tipo> <nome>   (ex.: photo-style caricato)
---
# Scaffolder de novo estilo do produto

Objetivo: criar um novo estilo versionado de forma consistente. Argumentos: `$ARGUMENTS`
(primeiro = tipo `narrative-style|photo-style|layout-element`, segundo = nome em kebab-case).

Passos:
1. Crie a pasta `src/lib/product-skills/<tipo>/<nome>/` com:
   - `definition.md` (contrato do estilo: entrada, saída, regras visuais/narrativas, versão `v1`);
   - `golden-samples/` (com um `.gitkeep` inicial);
   - um teste de estilo correspondente.
2. Adicione a entrada no `src/lib/product-skills/registry.json` (tipo, nome, versão, status `draft`).
3. NÃO publique o estilo como opção de compra — isso é Decision Gate (ver `docs/AUTONOMY.md`).
4. Abra um PR pequeno referenciando a issue.

Siga as regras em `.claude/rules/product-skills.md`.
