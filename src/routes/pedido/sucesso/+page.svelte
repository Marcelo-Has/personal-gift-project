<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const orderId = $derived(page.url.searchParams.get('orderId'));
</script>

<svelte:head>
	<title>Pagamento confirmado — Nossa História</title>
</svelte:head>

<main>
	<h1>Pagamento em processamento</h1>
	<p>
		Recebemos seu pagamento{orderId ? ` para o pedido ${orderId}` : ''}. Em breve confirmaremos por
		aqui.
	</p>
	<!--
		Saída obrigatória: a rubrica (D4) proíbe beco-sem-saída, e esta é a última tela do fluxo de
		compra. Enquanto a tela de acompanhamento do pedido (§11, "Pedido (acompanhamento)") não
		existir, o caminho honesto é o início — sem prometer um acompanhamento que ainda não há
		([D-089]).
	-->
	<p class="saida"><a href={resolve('/')}>Voltar ao início</a></p>
</main>

<style>
	main {
		max-width: var(--medida-leitura);
		padding: var(--space-md);
	}

	/* O link herda o azul default do UA se ninguém disser nada — e isso seria uma SEGUNDA
	   cor de acento fora do sistema, contra a §4.1 ("um acento só"). Achado do design-critic
	   no PR #191. */
	.saida a {
		color: var(--accent);
	}

	.saida {
		margin-top: var(--space-lg);
	}
</style>
