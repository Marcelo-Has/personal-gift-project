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
		<ol class="steps">
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
		padding: clamp(1rem, 4vw, 1.5rem);
	}

	.promise {
		font-size: 1.125rem;
	}

	.audience-note {
		color: #555;
	}

	.cta {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		font-weight: bold;
		text-decoration: none;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
		text-align: center;
	}

	.cta:hover {
		background: currentColor;
		color: canvas;
	}

	.cta:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.steps {
		list-style: none;
		padding-left: 0;
		counter-reset: step;
	}

	.steps li {
		position: relative;
		margin-bottom: 1rem;
		padding-left: 2.75rem;
	}

	.steps li::before {
		counter-increment: step;
		content: counter(step);
		position: absolute;
		left: 0;
		top: 0.1rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: 1px solid currentColor;
		border-radius: 50%;
		font-size: 0.9rem;
		font-weight: bold;
	}

	.steps h3 {
		margin: 0 0 0.25rem;
	}

	@media (max-width: 30rem) {
		.cta {
			display: block;
		}
	}
</style>
