<script lang="ts">
	import { page } from '$app/state';

	const orderId = $derived(page.url.searchParams.get('orderId'));
</script>

<svelte:head>
	<title>Pagamento cancelado — Nossa História</title>
</svelte:head>

<main>
	<h1>Pagamento cancelado</h1>
	<p>
		O pagamento{orderId ? ` do pedido ${orderId}` : ''} não foi concluído. Você pode tentar novamente
		quando quiser.
	</p>
</main>
