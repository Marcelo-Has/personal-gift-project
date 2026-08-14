<script lang="ts">
	import { resolve } from '$app/paths';
	import { catalogoIncompleto, montarOpcoes } from '$lib/escolha-estilo';

	const opcoes = montarOpcoes();
	const incompleto = catalogoIncompleto(opcoes);

	let narrativeStyleId = $state('');
	let photoStyleId = $state('');
	let sizeId = $state('');

	const avancoDesabilitado = $derived(incompleto || !narrativeStyleId || !photoStyleId || !sizeId);
</script>

<svelte:head>
	<title>Escolha estilo e tamanho — Nossa História</title>
	<meta
		name="description"
		content="Escolha o estilo de narrativa, o estilo de foto e o tamanho do seu mini livro."
	/>
</svelte:head>

<main>
	<h1>Escolha estilo e tamanho</h1>

	{#if incompleto}
		<p class="em-breve">
			Ainda estamos preparando os estilos e tamanhos disponíveis. Volte em breve.
		</p>
		<!--
			Sem catálogo, esta tela era um beco: nenhum caminho de volta (D4, [D-089]). O estado vazio
			da §11 pede o texto E a ação — aqui a ação possível é retomar o questionário.
		-->
		<p class="saida"><a href={resolve('/questionario')}>Voltar ao questionário</a></p>
	{:else}
		<div>
			<fieldset>
				<legend>Estilo de narrativa</legend>
				{#each opcoes.narrativeStyles as opcao (opcao.id)}
					<label>
						<input
							type="radio"
							name="narrative-style"
							value={opcao.id}
							bind:group={narrativeStyleId}
						/>
						{opcao.label}
					</label>
				{/each}
			</fieldset>

			<fieldset>
				<legend>Estilo de foto</legend>
				{#each opcoes.photoStyles as opcao (opcao.id)}
					<label>
						<input type="radio" name="photo-style" value={opcao.id} bind:group={photoStyleId} />
						{opcao.label}
					</label>
				{/each}
			</fieldset>

			<fieldset>
				<legend>Tamanho</legend>
				{#each opcoes.sizes as opcao (opcao.id)}
					<label>
						<input type="radio" name="size" value={opcao.id} bind:group={sizeId} />
						{opcao.label}
					</label>
				{/each}
			</fieldset>

			<button type="button" disabled={avancoDesabilitado}>Avançar</button>
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: var(--space-md);
	}

	fieldset {
		margin-bottom: var(--space-md);
		border: 1px solid currentColor;
		border-radius: var(--radius-md);
	}

	label {
		display: block;
		margin: var(--space-2xs) 0;
	}

	/* Sem itálico: nenhum dos quatro papéis da §4.5 o prevê e não há justificativa registrada
	   ([D-089]). O papel `body` cobre o caso, e o rebaixamento vem de `--muted`. */
	.em-breve {
		color: var(--muted);
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
