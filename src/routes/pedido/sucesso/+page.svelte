<script lang="ts">
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
</main>
