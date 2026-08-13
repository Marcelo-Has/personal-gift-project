# Violações plantadas — as provas de que os gates reprovam

Estes arquivos existem para **falhar**. Cada um planta uma violação de um gate determinístico da
EV2.4 · Q4, e `tests/design/*.test.ts` roda o gate real contra eles e exige a reprovação.

Por que permanentes, e não só um experimento de branch descartável: um gate escrito e nunca visto
reprovando é um gate que ninguém sabe se funciona. O experimento de branch prova **uma vez**; estes
arquivos provam **em toda rodada de CI** — inclusive no dia em que alguém afrouxar uma regex e não
perceber.

Eles não são compilados na UI: ficam fora do `include` do `tsconfig.json`, fora do escopo de
`npm run lint:estilo` (que é `src/**`), fora da varredura padrão do lint de anti-patterns (que é
`src/`) e listados no `.prettierignore` e no `ignores` do ESLint — porque um arquivo cujo conteúdo
é errado de propósito não deve ser formatado nem corrigido.
