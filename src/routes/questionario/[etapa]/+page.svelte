<script lang="ts">
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getEtapaIndex, questionarioEtapas } from '$lib/questionario-etapas';
	import { questionarioSchema } from '$lib/order-schema';
	import type { CoupleQuestionnaire } from '$lib/order';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const etapa = $derived(data.etapa);

	const questionario = getContext<CoupleQuestionnaire>('questionario');
	const salvarRascunho = getContext<() => Promise<void>>('salvarRascunhoQuestionario');
	const indicesPessoas: (0 | 1)[] = [0, 1];

	const indiceAtual = $derived(getEtapaIndex(etapa.slug));
	const etapaAnterior = $derived(questionarioEtapas[indiceAtual - 1]);
	const proximaEtapa = $derived(questionarioEtapas[indiceAtual + 1]);
	const ehUltimaEtapa = $derived(!proximaEtapa);

	let tentouAvancar = $state(false);

	$effect(() => {
		if (etapa) {
			tentouAvancar = false;
		}
	});

	const validacaoEtapa = $derived(etapa.schema.safeParse(questionario[etapa.key]));
	const mensagensErro = $derived(
		tentouAvancar && !validacaoEtapa.success
			? validacaoEtapa.error.issues.map((issue) => issue.message)
			: []
	);
	const resumoValido = $derived(questionarioSchema.safeParse(questionario).success);

	function avancar() {
		tentouAvancar = true;
		if (!validacaoEtapa.success) return;
		// Melhor esforço: não trava o avanço se salvar falhar (ver +layout.svelte).
		void salvarRascunho?.();
		if (proximaEtapa) {
			goto(resolve('/questionario/[etapa]', { etapa: proximaEtapa.slug }));
		}
	}

	function voltar() {
		if (etapaAnterior) {
			goto(resolve('/questionario/[etapa]', { etapa: etapaAnterior.slug }));
		}
	}

	function adicionarMomento() {
		questionario.milestones.push({ title: '', description: '' });
	}

	function removerMomento(indice: number) {
		questionario.milestones.splice(indice, 1);
	}

	function adicionarViagem() {
		questionario.trips.push({ destination: '', description: '' });
	}

	function removerViagem(indice: number) {
		questionario.trips.splice(indice, 1);
	}

	function atualizarLista(destino: 'insideJokes' | 'challenges' | 'futurePlans', valor: string) {
		questionario[destino] = valor.split('\n');
	}

	function atualizarTraits(indice: 0 | 1, valor: string) {
		questionario.people[indice].traits = valor.split('\n');
	}
</script>

