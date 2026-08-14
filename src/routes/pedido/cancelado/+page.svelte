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
	/* O `h1` não tinha regra nenhuma nestas três telas: herdava o bold e o `font-size` do
	   user-agent, contra o par 400/800 da §4.5 (o papel `heading` é Lora 400, nunca bold
	   reflexo) e fora da escala da §5. A home já fazia certo em `.promessa`; estas não.
	   Achado [High] D2 do design-critic no PR #191. */
	h1 {
		margin: 0;
		font-family: var(--font-livro);
		font-size: var(--text-h1);
		font-weight: var(--weight-normal);
		line-height: var(--leading-h1);
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

	/* O link herda o azul default do UA se ninguém disser nada — e isso seria uma SEGUNDA
	   cor de acento fora do sistema, contra a §4.1 ("um acento só"). Achado do design-critic
	   no PR #191. */
	.alternativa a {
		/* 44px de alvo (§7.3/§12, "sem exceção"): sem isto a área clicável é só a altura da
		   linha (~27px). `inline-flex` para o alvo crescer sem esticar a caixa até a largura toda. */
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--accent);
	}

	.alternativa {
		margin-top: var(--space-md);
	}
</style>
