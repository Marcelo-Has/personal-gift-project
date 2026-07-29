<script lang="ts">
	import { getPlaceholderTitle } from '$lib/greeting';

	const title = getPlaceholderTitle();
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<main>
	<h1>{title}</h1>
	<p>Em construção.</p>
</main>
