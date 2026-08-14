<script lang="ts">
	import { resolve } from '$app/paths';
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
	<!--
		A saída que o texto promete. A §9 exige que a mensagem nomeie o problema E a saída, e a
		rubrica (D4) proíbe beco-sem-saída: prometer "tentar novamente" sem oferecer a ação é pior
		que o silêncio, porque cria uma expectativa que a tela não cumpre ([D-089]).
	-->
	<a class="cta" href={resolve('/estilo-e-tamanho')}>Tentar pagar de novo</a>
	<p class="alternativa"><a href={resolve('/')}>Voltar ao início</a></p>
</main>

<style>
	main {
		max-width: var(--medida-leitura);
		padding: var(--space-md);
	}

	/* Mesmo desenho do CTA da home: `--accent` é a tinta, e ela aparece aqui porque esta é a ação
	   que retoma a compra (§4.1). */
	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: var(--space-lg);
		padding: var(--space-sm) var(--space-md);
		font-weight: var(--weight-forte);
		color: var(--surface-raised);
		text-decoration: none;
		background: var(--accent);
		border-radius: var(--radius-sm);
	}

	.alternativa {
		margin-top: var(--space-md);
	}
</style>
