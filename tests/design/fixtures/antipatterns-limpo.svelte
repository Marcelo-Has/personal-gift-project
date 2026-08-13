<script lang="ts">
	import { homeContent } from '$lib/home-content';
</script>

<section class="hero">
	<h1>{homeContent.title}</h1>
	<p>{homeContent.promise}</p>
	<img src="/livro.png" alt="Uma página aberta do livro, com o texto impresso" />
</section>

<style>
	.hero {
		height: 100dvh;
		background: var(--surface-raised);
		border-radius: var(--radius-md);
		box-shadow: var(--elevation-1);
		font-family: var(--font-livro);
		color: var(--foreground);
	}
</style>
