<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Como funciona — Nossa História</title>
	<meta
		name="description"
		content="Entenda o passo a passo do mini livro Nossa História: questionário guiado, escolha de estilo e tamanho, pagamento e entrega do livro impresso."
	/>
</svelte:head>

<main>
	<header>
		<h1>Como funciona</h1>
		<p class="promise">Um pequeno livro sobre tudo aquilo que fez vocês virarem vocês.</p>
	</header>

	<section aria-labelledby="passos">
		<h2 id="passos">Os 4 passos</h2>
		<ol>
			<li>
				<h3>Responda o questionário</h3>
				<p>
					Conte nomes, fotos, como vocês se conheceram, características de cada um, momentos
					importantes, piadas, viagens, dificuldades, planos futuros e uma mensagem especial. É esse
					material que vira a base da narrativa do livro.
				</p>
			</li>
			<li>
				<h3>Escolha estilo e tamanho</h3>
				<p>
					Escolha um estilo visual — para a narrativa e para as fotos — e o tamanho do livro. Essa
					escolha define como o livro final vai ficar antes de qualquer coisa ser gerada.
				</p>
			</li>
			<li>
				<h3>Pague</h3>
				<p>
					Finalize o pagamento com segurança. É o pagamento que dá início à geração do seu livro.
				</p>
			</li>
			<li>
				<h3>Receba o livro impresso</h3>
				<p>
					Seu livro é gerado — narrativa, ilustrações, polaroids, linha do tempo e uma carta final —
					impresso e enviado até vocês, com a versão digital incluída para baixar a qualquer
					momento.
				</p>
			</li>
		</ol>
	</section>

	<a class="cta" href={resolve('/questionario')}>Criar o nosso livro</a>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.promise {
		font-size: 1.1rem;
	}

	.cta {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		font-weight: bold;
		text-decoration: none;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}

	ol {
		padding-left: 1.25rem;
	}

	li {
		margin-bottom: 1.5rem;
	}

	h3 {
		margin-bottom: 0.25rem;
	}
</style>
