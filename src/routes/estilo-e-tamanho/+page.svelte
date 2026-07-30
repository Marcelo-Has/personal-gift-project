<script lang="ts">
	import { catalogoIncompleto, montarOpcoes } from '$lib/escolha-estilo';

	const opcoes = montarOpcoes();
	const incompleto = catalogoIncompleto(opcoes);

	let narrativeStyleId = $state('');
	let photoStyleId = $state('');
	let sizeId = $state('');

	const avancoDesabilitado = $derived(
		incompleto || !narrativeStyleId || !photoStyleId || !sizeId
	);
</script>

<svelte:head>
	<title>Escolha estilo e tamanho — Nossa História</title>
	<meta name="description" content="Escolha o estilo de narrativa, o estilo de foto e o tamanho do seu mini livro." />
</svelte:head>

<main>
	<h1>Escolha estilo e tamanho</h1>

	{#if incompleto}
		<p class="em-breve">
			Ainda estamos preparando os estilos e tamanhos disponíveis. Volte em breve.
		</p>
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
						<input
							type="radio"
							name="photo-style"
							value={opcao.id}
							bind:group={photoStyleId}
						/>
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
		padding: 1.5rem;
	}

	fieldset {
		margin-bottom: 1.5rem;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}

	label {
		display: block;
		margin: 0.5rem 0;
	}

	.em-breve {
		font-style: italic;
	}
</style>
