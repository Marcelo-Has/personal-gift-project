<script lang="ts">
	// A camada de tokens do `DESIGN.md` (§4/§5), global e única. Importada no layout raiz porque
	// é o único ponto por onde TODA rota passa: token que não chega a uma rota vira `var()` sem
	// valor, e `var()` sem valor é o pior modo de falha possível — silencioso e só no render.
	import '$lib/styles/tokens.css';
	import '$lib/styles/fonts.css';
	import '$lib/styles/global.css';
	import { setContext, tick, type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { homeContent } from '$lib/home-content';

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

	/*
	 * O momento autoral (§4.6): ao avançar um passo do questionário, a régua CRESCE
	 * (`transform: scaleY`, origem no topo) até a altura do conteúdo novo, em vez de saltar.
	 * A régua é sempre a altura real de `.pagina` (`top`/`bottom: 0` dentro dela) — por isso medir
	 * sua altura antes/depois da navegação equivale a medir a altura da página antes/depois.
	 * Escopado a navegações DENTRO do questionário: é o único lugar do produto com esse momento;
	 * animar troca de rota entre telas diferentes (ex.: landing → questionário) não é o contrato.
	 */
	let reguaEl = $state<HTMLDivElement>();
	let alturaAntesDaNavegacao: number | null = null;

	function ehRotaDoQuestionario(routeId: string | null | undefined): boolean {
		return !!routeId && routeId.startsWith('/questionario');
	}

	// §15 "CTA da barra de topo: cheio numa rota, rebaixado noutra" (revisão do dono, PR #192): nas
	// rotas que já têm ação primária própria — o questionário e a recuperação de pagamento — a ação
	// da barra perde o preenchimento sólido, para sobrar só UM botão cheio por tela (playbook §2.2).
	let acaoDaBarraRebaixada = $derived(
		ehRotaDoQuestionario(page.route.id) || page.route.id === '/pedido/cancelado'
	);

	beforeNavigate((navegacao) => {
		alturaAntesDaNavegacao =
			ehRotaDoQuestionario(navegacao.from?.route.id) && ehRotaDoQuestionario(navegacao.to?.route.id)
				? (reguaEl?.getBoundingClientRect().height ?? null)
				: null;
	});

	afterNavigate(async () => {
		if (!browser || alturaAntesDaNavegacao === null || !reguaEl) return;
		const alturaAntes = alturaAntesDaNavegacao;
		alturaAntesDaNavegacao = null;

		await tick();
		// `prefers-reduced-motion` (§4.6, §12): a régua já nasce na altura final, sem `scaleY`,
		// e a troca de passo é instantânea — nenhuma informação depende do movimento.
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const alturaDepois = reguaEl.getBoundingClientRect().height;
		if (alturaDepois === 0) return;

		const el = reguaEl;
		el.style.transition = 'none';
		el.style.transformOrigin = 'top';
		el.style.transform = `scaleY(${alturaAntes / alturaDepois})`;
		el.getBoundingClientRect(); // força reflow antes de religar a transição
		el.style.transition = `transform var(--duration-deliberate) var(--ease-papel)`;
		el.style.transform = 'scaleY(1)';
	});
</script>

<div class="pagina">
	<div class="regua" bind:this={reguaEl} aria-hidden="true"></div>
	<header class="barra-topo">
		<a class="marca" href={resolve('/')}>Nossa História</a>
		<a
			class="acao-barra"
			class:acao-barra--rebaixada={acaoDaBarraRebaixada}
			href={resolve(homeContent.ctaHref)}>{homeContent.ctaLabel}</a
		>
	</header>
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
	/*
	 * `max-width` + `margin-inline: auto` é o que faz a folha ficar "ao centro", como o conceito da
	 * §6 descreve ("uma folha ao centro com uma régua de margem à esquerda") e como o grid de 12
	 * colunas da mesma seção especifica (conteúdo máximo 1120px). Sem isto a composição colava na
	 * borda esquerda e toda a sobra de largura em 1280 — quase um terço do viewport — virava uma
	 * faixa de `surface` de um lado só, em TODA tela do produto ([D-089]).
	 *
	 * A centralização vai em `.pagina`, não em `.grade`, porque a régua é `position: absolute`
	 * DENTRO de `.pagina`: centralizar só a grade deixaria a linha para trás, no eixo antigo.
	 */
	.pagina {
		position: relative;
		max-width: var(--largura-pagina);
		min-height: 100dvh;
		margin-inline: auto;
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
	 * A barra de topo (§6, wireframe da página de produto; §15 "Barra de topo do wireframe da §6").
	 * Chrome global, acima de `.grade` — aparece em TODA rota, inclusive acima da primeira dobra
	 * (§3: "a régua aparece... acima da primeira dobra"). A régua (`position: absolute`, `top`/
	 * `bottom: 0` dentro de `.pagina`) já cobre a altura desta barra também, sem precisar de nada
	 * aqui: ela não depende da ordem do DOM.
	 *
	 * `margin-inline-start` usa os MESMOS tokens que alinham `.folha` à régua — não um valor novo:
	 * no 375 a `.folha` fica a `--space-lg` da borda (a coluna única não reserva `.margem`); a
	 * partir de 768 a coluna de `.margem` (`--space-2xl`) soma com o `margin-inline-start` da
	 * `.folha` (`--space-lg`), e a soma bate exatamente com `--space-3xl` (96px) — por isso não é
	 * `calc()`. O resultado: a marca começa no mesmo eixo X do conteúdo abaixo dela, e a barra
	 * nunca começa antes da régua — nunca a cruza (`../e2e/design/regua.spec.ts`).
	 */
	.barra-topo {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-inline-start: var(--space-lg);
		padding: var(--space-md) var(--space-md) var(--space-md) 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	@media (min-width: 768px) {
		.barra-topo {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			margin-inline-start: var(--space-3xl);
			padding: var(--space-lg) var(--space-xl) var(--space-lg) 0;
		}
	}

	/* A marca (§1, §2: voz utilitária de capa, não voz do livro) — Archivo, como a voz do sistema
	   (§4.5), mas em `--foreground`: é identidade, não rótulo rebaixado. */
	.marca {
		font-family: var(--font-sistema);
		font-weight: var(--weight-sistema);
		font-stretch: var(--font-stretch-sistema);
		font-size: var(--text-body);
		color: var(--foreground);
		text-decoration: none;
	}

	/* A ação (§6: "mesmo rótulo e mesma ação" do CTA da home — anti-pattern 70): mesma receita
	   visual do `.cta` da landing (`src/routes/+page.svelte`) — `--accent` é a única tinta. No 375
	   ocupa a largura da coluna, embaixo da marca (colapso desenhado desta issue: o rótulo
	   completo do CTA — "Começar o meu livro" — não cabe ao lado da marca numa só linha sem
	   apertar as duas). */
	.acao-barra {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: stretch;
		padding: var(--space-sm) var(--space-md);
		font-weight: var(--weight-forte);
		color: var(--surface-raised);
		text-decoration: none;
		background: var(--accent);
		border-radius: var(--radius-sm);
	}

	.acao-barra:hover,
	.acao-barra:active {
		opacity: 0.9;
	}

	@media (min-width: 768px) {
		.acao-barra {
			align-self: auto;
		}
	}

	/* Rebaixada (§15, "CTA da barra de topo: cheio numa rota, rebaixado noutra"): outline em
	   `--accent`, sem preenchimento — a página abaixo já tem a sua própria ação cheia, e dois
	   botões com o mesmo peso visual competiriam pela mesma atenção (achado do dono, PR #192). */
	.acao-barra--rebaixada {
		color: var(--accent);
		background: transparent;
		border: 1px solid var(--accent);
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
		/* Sem isso, o item de grid usa a largura mínima automática (o min-content do conteúdo,
		   ex.: um nome de arquivo comprido) como piso — ignorando `overflow-wrap` dos
		   descendentes e empurrando a página inteira para rolar na horizontal (revisão #181,
		   achado de e2e em 375 com 12 itens recusados). */
		min-width: 0;
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
