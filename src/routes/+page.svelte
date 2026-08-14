<script lang="ts">
	import { resolve } from '$app/paths';
	import { getContext, type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { homeContent } from '$lib/home-content';

	let promessaEl = $state<HTMLElement>();
	let promessaVisivel = $state(true);

	$effect(() => {
		if (!browser || !promessaEl) return;
		const observer = new IntersectionObserver(([entrada]) => {
			promessaVisivel = entrada.isIntersecting;
		});
		observer.observe(promessaEl);
		return () => observer.disconnect();
	});

	// A voz do sistema da home (§3): o teaser de preço/prazo do herói. Mesmo mecanismo de
	// contexto do questionário (`src/routes/questionario/+layout.svelte`) — a `.margem` vive no
	// layout raiz, e cada rota registra o snippet dela por cima.
	const margem = getContext<{ definir: (snippet: Snippet | null) => void }>('margem');
	$effect(() => {
		margem.definir(vozDoSistema);
		return () => margem.definir(null);
	});
</script>

{#snippet vozDoSistema()}
	<p class="hero-sistema-desktop">{homeContent.sistemaPrecoPrazo}</p>
{/snippet}

<svelte:head>
	<title>{homeContent.pageTitle}</title>
	<meta name="description" content={homeContent.pageDescription} />
</svelte:head>

<main>
	<!-- 1. Promessa + ação (§6): fazer sentir a promessa e oferecer a ação; não explica o processo. -->
	<section class="hero" aria-labelledby="promessa">
		<div class="hero-intro">
			<h1 id="promessa" class="promessa" bind:this={promessaEl}>{homeContent.hero.promise}</h1>
			<p class="apoio">{homeContent.hero.lead}</p>
		</div>
		<!-- Voz do sistema do herói (§3: preço/prazo), duplicada em DOM porque a ordem de leitura muda
		     por viewport (§6): no 375 ela vem ANTES do botão, a partir de 768 vem DEPOIS — `order` não
		     resolveria isso (só reordena visualmente, não pra leitor de tela). Cada cópia só existe na
		     árvore de acessibilidade no viewport em que é visível (`display: none` remove do a11y tree),
		     então nunca é anunciada duas vezes. -->
		<p class="hero-sistema-mobile">{homeContent.sistemaPrecoPrazo}</p>
		<a class="cta" class:cta-fixa={!promessaVisivel} href={resolve(homeContent.ctaHref)}>
			{homeContent.ctaLabel}
		</a>
	</section>

	<!-- 2. O que está impresso (§6): responde "por que não é uma caneca com foto?"; não mostra preço. -->
	<section aria-labelledby="impresso">
		<h2 id="impresso">{homeContent.impresso.heading}</h2>
		<p>{homeContent.impresso.intro}</p>
		<blockquote class="trecho">
			<p>{homeContent.impresso.excerpt}</p>
		</blockquote>
		<p class="nota">{homeContent.impresso.excerptNote}</p>
	</section>

	<!-- 3. Em cinco minutos (§6): responde "vai dar trabalho?"; não repete o conteúdo do livro. -->
	<section aria-labelledby="cinco-minutos">
		<h2 id="cinco-minutos">{homeContent.cincoMinutos.heading}</h2>
		<ol class="passos">
			{#each homeContent.cincoMinutos.steps as passo (passo.title)}
				<li>
					<p class="passo-titulo">{passo.title}</p>
					<p>{passo.description}</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- 4. Quanto custa e quando chega (§6): responde preço e prazo; não introduz novo argumento. -->
	<section aria-labelledby="preco-prazo">
		<h2 id="preco-prazo">{homeContent.precoPrazo.heading}</h2>
		<p>{homeContent.precoPrazo.texto}</p>
	</section>

	<!-- 5. Quem escreve é você (§6): responde "isso é feito por máquina?" sem esconder nem vender a automação. -->
	<section aria-labelledby="quem-escreve">
		<h2 id="quem-escreve">{homeContent.quemEscreve.heading}</h2>
		<p>{homeContent.quemEscreve.texto}</p>
	</section>

	<!-- 6. Prova (§6): vazia e marcada até existir prova real de cliente; não inventa depoimento nem número. -->
	<section aria-labelledby="prova" class="vazia">
		<h2 id="prova">{homeContent.prova.heading}</h2>
		<p>{homeContent.prova.texto}</p>
	</section>

	<!-- 7. Ação, repetida (§6): mesmo rótulo e mesma ação da seção 1 (anti-pattern 70). -->
	<section aria-labelledby="fechamento">
		<h2 id="fechamento">{homeContent.fechamento.heading}</h2>
		<p>{homeContent.fechamento.texto}</p>
		<a class="cta" href={resolve(homeContent.ctaHref)}>{homeContent.ctaLabel}</a>
	</section>
</main>

<style>
	/*
	 * `.folha` (layout raiz) já trava a coluna em `--medida-leitura` (62ch, §6/§10) — nada aqui
	 * repete esse limite. `main` só organiza o ritmo VERTICAL entre as 7 seções.
	 *
	 * Reset de margem em `p`/`blockquote`/`ol`: a regra de ritmo do projeto (§4.2 — no máximo
	 * `space-xs` dentro de um grupo, no mínimo `space-lg` entre grupos) só é seguível se nenhum
	 * elemento carregar margem default do navegador por cima da margem que a gente decide.
	 */
	main {
		display: flex;
		flex-direction: column;
	}

	p,
	blockquote,
	ol {
		margin: 0;
	}

	section {
		margin-top: var(--space-2xl);
	}

	@media (min-width: 768px) {
		section {
			margin-top: var(--space-3xl);
		}
	}

	h2 {
		margin: 0 0 var(--space-xs);
		font-family: var(--font-livro);
		font-weight: var(--weight-normal);
		font-size: var(--text-h2);
		line-height: var(--leading-h2);
	}

	/* Texto de fechamento (seção 7) → ação: grupos diferentes (§4.2, mínimo `space-lg`). */
	section > p + .cta {
		margin-top: var(--space-lg);
	}

	/*
	 * 1. Promessa + ação — LCP é o texto do `.promessa` (playbook §3.1): nasce visível, sem imagem.
	 * Enquanto não existir foto real de um livro produzido, a coluna de texto ocupa a largura toda
	 * (§6/§7.2: "a região fica vazia e marcada" é regra da seção Prova, não do herói — o herói é o
	 * elemento LCP, e um placeholder tracejado ali é o genérico que a Fundação decidiu evitar; a
	 * decisão registrada para o herói é omitir a coluna de foto por inteiro até existir foto real).
	 */
	.hero {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-areas:
			'intro'
			'sistema'
			'cta';
		gap: var(--space-lg);
		/* O primeiro viewport é o herói (§10): é o que faz "a promessa sair da tela" ter sentido
		   antes de fixar a ação no rodapé. `dvh`, nunca `vh` — a barra do navegador in-app entra e
		   sai (§13, anti-pattern 6). */
		min-height: 100dvh;
	}

	@media (min-width: 768px) {
		.hero {
			grid-template-areas:
				'intro'
				'cta';
			min-height: 0;
		}
	}

	.hero-intro {
		grid-area: intro;
		display: flex;
		flex-direction: column;
	}

	.promessa {
		margin: 0;
		font-family: var(--font-livro);
		font-weight: var(--weight-normal);
		font-size: var(--text-h1);
		line-height: var(--leading-h1);
	}

	@media (min-width: 768px) {
		.promessa {
			font-size: var(--text-display);
			line-height: var(--leading-display);
		}
	}

	/* A promessa e a frase de apoio são o MESMO grupo (§4.2, no máximo `space-xs`); a ação é um
	   grupo à parte (no mínimo `space-lg`). */
	.apoio {
		margin-top: var(--space-xs);
		font-size: var(--text-lead);
		line-height: var(--leading-lead);
		color: var(--muted);
	}

	.hero > .cta {
		grid-area: cta;
		justify-self: start;
	}

	/* A §6 pede que o botão ocupe a largura da coluna no 375, mesmo antes de virar `.cta-fixa`. */
	@media (max-width: 767px) {
		.hero > .cta {
			justify-self: stretch;
		}
	}

	/* A ação primária: `--accent` é a tinta, e ela aparece aqui porque "isto avança o livro" (§4.1). */
	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: start;
		padding: var(--space-sm) var(--space-md);
		font-weight: var(--weight-forte);
		color: var(--surface-raised);
		text-decoration: none;
		background: var(--accent);
		border-radius: var(--radius-sm);
	}

	.cta:hover,
	.cta:active {
		opacity: 0.9;
	}

	@media (max-width: 767px) {
		/*
		 * `surface-raised`/`elevation-1` são só da folha e da prévia (§4.4) — esta barra não é uma
		 * segunda camada real, então fica em `surface` (a mesa) com só a borda de topo separando-a
		 * do conteúdo que rola por baixo.
		 *
		 * `left` começa EXATAMENTE no offset da régua (`--space-md`, igual a `.regua` no layout
		 * raiz): a barra nunca começa antes da linha, então nunca a cruza (o e2e de `../regua.spec`
		 * mede exatamente isso). `right: 0` deixa o lado direito ir até a borda da tela — não há
		 * régua para cruzar desse lado.
		 */
		.cta-fixa {
			position: fixed;
			left: var(--space-md);
			right: 0;
			bottom: 0;
			z-index: 1;
			padding: var(--space-sm) var(--space-md);
			background: var(--surface);
			border-top: 1px solid var(--border);
			border-radius: 0;
		}
	}

	/*
	 * Voz do sistema do herói (preço/prazo, §3) — mesma tipografia da `.margem` (Archivo 800/14,
	 * `--muted`), mas cada cópia vive só no viewport em que participa da ordem de leitura certa.
	 */
	.hero-sistema-mobile,
	.hero-sistema-desktop {
		font-family: var(--font-sistema);
		font-weight: var(--weight-sistema);
		font-stretch: var(--font-stretch-sistema);
		font-size: var(--text-caption);
		line-height: var(--leading-caption);
		color: var(--muted);
	}

	/*
	 * No 375 ela é a única cópia visível, e vive dentro do herói (grid-area `sistema`, entre a
	 * promessa e o botão) — o `gap` do próprio `.hero` já separa os grupos (§4.2). O gate de tokens
	 * do CI (`stylelint.config.js`, EV2.4 · Q4) só aceita `var(--space-*)` puro em propriedade de
	 * espaçamento, nunca `calc()`: por isso o alinhamento flush com a régua (que pediria cancelar o
	 * `margin-inline-start` de `.folha` com um valor composto) fica fora de alcance sem um token
	 * novo dedicado só a isso — a tipografia (Archivo 800, `--muted`) é o que sinaliza "voz do
	 * sistema" aqui, como a própria §3 prevê ("mantendo a mesma família e o mesmo peso").
	 */
	.hero-sistema-mobile {
		grid-area: sistema;
	}

	@media (min-width: 768px) {
		.hero-sistema-mobile {
			display: none;
		}
	}

	/*
	 * A partir de 768 a cópia visível é a que vive na `.margem` de verdade (via `getContext`,
	 * `vozDoSistema` acima), à esquerda da régua. `--space-4xl` (§15, "Memória de design") aproxima
	 * o texto da altura do CTA — o gate de tokens não permite um `calc()` composto para mirar a
	 * altura exata do bloco (que muda com o tamanho do h1/apoio), então o valor é uma estimativa
	 * registrada como token, não medição de render.
	 */
	.hero-sistema-desktop {
		display: none;
	}

	@media (min-width: 768px) {
		.hero-sistema-desktop {
			display: block;
			margin-top: var(--space-4xl);
		}
	}

	/* 2. O que está impresso — a única cor saturada do produto é a foto do casal (§7.2); o trecho
	   impresso é papel e tinta, como o resto da interface: sem aspas decorativas, sem sombra.
	   A citação é um grupo à parte da intro (`space-lg` acima); a nota que a legenda fica perto
	   dela, no mesmo grupo (`space-xs` abaixo). */
	.trecho {
		margin-top: var(--space-lg);
		padding-inline-start: var(--space-md);
		border-inline-start: 1px solid var(--border);
	}

	.nota {
		margin-top: var(--space-xs);
	}

	/*
	 * Nota e texto do estado vazio (Prova): NENHum é conteúdo do casal nem voz do sistema no
	 * sentido da §3 (rótulo, contagem de passo, prazo) — são comentário editorial dentro da folha.
	 * Ficam em Lora, como todo o resto à direita da régua, só rebaixados em `--muted` (§4.1: "texto
	 * secundário, rebaixado de propósito"). A voz do sistema de verdade desta página é o teaser de
	 * preço/prazo do herói (`.hero-sistema-mobile`/`.hero-sistema-desktop`).
	 */
	.nota,
	.vazia p {
		color: var(--muted);
	}

	/* 3. Em cinco minutos — três passos EM LINHA a partir de 768, sem card (sem borda, sem fundo). */
	.passos {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		padding: 0;
		margin: 0;
		list-style: none;
	}

	@media (min-width: 768px) {
		.passos {
			flex-direction: row;
		}

		.passos li {
			flex: 1;
		}
	}

	.passos li {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.passo-titulo {
		font-weight: var(--weight-forte);
	}

	.passos li p:last-child {
		color: var(--muted);
	}

	/* 6. Prova — vazia e marcada, mesmo tratamento visual do estado vazio de envio de foto (§11). */
	.vazia {
		padding: var(--space-md);
		border: 1px dashed var(--border);
		border-radius: var(--radius-md);
	}

	.vazia h2 {
		font-size: var(--text-h3);
		line-height: var(--leading-h3);
	}
</style>
