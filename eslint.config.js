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
		// Config na raiz, módulos server-only do SvelteKit e os scripts de guard-rail dos
		// workflows (`.github/scripts/`, EV2.4) rodam em Node — `process`/`console` são globais
		// legítimos ali, e não há bundle de cliente por onde vazar segredo.
		files: [
			'*.config.{js,ts}',
			'**/*.server.{js,ts}',
			'src/hooks.server.ts',
			'.github/scripts/**/*.mjs'
		],
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
			// Saída do `adapter-netlify`, irmã de `build/`: bundle já minificado e sem relação com
			// o código-fonte. No CI ela nem existe (o `Lint` roda antes do `Build`), mas em máquina
			// de quem já buildou ela sozinha responde por ~200 erros de lint — e um `npm run lint`
			// que só é vermelho localmente é um lint que se aprende a ignorar.
			'.netlify/',
			'dist/',
			'playwright-report/',
			'test-results/',
			'artefatos-execucao/',
			// Violações plantadas dos gates de design (EV2.4 · Q4): conteúdo errado DE PROPÓSITO,
			// lido como texto pelos testes e nunca compilado. Fora do `include` do `tsconfig.json`,
			// então o `projectService` do parser de `.svelte` nem consegue analisá-los — e corrigir
			// o que existe para estar errado seria apagar a prova.
			'tests/design/fixtures/'
		]
	}
);
