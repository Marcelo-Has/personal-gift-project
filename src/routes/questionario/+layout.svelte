<script lang="ts">
	import { setContext } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { getEtapaIndex, questionarioEtapas } from '$lib/questionario-etapas';
	import type { CoupleQuestionnaire } from '$lib/order';
	import {
		obterOuCriarOrderId,
		carregarRascunhoCliente,
		salvarRascunhoCliente
	} from '$lib/client/order-draft';
	import { getSessionIdToken } from '$lib/firebase/session';

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

	// Rascunho pré-pagamento (F1-05c, issue #33). Sessão anônima e chamada ao
	// servidor são best-effort: sem Firebase configurado ou sem rede, o
	// questionário segue funcionando só em memória, como antes desta issue.
	let orderId = '';

	$effect(() => {
		if (!browser) return;

		(async () => {
			try {
				orderId = obterOuCriarOrderId(localStorage);
				const idToken = await getSessionIdToken();
				const rascunho = await carregarRascunhoCliente(orderId, idToken);
				if (rascunho?.questionnaire) {
					Object.assign(questionario, rascunho.questionnaire);
				}
			} catch {
				// Sem sessão/Firebase configurado ou sem rede: mantém o estado em memória.
			}
		})();
	});

	async function salvarProgresso(): Promise<void> {
		if (!browser || !orderId) return;
		try {
			const idToken = await getSessionIdToken();
			await salvarRascunhoCliente(orderId, { questionnaire: questionario }, idToken);
		} catch {
			// Melhor esforço: falha ao persistir não deve travar o preenchimento.
		}
	}

	setContext('salvarRascunhoQuestionario', salvarProgresso);

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
