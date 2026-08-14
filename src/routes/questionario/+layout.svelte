<script lang="ts">
	import { setContext } from 'svelte';
	import { browser } from '$app/environment';
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
</script>

<svelte:head>
	<title>Nossa História — questionário</title>
</svelte:head>

<main>
	<h1 class="sr-only">Conte a história de vocês</h1>

	{@render children()}
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: var(--space-md);
	}
</style>
