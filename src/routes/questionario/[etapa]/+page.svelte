<script lang="ts">
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getEtapaIndex, questionarioEtapas } from '$lib/questionario-etapas';
	import { questionarioSchema } from '$lib/order-schema';
	import { getSessionIdToken } from '$lib/firebase/session';
	import {
		ALLOWED_PHOTO_CONTENT_TYPES,
		enviarArquivoParaUrlAssinada,
		extrairPhotoId,
		solicitarUrlDeDownload,
		solicitarUrlDeUpload,
		validarArquivoFoto,
		type PhotoContentType
	} from '$lib/upload-foto';
	import type { CoupleQuestionnaire } from '$lib/order';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const etapa = $derived(data.etapa);

	const questionario = getContext<CoupleQuestionnaire>('questionario');
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

	/**
	 * Fotos são enviadas direto do navegador ao Storage por URL assinada (F1-05b,
	 * issue #32); o servidor nunca vê o arquivo. `orderIdRascunho` só agrupa as fotos
	 * desta sessão de questionário no mesmo "pedido" do Storage — não é o id do pedido
	 * de verdade, que só passa a existir quando o pedido é persistido (#33).
	 */
	interface ItemFoto {
		id: string;
		nome: string;
		status: 'enviando' | 'concluida' | 'erro';
		erro?: string;
	}

	const orderIdRascunho = crypto.randomUUID().replace(/-/g, '');
	let itensFoto = $state<ItemFoto[]>([]);

	async function enviarFoto(arquivo: File) {
		const id = crypto.randomUUID();
		const erroValidacao = validarArquivoFoto(arquivo);

		if (erroValidacao) {
			itensFoto.push({ id, nome: arquivo.name, status: 'erro', erro: erroValidacao });
			return;
		}

		itensFoto.push({ id, nome: arquivo.name, status: 'enviando' });
		const contentType = arquivo.type as PhotoContentType;

		try {
			const idToken = await getSessionIdToken();
			const upload = await solicitarUrlDeUpload({
				contentType,
				orderId: orderIdRascunho,
				idToken
			});
			await enviarArquivoParaUrlAssinada(upload.url, arquivo, contentType);

			const download = await solicitarUrlDeDownload({
				orderId: orderIdRascunho,
				photoId: extrairPhotoId(upload.path),
				idToken
			});
			// `path` é o que fica; `url` é só o preview desta sessão e expira em 10 min.
			questionario.photos.push({ path: upload.path, url: download.url });

			const item = itensFoto.find((item) => item.id === id);
			if (item) item.status = 'concluida';
		} catch (erro) {
			const item = itensFoto.find((item) => item.id === id);
			if (item) {
				item.status = 'erro';
				item.erro = erro instanceof Error ? erro.message : 'Falha ao enviar a foto.';
			}
		}
	}

	/**
	 * Renova as URLs de preview ao entrar na etapa de fotos. Elas expiram em 10 minutos e o
	 * questionário tem 9 etapas: sem isto, quem envia as fotos cedo e volta depois vê `<img>`
	 * quebrado (achado da revisão do PR #66). O `path` é durável e é o que permite renovar.
	 * Melhor esforço, como o resto do fluxo: falhar aqui não trava o preenchimento.
	 */
	$effect(() => {
		if (etapa.key !== 'photos') return;
		const semPreview = questionario.photos.filter((foto) => !foto.url);
		if (semPreview.length === 0) return;

		(async () => {
			try {
				const idToken = await getSessionIdToken();
				for (const foto of semPreview) {
					const download = await solicitarUrlDeDownload({
						orderId: orderIdRascunho,
						photoId: extrairPhotoId(foto.path),
						idToken
					});
					foto.url = download.url;
				}
			} catch {
				// Sem sessão/rede: o preview fica sem imagem, mas o `path` continua guardado.
			}
		})();
	});

	async function selecionarFotos(evento: Event) {
		const input = evento.currentTarget as HTMLInputElement;
		const arquivos = Array.from(input.files ?? []);
		input.value = '';

		for (const arquivo of arquivos) {
			await enviarFoto(arquivo);
		}
	}

	function removerFotoEnviada(indice: number) {
		questionario.photos.splice(indice, 1);
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
		<label>
			Selecionar fotos
			<input
				type="file"
				accept={ALLOWED_PHOTO_CONTENT_TYPES.join(',')}
				multiple
				onchange={selecionarFotos}
			/>
		</label>

		{#if itensFoto.length > 0}
			<ul class="itens-foto">
				{#each itensFoto as item (item.id)}
					<li>
						{item.nome} —
						{#if item.status === 'enviando'}
							enviando…
						{:else if item.status === 'concluida'}
							enviada
						{:else}
							<span role="alert">{item.erro}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if questionario.photos.length > 0}
			<!-- Chave é o `path`, não a `url`: a url é renovada e trocaria a identidade do item. -->
			<ul class="preview-fotos">
				{#each questionario.photos as foto, indice (foto.path)}
					<li>
						{#if foto.url}
							<img src={foto.url} alt="Foto enviada do casal" />
						{:else}
							<span>Prévia indisponível — a foto continua salva.</span>
						{/if}
						<button type="button" onclick={() => removerFotoEnviada(indice)}>Remover</button>
					</li>
				{/each}
			</ul>
		{/if}
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

	.itens-foto {
		padding-left: 0;
		list-style: none;
	}

	.preview-fotos {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		padding-left: 0;
		list-style: none;
	}

	.preview-fotos li {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
	}

	.preview-fotos img {
		width: 8rem;
		height: 8rem;
		object-fit: cover;
		border-radius: 0.5rem;
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
