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

	/* O link herda o azul default do UA se ninguém disser nada — e isso seria uma SEGUNDA
	   cor de acento fora do sistema, contra a §4.1 ("um acento só"). Achado do design-critic
	   no PR #191. */
	.saida a {
		/* 44px de alvo (§7.3/§12, "sem exceção"): sem isto a área clicável é só a altura da
		   linha (~27px). `inline-flex` para o alvo crescer sem esticar a caixa até a largura toda. */
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--accent);
	}

	.saida {
		margin-top: var(--space-lg);
	}
</style>