<section aria-labelledby="titulo-etapa">
	<h2 id="titulo-etapa">{etapa.title}</h2>
	<p>{etapa.intro}</p>

	{#if etapa.key === 'people'}
		{#each indicesPessoas as indice (indice)}
			<fieldset>
				<legend>Pessoa {indice + 1}</legend>
				<label>
					{etapa.fields?.name}
					<input type="text" bind:value={questionario.people[indice].name} />
				</label>
				<label>
					{etapa.fields?.traits}
					<textarea
						value={questionario.people[indice].traits.join('\n')}
						oninput={(evento) => atualizarTraits(indice, evento.currentTarget.value)}></textarea>
				</label>
			</fieldset>
		{/each}
	{:else if etapa.key === 'photos'}
		<p>Em breve você poderá enviar fotos do casal aqui.</p>
		<!-- F1-05b: componente de upload de fotos entra aqui -->
		<button type="button" disabled>Selecionar fotos (em breve)</button>
	{:else if etapa.key === 'howTheyMet'}
		<label>
			{etapa.fields?.text}
			<textarea bind:value={questionario.howTheyMet}></textarea>
		</label>
	{:else if etapa.key === 'milestones'}
		{#each questionario.milestones as momento, indice (indice)}
			<fieldset>
				<legend>Momento {indice + 1}</legend>
				<label>
					{etapa.fields?.title}
					<input type="text" bind:value={momento.title} />
				</label>
				<label>
					{etapa.fields?.description}
					<textarea bind:value={momento.description}></textarea>
				</label>
				<button type="button" onclick={() => removerMomento(indice)}>{etapa.fields?.remove}</button>
			</fieldset>
		{/each}
		<button type="button" onclick={adicionarMomento}>{etapa.fields?.add}</button>
	{:else if etapa.key === 'insideJokes'}
		<label>
			{etapa.fields?.text}
			<textarea
				value={questionario.insideJokes.join('\n')}
				oninput={(evento) => atualizarLista('insideJokes', evento.currentTarget.value)}></textarea>
		</label>
	{:else if etapa.key === 'trips'}
		{#each questionario.trips as viagem, indice (indice)}
			<fieldset>
				<legend>Viagem {indice + 1}</legend>
				<label>
					{etapa.fields?.destination}
					<input type="text" bind:value={viagem.destination} />
				</label>
				<label>
					{etapa.fields?.description}
					<input type="text" bind:value={viagem.description} />
				</label>
				<button type="button" onclick={() => removerViagem(indice)}>{etapa.fields?.remove}</button>
			</fieldset>
		{/each}
		<button type="button" onclick={adicionarViagem}>{etapa.fields?.add}</button>
	{:else if etapa.key === 'challenges'}
		<label>
			{etapa.fields?.text}
			<textarea
				value={questionario.challenges.join('\n')}
				oninput={(evento) => atualizarLista('challenges', evento.currentTarget.value)}></textarea>
		</label>
	{:else if etapa.key === 'futurePlans'}
		<label>
			{etapa.fields?.text}
			<textarea
				value={questionario.futurePlans.join('\n')}
				oninput={(evento) => atualizarLista('futurePlans', evento.currentTarget.value)}></textarea>
		</label>
	{:else if etapa.key === 'specialMessage'}
		<label>
			{etapa.fields?.text}
			<textarea bind:value={questionario.specialMessage}></textarea>
		</label>
	{/if}

	{#if mensagensErro.length > 0}
		<ul class="erros" role="alert">
			{#each mensagensErro as mensagem, i (i)}
				<li>{mensagem}</li>
			{/each}
		</ul>
	{/if}

	<nav class="navegacao-etapas" aria-label="Navegação do questionário">
		{#if etapaAnterior}
			<button type="button" onclick={voltar}>Voltar</button>
		{:else}
			<a href={resolve('/')}>Cancelar</a>
		{/if}

		{#if !ehUltimaEtapa}
			<button type="button" onclick={avancar}>Avançar</button>
		{/if}
	</nav>

	{#if ehUltimaEtapa}
		<section aria-labelledby="titulo-resumo">
			<h2 id="titulo-resumo">Resumo</h2>
			<dl>
				<dt>Pessoas</dt>
				<dd>{questionario.people.map((pessoa) => pessoa.name).join(' e ')}</dd>
				<dt>Como se conheceram</dt>
				<dd>{questionario.howTheyMet}</dd>
				<dt>Momentos importantes</dt>
				<dd>{questionario.milestones.length}</dd>
				<dt>Piadas internas</dt>
				<dd>{questionario.insideJokes.length}</dd>
				<dt>Viagens</dt>
				<dd>{questionario.trips.length}</dd>
				<dt>Dificuldades superadas</dt>
				<dd>{questionario.challenges.length}</dd>
				<dt>Planos futuros</dt>
				<dd>{questionario.futurePlans.length}</dd>
				<dt>Mensagem especial</dt>
				<dd>{questionario.specialMessage}</dd>
			</dl>

			{#if resumoValido}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- rota criada só na #34; resolve() exige que a rota já exista. -->
				<a class="cta" href="/estilo-e-tamanho">Escolher estilo e tamanho</a>
			{:else}
				<p>Volte e complete as etapas anteriores para continuar.</p>
			{/if}
		</section>
	{/if}
</section>

<style>
	fieldset {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.75rem;
	}

	input,
	textarea {
		display: block;
		width: 100%;
		margin-top: 0.25rem;
	}

	.erros {
		color: #a30000;
	}

	.navegacao-etapas {
		display: flex;
		justify-content: space-between;
		margin-top: 1.5rem;
	}

	.cta {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		font-weight: bold;
		text-decoration: none;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}
</style>
