import { defineConfig } from 'vitest/config';

/**
 * Config separada para os testes de regras do Firebase (F1-04, issue #22).
 *
 * Por que não usar `vite.config.ts`: estes testes precisam do Firebase Emulator
 * rodando e de ambiente Node (o `vite.config.ts` usa jsdom e o plugin do
 * SvelteKit, nenhum dos dois necessário aqui). Manter separado deixa
 * `npm run test` rodando sem Java instalado.
 *
 * `fileParallelism: false`: os dois arquivos falam com o mesmo projeto do
 * emulador e limpam os dados entre os testes; rodar em paralelo faria um apagar
 * o setup do outro.
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/rules/**/*.test.ts'],
		fileParallelism: false,
		// O emulador sobe a JVM antes de aceitar conexões; o default de 5s é
		// apertado para o primeiro teste num runner frio de CI.
		testTimeout: 20_000,
		hookTimeout: 30_000
	}
});
