<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import { getEtapaIndex, questionarioEtapas } from '$lib/questionario-etapas';
	import type { CoupleQuestionnaire } from '$lib/order';

	let { children } = $props();

	// $state de MÓDULO seria compartilhado entre requisições no servidor (vazamento
	// entre usuários no SSR). Declarado aqui, dentro do componente, cada requisição/
	// sessão de navegador tem sua própria instância, passada aos filhos por contexto.
	const questionario = $state<CoupleQuestionnaire>({
		people: [
			{ name: '', traits: [] },
			{ name: '', traits: [] }
		],
		photos: [],
		howTheyMet: '',
		milestones: [],
		insideJokes: [],
		trips: [],
		challenges: [],
		futurePlans: [],
		specialMessage: ''
	});

	setContext<CoupleQuestionnaire>('questionario', questionario);

	const totalEtapas = questionarioEtapas.length;
	const etapaSlug = $derived((page.params as Record<string, string>).etapa ?? '');
	const indiceAtual = $derived(getEtapaIndex(etapaSlug));
</script>

<svelte:head>
	<title>Nossa História — questionário</title>
</svelte:head>

<main>
	<h1>Conte a história de vocês</h1>

	{#if indiceAtual >= 0}
		<p class="progresso" role="status">Passo {indiceAtual + 1} de {totalEtapas}</p>
		<ol class="etapas" aria-label="Etapas do questionário">
			{#each questionarioEtapas as etapa, i (etapa.slug)}
				<li aria-current={i === indiceAtual ? 'step' : undefined}>{etapa.title}</li>
			{/each}
		</ol>
	{/if}

	{@render children()}
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.progresso {
		font-weight: bold;
	}

	.etapas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-left: 0;
		margin-bottom: 1.5rem;
		list-style: none;
		font-size: 0.875rem;
	}

	.etapas li {
		padding: 0.25rem 0.5rem;
		border: 1px solid currentColor;
		border-radius: 999px;
	}

	.etapas li[aria-current='step'] {
		font-weight: bold;
	}
</style>
