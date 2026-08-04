import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		// `tests/hooks/` guarda o teste dos hooks `PreToolUse` do `.claude/settings.json` e
		// `tests/workflows/` o da lógica de shell dos workflows — infra da fábrica, não código
		// do app, por isso fora de `src/`. `tests/rules/` fica de fora de propósito: depende do
		// emulador do Firebase e tem config própria (`vitest.rules.config.ts`, script
		// `test:rules`).
		include: [
			'src/**/*.{test,spec}.{js,ts}',
			'tests/hooks/*.{test,spec}.{js,ts}',
			'tests/workflows/*.{test,spec}.{js,ts}'
		],
		exclude: ['e2e/**', 'node_modules/**'],
		globals: true
	}
});
