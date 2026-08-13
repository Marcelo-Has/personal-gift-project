<script lang="ts">
	// A camada de tokens do `DESIGN.md` (§4/§5), global e única. Importada no layout raiz porque
	// é o único ponto por onde TODA rota passa: token que não chega a uma rota vira `var()` sem
	// valor, e `var()` sem valor é o pior modo de falha possível — silencioso e só no render.
	import '$lib/styles/tokens.css';
	import '$lib/styles/fonts.css';
	import '$lib/styles/global.css';
	import { setContext, type Snippet } from 'svelte';

	let { children } = $props();

	// A `.margem` (§3, voz do sistema) vive no layout raiz, mas quem tem o conteúdo dela é a
	// rota/layout aninhado (ex.: a contagem de passo do questionário). SvelteKit não propaga
	// snippet de filho para o markup do ancestral — por isso o contexto: cada rota registra o
	// snippet dela aqui, e o layout raiz apenas o renderiza.
	let conteudoMargem = $state<Snippet | null>(null);
	setContext('margem', {
		definir: (snippet: Snippet | null) => {
			conteudoMargem = snippet;
		}
	});
</script>

<div class="pagina">
	<div class="regua" aria-hidden="true"></div>
	<div class="grade">
		<div class="margem">
			{#if conteudoMargem}
				{@render conteudoMargem()}
			{/if}
		</div>
		<div class="folha">
			{@render children()}
		</div>
	</div>
</div>

<style>
	/*
	 * A assinatura visual (§3) e a base de composição (§6). Vive aqui, no layout raiz, porque é o
	 * único lugar por onde toda rota passa — a régua tem de aparecer em toda tela do produto, não
	 * só nas que a instanciam de propósito.
	 */

	/*
	 * `min-height: 100dvh` é o que garante o rodapé real em telas curtas (§3, "contínua do topo
	 * ao rodapé de TODA a tela"): sem isso `.pagina` só cresce pelo conteúdo do grid, a régua
	 * (absoluta, `top`/`bottom` a 0 DENTRO dela) para junto com o cartão mais curto, e sobra
	 * `--surface` nua abaixo — a régua nunca alcança o fim visível da página.
	 */
	.pagina {
		position: relative;
		min-height: 100dvh;
	}

	/*
	 * A régua: uma linha de 1px em `--border`, contínua do topo ao rodapé de TODA a tela — não só
	 * da primeira dobra. `position: absolute` com `top`/`bottom` a 0 dentro do `.pagina` relativo
	 * cresce com o conteúdo (o `height: auto` do `.pagina` é decidido pelo fluxo normal antes de um
	 * elemento fora do fluxo entrar, então a régua sempre alcança o rodapé real da página, curta ou
	 * longa). `width: 1px` não é espaçamento nem cor — não tem token dedicado (D-085 item 10).
	 */
	.regua {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--space-md);
		width: 1px;
		background: var(--border);
		pointer-events: none;
	}

	@media (min-width: 768px) {
		.regua {
			left: var(--space-2xl);
		}
	}

	/*
	 * §6 — grid com áreas nomeadas. No 375 as duas áreas empilham (a voz do sistema muda de EIXO
	 * para acima do bloco, §3); a partir de 768 a régua ganha coluna própria e `margem` fica à
	 * esquerda de `conteudo`, na horizontal do que ela rotula.
	 */
	.grade {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-areas: 'margem' 'conteudo';
	}

	@media (min-width: 768px) {
		.grade {
			grid-template-columns: var(--space-2xl) 1fr;
			grid-template-areas: 'margem conteudo';
		}
	}

	/*
	 * A voz do sistema (§3): rótulo, contagem de passo, ajuda — as páginas preenchem via o
	 * contexto `margem`. No empilhamento mobile o item de grid estica por padrão (`stretch`)
	 * até a borda da tela; `margin-inline-start` alinha o conteúdo ao mesmo eixo da régua
	 * (24px), em vez de cruzá-la — a partir de 768 a coluna já termina exatamente na régua
	 * (`--space-2xl`), então o offset extra sai.
	 */
	.margem {
		grid-area: margem;
		margin-inline-start: var(--space-md);
		font-family: var(--font-sistema);
		font-weight: var(--weight-sistema);
		font-stretch: var(--font-stretch-sistema);
		font-size: var(--text-caption);
		line-height: var(--leading-caption);
	}

	@media (min-width: 768px) {
		.margem {
			margin-inline-start: 0;
		}
	}

	/*
	 * A folha (§4.1, §4.4): a única camada real — `surface-raised` com `elevation-1`, sem borda.
	 * `margin-inline-start` afasta o conteúdo da régua (nunca a cruza); `max-width` trava a coluna
	 * de leitura em `--medida-leitura` mesmo em 1280, onde o espaço extra vira margem (§10).
	 */
	.folha {
		grid-area: conteudo;
		margin-inline-start: var(--space-lg);
		max-width: var(--medida-leitura);
		padding: var(--space-md);
		background: var(--surface-raised);
		border-radius: var(--radius-md);
		box-shadow: var(--elevation-1);
	}

	@media (min-width: 768px) {
		.folha {
			padding: var(--space-xl);
		}
	}
</style>
