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
			'worker/*.{test,spec}.{js,ts}',
			'tests/hooks/*.{test,spec}.{js,ts}',
			'tests/workflows/*.{test,spec}.{js,ts}',
			// `tests/design/`: os gates determinísticos de design da EV2.4 · Q4 que NÃO precisam de
			// browser — a fidelidade do `tokens.css` ao `DESIGN.md`, a cobertura do lint de
			// anti-patterns e o fecho do veredito do critic. O que precisa de browser (axe,
			// viewports, estados) mora em `e2e/design/` e roda no Playwright.
			'tests/design/*.{test,spec}.{js,ts}'
		],
		exclude: ['e2e/**', 'node_modules/**'],
		globals: true
	}
});
