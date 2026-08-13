/**
 * Gate 1 dos 4 determinísticos da EV2.4 · Q4: COMPLIANCE DE TOKENS.
 *
 * O que ele decide: valor de design escrito à mão em componente REPROVA. Cor, espaçamento, raio,
 * elevação, família/corpo/peso de texto e motion só entram na UI por `var(--token)` do sistema
 * declarado na §4/§5 do `DESIGN.md` e transcrito em `src/lib/styles/tokens.css`. É o anti-pattern
 * 30 (`.claude/rules/design-antipatterns.md`) virando check, e o pé determinístico da dimensão 3
 * da `DESIGN-CRITIC-RUBRIC.md` — o critic julga se a paleta está *certa*; este gate garante que
 * ela vem do lugar *certo*, sem pagar um turno de IA.
 *
 * A ALLOWLIST É EXPLÍCITA E TEM DUAS FORMAS, as duas auditáveis:
 *
 *   1. `src/lib/styles/tokens.css` — a única EXCEÇÃO DE ARQUIVO, no `overrides` do fim. É onde os
 *      literais moram por definição; sem ela a regra seria circular.
 *   2. um comentário `stylelint-disable-next-line <regra> -- <justificativa>` no ponto de uso — a
 *      exceção pontual. `reportDescriptionlessDisables` torna ERRO o disable sem `--` e motivo:
 *      não existe exceção anônima. E `reportNeedlessDisables` torna ERRO a exceção que já não
 *      silencia nada, que é o que impede o falso-positivo residual — exceção velha não sobrevive
 *      à correção que a tornou desnecessária.
 *
 * NÃO SÃO LITERAIS PROIBIDOS, e é decisão, não esquecimento: `currentColor`, `transparent`,
 * `inherit` e `none` não carregam decisão de cor — eles a delegam. Barrá-los empurraria a UI a
 * escrever um token onde hoje ela corretamente não escolhe nada.
 *
 * O QUE ESTE GATE NÃO COBRE, de propósito (right-sizing): `width`/`height`/`max-width` de
 * componente. A §4.2 é escala de ESPAÇAMENTO, não de dimensão — a miniatura de 8rem da etapa de
 * fotos não tem token e não deveria ter um inventado só para satisfazer um lint. Dimensão de
 * componente é julgamento de composição, e isso é da dimensão 1 do critic.
 */

/** Cor literal em qualquer propriedade: hex, função de cor e as palavras-chave nomeadas. */
const CORES_LITERAIS = [
	'/#[0-9a-fA-F]{3,8}\\b/',
	'/\\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\\(/',
	'/\\b(aqua|black|blue|fuchsia|gray|grey|green|lime|maroon|navy|olive|purple|red|silver|teal|white|yellow|orange|pink|brown|beige|ivory|cyan|magenta|gold|indigo|violet|crimson|salmon|khaki|lavender|turquoise|tomato|wheat|plum|orchid|coral)\\b/'
];

/** As propriedades cujo valor é ESPAÇAMENTO — e portanto vem da escala da §4.2. */
const PROPRIEDADES_DE_ESPACO =
	'/^(margin|padding|gap|row-gap|column-gap|inset)(-(top|right|bottom|left|inline|block))?(-(start|end))?$/';

/** `0`, `auto` e `var(--space-*)` — nada mais. `0` sem unidade não é escolha de escala. */
const ESPACO_PERMITIDO = ['/^((0|auto|var\\(--space-[a-z0-9-]+\\))(\\s+|$))+$/'];

export default {
	// Sem exceção anônima e sem exceção zumbi. As duas linhas abaixo são o que faz a allowlist
	// deste gate ser auditável em vez de decorativa.
	reportDescriptionlessDisables: true,
	reportNeedlessDisables: true,
	reportInvalidScopeDisables: true,

	ignoreFiles: [
		'build/**',
		'.svelte-kit/**',
		'.netlify/**',
		'dist/**',
		'node_modules/**',
		'playwright-report/**',
		'test-results/**',
		'artefatos-execucao/**'
		// `tests/design/fixtures/` NÃO entra aqui de propósito: são violações plantadas, e
		// `tests/design/estilo.test.ts` roda o stylelint CONTRA elas para provar que este gate
		// reprova. Ignorá-las tiraria justamente a prova. Elas ficam fora do `npm run lint:estilo`
		// porque o script é escopado em `src/**`, não porque a config as esconde.
	],

	rules: {
		// §4.1 — anti-pattern 30. Cor literal em componente, em QUALQUER propriedade (inclusive
		// dentro de atalho como `border: 1px solid #fff`).
		'declaration-property-value-disallowed-list': {
			'/.*/': CORES_LITERAIS
		},

		'declaration-property-value-allowed-list': {
			// §4.2 — escala de espaçamento.
			[PROPRIEDADES_DE_ESPACO]: ESPACO_PERMITIDO,

			// §4.3 — raio. `radius-lg` não existe: a §4.3 declara que papel tem canto reto.
			'border-radius': ['/^(0|var\\(--radius-(sm|md|full)\\))$/'],

			// §4.4 — elevação. Sombra escrita à mão é o anti-pattern 15/16 pela porta dos fundos.
			'box-shadow': ['/^(none|var\\(--elevation-[0-2]\\))$/'],

			// §4.5/§5 — tipografia. Família, corpo e peso são papéis declarados, não valores.
			'font-family': ['/^var\\(--font-(livro|sistema)\\)$/', 'inherit'],
			'font-size': ['/^var\\(--text-[a-z0-9]+\\)$/', 'inherit'],
			'font-weight': ['/^var\\(--weight-[a-z]+\\)$/', 'inherit'],

			// §4.6 — motion. Duração e curva vêm do contrato; `ease`/`linear` do browser, não.
			'transition-duration': ['/^var\\(--duration-[a-z]+\\)$/'],
			'animation-duration': ['/^var\\(--duration-[a-z]+\\)$/'],
			'transition-timing-function': ['/^var\\(--ease-[a-z]+\\)$/'],
			'animation-timing-function': ['/^var\\(--ease-[a-z]+\\)$/']
		}
	},

	overrides: [
		{
			// `postcss-html` é o que ensina o stylelint a achar o `<style>` dentro do `.svelte`.
			// Ele fica AQUI, escopado por extensão, e não no topo da config: no topo ele vale
			// também para `.css`, e aí o stylelint procura um `<style>` dentro de um arquivo que
			// não tem nenhum — não acha CSS, não reporta nada e o gate fica **verde em tudo**.
			// Foi assim que este arquivo nasceu, e só as violações plantadas de
			// `tests/design/estilo.test.ts` mostraram: o gate reprovava `.svelte` e ignorava `.css`
			// em silêncio, que é a pior forma de um gate estar quebrado.
			files: ['**/*.svelte', '**/*.html'],
			customSyntax: 'postcss-html'
		},
		{
			// A EXCEÇÃO DE ARQUIVO — a única. Aqui os literais são o produto do arquivo.
			files: ['src/lib/styles/tokens.css'],
			rules: {
				'declaration-property-value-disallowed-list': null,
				'declaration-property-value-allowed-list': null
			}
		}
	]
};
