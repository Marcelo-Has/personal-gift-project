<script lang="ts">
	import { getContext, tick, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
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
	const salvarRascunho = getContext<() => Promise<void>>('salvarRascunhoQuestionario');
	const margem = getContext<{ definir: (snippet: Snippet | null) => void }>('margem');
	const indicesPessoas: (0 | 1)[] = [0, 1];

	const totalEtapas = questionarioEtapas.length;
	const indiceAtual = $derived(getEtapaIndex(etapa.slug));
	const etapaAnterior = $derived(questionarioEtapas[indiceAtual - 1]);
	const proximaEtapa = $derived(questionarioEtapas[indiceAtual + 1]);
	const ehUltimaEtapa = $derived(!proximaEtapa);

	// Texto fixo do estado "erro" da tabela §11 ("Campo de escrita do questionário") — a
	// própria issue manda usar o texto de lá, não inventar um por campo.
	const TEXTO_ERRO_CAMPO = 'Falta responder isto para o livro ter o que contar.';
	// Idem, estado "offline / degradado" da mesma linha.
	const TEXTO_OFFLINE = 'Salvo aqui neste aparelho. Vai subir quando a conexão voltar.';

	let tentouAvancar = $state(false);
	let secaoEl = $state<HTMLElement>();
	let etapaAnteriorSlug: string | null = null;

	$effect(() => {
		if (etapa) {
			tentouAvancar = false;
		}
	});

	// Foco vai para o primeiro campo do passo novo ao avançar (§4.6: vale sempre, não só sob
	// `prefers-reduced-motion` — é a única pista de orientação que não depende da régua crescendo).
	$effect(() => {
		const slugAtual = etapa.slug;
		if (etapaAnteriorSlug !== null && etapaAnteriorSlug !== slugAtual) {
			tick().then(() => {
				secaoEl?.querySelector<HTMLElement>('input, textarea')?.focus();
			});
		}
		etapaAnteriorSlug = slugAtual;
	});

	// Offline/degradado (§11): o rascunho já é melhor-esforço (`+layout.svelte`); aqui só
	// refletimos o estado de rede para a voz do sistema avisar que nada se perde.
	let offline = $state(false);
	$effect(() => {
		if (!browser) return;
		offline = !navigator.onLine;
		const marcarOnline = () => (offline = false);
		const marcarOffline = () => (offline = true);
		window.addEventListener('online', marcarOnline);
		window.addEventListener('offline', marcarOffline);
		return () => {
			window.removeEventListener('online', marcarOnline);
			window.removeEventListener('offline', marcarOffline);
		};
	});

	const validacaoEtapa = $derived(etapa.schema.safeParse(questionario[etapa.key]));
	const emErro = $derived(tentouAvancar && !validacaoEtapa.success);
	const resumoValido = $derived(questionarioSchema.safeParse(questionario).success);

	/**
	 * Estado "vazio" (§11): o exemplo na margem é o convite antes de escrever — some quando o
	 * campo principal já tem conteúdo. Nas etapas de vários subcampos (people/milestones/trips)
	 * não há um único "valor" para checar; o exemplo fica de guia enquanto a etapa existir.
	 */
	const campoPrincipalVazio = $derived.by(() => {
		switch (etapa.key) {
			case 'howTheyMet':
				return questionario.howTheyMet.trim() === '';
			case 'insideJokes':
				return questionario.insideJokes.join('').trim() === '';
			case 'challenges':
				return questionario.challenges.join('').trim() === '';
			case 'futurePlans':
				return questionario.futurePlans.join('').trim() === '';
			case 'specialMessage':
				return questionario.specialMessage.trim() === '';
			default:
				return true;
		}
	});

	// A voz do sistema desta etapa (§3): sempre a contagem de passo; "ex."/rótulo quando não há
	// erro (o erro toma o lugar deles, para não lotar a margem); offline é aditivo aos dois.
	$effect(() => {
		margem.definir(vozDoSistema);
		return () => margem.definir(null);
	});

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

	/**
	 * Overflow (§11): "texto de 40 linhas: o campo cresce até 12 linhas e passa a rolar
	 * internamente; nada é truncado sem aviso." O campo cresce com o conteúdo até a altura de
	 * 12 linhas e, dali em diante, rola — nunca corta o que foi digitado.
	 */
	function autoResize(node: HTMLTextAreaElement) {
		const MAX_LINHAS = 12;

		function ajustar() {
			node.style.height = 'auto';
			const estilo = getComputedStyle(node);
			const linha = parseFloat(estilo.lineHeight) || 24;
			const paddingVertical = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom);
			const alturaMaxima = linha * MAX_LINHAS + paddingVertical;
			const alturaConteudo = node.scrollHeight;
			const alturaFinal = Math.min(alturaConteudo, alturaMaxima);
			node.style.height = `${alturaFinal}px`;
			node.style.overflowY = alturaConteudo > alturaMaxima ? 'auto' : 'hidden';
		}

		ajustar();
		node.addEventListener('input', ajustar);

		return {
			destroy() {
				node.removeEventListener('input', ajustar);
			}
		};
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
			// `photoId` é o que fica; `url` é só o preview desta sessão e expira em 10 min.
			questionario.photos.push({ photoId: extrairPhotoId(upload.path), url: download.url });

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
	 * quebrado (achado da revisão do PR #66). O `photoId` é durável e é o que permite renovar,
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
						photoId: foto.photoId,
						idToken
					});
					foto.url = download.url;
				}
			} catch {
				// Sem sessão/rede: preview sem imagem, mas o `photoId` continua guardado.
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

{#snippet vozDoSistema()}
	<div class="voz-sistema">
		<p class="voz-sistema__passo" role="status">Passo {indiceAtual + 1} de {totalEtapas}</p>
		{#if emErro}
			<p class="voz-sistema__erro" role="alert">{TEXTO_ERRO_CAMPO}</p>
		{:else}
			{#if etapa.intro}
				<p class="voz-sistema__ajuda">{etapa.intro}</p>
			{/if}
			{#if etapa.example && campoPrincipalVazio}
				<p class="voz-sistema__exemplo">{etapa.example}</p>
			{/if}
		{/if}
		{#if offline}
			<p class="voz-sistema__offline">{TEXTO_OFFLINE}</p>
		{/if}
	</div>
{/snippet}

<section aria-labelledby="titulo-etapa" bind:this={secaoEl}>
	<h2 id="titulo-etapa">{etapa.title}</h2>

	{#if etapa.key === 'people'}
		{#each indicesPessoas as indice (indice)}
			<fieldset>
				<legend>Pessoa {indice + 1}</legend>
				<label>
					{etapa.fields?.name}
					<input
						type="text"
						class="campo-texto campo-texto--curto"
						class:campo-texto--erro={emErro}
						bind:value={questionario.people[indice].name}
					/>
				</label>
				<label>
					{etapa.fields?.traits}
					<textarea
						class="campo-texto"
						class:campo-texto--erro={emErro}
						use:autoResize
						value={questionario.people[indice].traits.join('\n')}
						oninput={(evento) => atualizarTraits(indice, evento.currentTarget.value)}></textarea>
				</label>
			</fieldset>
		{/each}
	{:else if etapa.key === 'photos'}
		<label class="campo-arquivo">
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
			<!-- Chave é o `photoId`, não a `url`: a url é renovada e trocaria a identidade do item. -->
			<ul class="preview-fotos">
				{#each questionario.photos as foto, indice (foto.photoId)}
					<li>
						{#if foto.url}
							<img src={foto.url} alt="Foto enviada do casal" />
						{:else}
							<span>Prévia indisponível — a foto continua salva.</span>
						{/if}
						<button
							type="button"
							class="botao botao--secundario"
							onclick={() => removerFotoEnviada(indice)}>Remover</button
						>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if etapa.key === 'howTheyMet'}
		<label class="sr-only">
			{etapa.fields?.text}
			<textarea
				class="campo-texto"
				class:campo-texto--erro={emErro}
				use:autoResize
				bind:value={questionario.howTheyMet}></textarea>
		</label>
	{:else if etapa.key === 'milestones'}
		{#each questionario.milestones as momento, indice (indice)}
			<fieldset>
				<legend>Momento {indice + 1}</legend>
				<label>
					{etapa.fields?.title}
					<input
						type="text"
						class="campo-texto campo-texto--curto"
						class:campo-texto--erro={emErro}
						bind:value={momento.title}
					/>
				</label>
				<label>
					{etapa.fields?.description}
					<textarea
						class="campo-texto"
						class:campo-texto--erro={emErro}
						use:autoResize
						bind:value={momento.description}></textarea>
				</label>
				<button type="button" class="botao botao--secundario" onclick={() => removerMomento(indice)}
					>{etapa.fields?.remove}</button
				>
			</fieldset>
		{/each}
		<button type="button" class="botao botao--secundario" onclick={adicionarMomento}
			>{etapa.fields?.add}</button
		>
	{:else if etapa.key === 'insideJokes'}
		<label class="sr-only">
			{etapa.fields?.text}
			<textarea
				class="campo-texto"
				class:campo-texto--erro={emErro}
				use:autoResize
				value={questionario.insideJokes.join('\n')}
				oninput={(evento) => atualizarLista('insideJokes', evento.currentTarget.value)}></textarea>
		</label>
	{:else if etapa.key === 'trips'}
		{#each questionario.trips as viagem, indice (indice)}
			<fieldset>
				<legend>Viagem {indice + 1}</legend>
				<label>
					{etapa.fields?.destination}
					<input
						type="text"
						class="campo-texto campo-texto--curto"
						class:campo-texto--erro={emErro}
						bind:value={viagem.destination}
					/>
				</label>
				<label>
					{etapa.fields?.description}
					<input
						type="text"
						class="campo-texto campo-texto--curto"
						bind:value={viagem.description}
					/>
				</label>
				<button type="button" class="botao botao--secundario" onclick={() => removerViagem(indice)}
					>{etapa.fields?.remove}</button
				>
			</fieldset>
		{/each}
		<button type="button" class="botao botao--secundario" onclick={adicionarViagem}
			>{etapa.fields?.add}</button
		>
	{:else if etapa.key === 'challenges'}
		<label class="sr-only">
			{etapa.fields?.text}
			<textarea
				class="campo-texto"
				class:campo-texto--erro={emErro}
				use:autoResize
				value={questionario.challenges.join('\n')}
				oninput={(evento) => atualizarLista('challenges', evento.currentTarget.value)}></textarea>
		</label>
	{:else if etapa.key === 'futurePlans'}
		<label class="sr-only">
			{etapa.fields?.text}
			<textarea
				class="campo-texto"
				class:campo-texto--erro={emErro}
				use:autoResize
				value={questionario.futurePlans.join('\n')}
				oninput={(evento) => atualizarLista('futurePlans', evento.currentTarget.value)}></textarea>
		</label>
	{:else if etapa.key === 'specialMessage'}
		<label class="sr-only">
			{etapa.fields?.text}
			<textarea
				class="campo-texto"
				class:campo-texto--erro={emErro}
				use:autoResize
				bind:value={questionario.specialMessage}></textarea>
		</label>
	{/if}

	<nav class="navegacao-etapas" aria-label="Navegação do questionário">
		{#if etapaAnterior}
			<button type="button" class="botao botao--secundario" onclick={voltar}>Voltar</button>
		{:else}
			<a class="botao botao--secundario" href={resolve('/')}>Cancelar</a>
		{/if}

		{#if !ehUltimaEtapa}
			<button type="button" class="botao botao--primario" onclick={avancar}
				>{etapa.continuarPara}</button
			>
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
				<a class="botao botao--primario" href="/estilo-e-tamanho">Escolher estilo e tamanho</a>
			{:else}
				<p>Volte e complete as etapas anteriores para continuar.</p>
			{/if}
		</section>
	{/if}
</section>

<style>
	fieldset {
		margin-bottom: var(--space-sm);
		padding: var(--space-sm);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	label {
		display: block;
		margin-bottom: var(--space-xs);
		font-family: var(--font-sistema);
		font-size: var(--text-caption);
		font-weight: var(--weight-sistema);
	}

	h2 {
		margin-top: 0;
		font-family: var(--font-livro);
		font-size: var(--text-h2);
		font-weight: var(--weight-normal);
		line-height: var(--leading-h2);
	}

	.campo-texto {
		display: block;
		box-sizing: border-box;
		width: 100%;
		max-width: var(--medida-leitura);
		margin-top: var(--space-3xs);
		padding: var(--space-sm);
		font-family: var(--font-livro);
		font-size: var(--text-body);
		font-weight: var(--weight-normal);
		line-height: var(--leading-body);
		color: var(--foreground);
		background: var(--surface-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		resize: none;
	}

	.campo-texto--curto {
		max-width: 24rem;
	}

	.campo-texto:hover {
		border-color: var(--foreground);
	}

	.campo-texto:disabled {
		color: var(--muted);
		cursor: not-allowed;
	}

	.campo-texto--erro {
		border-color: var(--destructive);
	}

	.campo-arquivo {
		display: inline-block;
		padding: var(--space-sm);
		border: 1px dashed var(--border);
		border-radius: var(--radius-sm);
	}

	.itens-foto {
		padding-left: 0;
		list-style: none;
	}

	.preview-fotos {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		padding-left: 0;
		list-style: none;
	}

	.preview-fotos li {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
		align-items: center;
	}

	.preview-fotos img {
		/* `width`/`height` de miniatura não vêm da escala de espaçamento — ver o cabeçalho do
		   `stylelint.config.js`: a §4.2 dimensiona ritmo, não componente. */
		width: 8rem;
		height: 8rem;
		object-fit: cover;
		border-radius: var(--radius-sm);
	}

	.navegacao-etapas {
		display: flex;
		justify-content: space-between;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}

	.botao {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: var(--space-xs) var(--space-md);
		font-family: var(--font-sistema);
		font-size: var(--text-caption);
		font-weight: var(--weight-sistema);
		text-decoration: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	/* §4.1 — "Avançar" é ação primária: um dos três lugares legítimos do único acento. */
	.botao--primario {
		color: var(--surface-raised);
		background: var(--accent);
		border: 1px solid var(--accent);
	}

	.botao--primario:hover {
		background: var(--foreground);
		border-color: var(--foreground);
	}

	.botao--primario:active {
		background: var(--foreground);
		border-color: var(--foreground);
	}

	.botao--primario:disabled {
		color: var(--muted);
		background: var(--border-subtle);
		border-color: var(--border-subtle);
		cursor: not-allowed;
	}

	.botao--secundario {
		color: var(--foreground);
		background: var(--surface-raised);
		border: 1px solid var(--border);
	}

	.botao--secundario:hover {
		border-color: var(--foreground);
	}

	.botao--secundario:active {
		background: var(--surface);
	}

	.voz-sistema {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
	}

	.voz-sistema p {
		margin: 0;
	}

	.voz-sistema__erro {
		color: var(--destructive);
	}

	.voz-sistema__ajuda,
	.voz-sistema__exemplo,
	.voz-sistema__offline {
		color: var(--muted);
	}

	@media (min-width: 768px) {
		.voz-sistema {
			/* Aproximação (sem browser nesta sessão para medir, mesma ressalva do `--space-4xl`
			   em §15): alinha o topo do bloco ao padding-top da folha (`--space-xl`) e usa a
			   entrelinha do h2 na primeira linha, para a caixa de linha de "Passo N de M" bater
			   perto da linha de base do heading (achado [Med] D1, #178). */
			padding-top: var(--space-xl);
		}

		.voz-sistema__passo {
			line-height: var(--leading-h2);
		}
	}
</style>
