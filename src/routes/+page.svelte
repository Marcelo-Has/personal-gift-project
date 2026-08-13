<script lang="ts">
	import { resolve } from '$app/paths';
	import { homeContent } from '$lib/home-content';
</script>

<svelte:head>
	<title>{homeContent.pageTitle}</title>
	<meta name="description" content={homeContent.pageDescription} />
</svelte:head>

<main>
	<h1>{homeContent.title}</h1>
	<p class="promise">{homeContent.promise}</p>

	<section aria-labelledby="como-funciona">
		<h2 id="como-funciona">Como funciona</h2>
		<p>{homeContent.flowIntro}</p>
		<ol>
			{#each homeContent.steps as step (step.title)}
				<li>
					<h3>{step.title}</h3>
					<p>{step.description}</p>
				</li>
			{/each}
		</ol>
	</section>

	<p class="audience-note">{homeContent.audienceNote}</p>

	<a class="cta" href={resolve(homeContent.ctaHref)}>{homeContent.ctaLabel}</a>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: var(--space-md);
	}

	.cta {
		display: inline-block;
		margin-top: var(--space-md);
		padding: var(--space-xs) var(--space-md);
		font-weight: var(--weight-forte);
		text-decoration: none;
		border: 1px solid currentColor;
		border-radius: var(--radius-md);
	}

	ol {
		padding-left: var(--space-md);
	}

	li {
		margin-bottom: var(--space-sm);
	}
</style>
