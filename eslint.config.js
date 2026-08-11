import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		// Código de cliente (SvelteKit routes/components/lib) roda no browser: só
		// globals.browser. Isso faz `process.env` gerar erro de lint fora de
		// contexto de servidor, evitando vazamento de segredo para o bundle do
		// cliente.
		files: ['src/**/*.{js,ts,svelte}'],
		ignores: ['**/*.server.{js,ts}', 'src/hooks.server.ts'],
		languageOptions: {
			globals: globals.browser
		}
	},
	{
		// Config na raiz e módulos server-only do SvelteKit rodam em Node.
		files: ['*.config.{js,ts}', '**/*.server.{js,ts}', 'src/hooks.server.ts'],
		languageOptions: {
			globals: globals.node
		}
	},
	{
		// Testes de regras do Firebase: rodam em Node contra o emulador, fora do
		// bundle do app (leem os arquivos .rules do disco).
		files: ['tests/**/*.{js,ts}'],
		languageOptions: {
			globals: globals.node
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		// `artefatos-execucao/` é saída de execução exportada para estudo (issue #151):
		// gitignorada, mas o eslint varre o disco, não o índice do git.
		ignores: [
			'build/',
			'.svelte-kit/',
			'dist/',
			'playwright-report/',
			'test-results/',
			'artefatos-execucao/'
		]
	}
);
