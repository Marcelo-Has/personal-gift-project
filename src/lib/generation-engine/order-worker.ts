/**
 * Worker de geração do pedido (F2-07, issue #135) — a peça que faltava depois de F2-06
 * (motor: narrativa + fotos + layout) e F2-08a/b (render de cada `layout-element` em PDF):
 * orquestra as duas em sequência para UM pedido `pago`, com transição de status e
 * idempotência básica no Firestore (`orders.ts`).
 *
 * Chamado pela Background Function `netlify/functions/gerar-pedido-background.js`, que só
 * fornece as dependências reais (Firestore, Storage) — toda a lógica fica aqui, testável
 * sem Netlify nem rede (`.claude/rules/testing.md`: mockar dependência EXTERNA, não módulo
 * interno — por isso o pipeline real de fotos/layout/render roda de verdade no teste deste
 * módulo, só o cliente da Claude API é trocado por um dublê).
 *
 * Fora de escopo (issue #135): montar o PDF do livro inteiro a partir dos spreads
 * renderizados (F2-08c) — o resultado gravado é um RESUMO (contagem de páginas, tamanho
 * agregado em bytes), não o PDF em si.
 */
import type { Order, OrderDraft } from '../order';
import { questionarioSchema, styleAndSizeChoiceSchema } from '../order-schema';
import type { ClaudeMessagesClient } from '../server/claude';
import {
	iniciarGeracao,
	marcarErroGeracao,
	marcarGerado,
	type GeracaoResultado,
	type OrderStore
} from '../server/orders';
import { gerarNarrativaDoPedido } from './narrative';
import { stylizePhotosForOrder } from './photos';
import {
	composeLayoutForOrder,
	getSkuLayoutParams,
	type GeneratedBook,
	type LayoutSpread
} from './layout';
import { renderCartaSpreadToPdf } from './pdf/render-carta';
import { renderDedicatoriaSpreadToPdf } from './pdf/render-dedicatoria';
import { renderPolaroidSpreadToPdf } from './pdf/render-polaroid';
import { renderTimelineSpreadToPdf } from './pdf/render-timeline';
import type { DedicatoriaComposition } from '../product-skills/layout-element/dedicatoria/compose';
import type { CartaComposition } from '../product-skills/layout-element/carta/compose';
import type { PolaroidComposition } from '../product-skills/layout-element/polaroid-com-texto/compose';
import type { TimelineComposition } from '../product-skills/layout-element/timeline/compose';
import type { SourcePhoto, StylizedPhoto } from '../product-skills/photo-style/provider';

/** Teto do que vai para `geracaoErro` no Firestore — mensagens de erro internas (skills,
 * SDKs) não são desenhadas para caber num documento, e um stack/payload gigante não ajuda
 * diagnóstico além de um certo ponto (`.claude/rules/security.md`: nunca mais do que o
 * necessário para diagnosticar). */
const MAX_ERROR_MESSAGE_LENGTH = 1000;

function sanitizeErrorMessage(erro: unknown): string {
	const mensagem = erro instanceof Error ? erro.message : String(erro);
	return mensagem.length > MAX_ERROR_MESSAGE_LENGTH
		? `${mensagem.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`
		: mensagem;
}

/** Renderiza um `LayoutSpread` em PDF, despachando para o `render*SpreadToPdf` certo pelo
 * `type` — mesmo mapeamento tipo→skill que `layout.ts` documenta no topo do arquivo. */
async function renderSpreadToPdf(
	spread: LayoutSpread,
	sku: ReturnType<typeof getSkuLayoutParams>,
	stylizedPhotosByPath: Map<string, StylizedPhoto>
): Promise<Uint8Array> {
	switch (spread.type) {
		case 'abertura':
		case 'dedicatoria':
			return renderDedicatoriaSpreadToPdf(spread.composition as DedicatoriaComposition, sku);
		case 'capitulo':
		case 'carta':
			return renderCartaSpreadToPdf(spread.composition as CartaComposition, sku);
		case 'timeline':
			return renderTimelineSpreadToPdf(spread.composition as TimelineComposition, sku);
		case 'polaroid': {
			const composition = spread.composition as PolaroidComposition;
			const stylizedPhoto = stylizedPhotosByPath.get(composition.photo.path);
			if (!stylizedPhoto) {
				// Só aconteceria se `composeLayoutForOrder` tivesse casado a foto errada — ele
				// já garante isso (`LayoutMissingStylizedPhotoError`), então isto é defensivo.
				throw new Error(
					`order-worker: spread "polaroid" sem StylizedPhoto para "${composition.photo.path}".`
				);
			}
			return renderPolaroidSpreadToPdf(composition, stylizedPhoto, sku);
		}
	}
}

async function renderBookSpreads(
	book: GeneratedBook,
	stylizedPhotos: StylizedPhoto[]
): Promise<Uint8Array[]> {
	const sku = getSkuLayoutParams(book.sizeId);
	const stylizedPhotosByPath = new Map(stylizedPhotos.map((photo) => [photo.sourcePhotoId, photo]));

	const pdfs: Uint8Array[] = [];
	// Sequencial, não `Promise.all`: cada render lança um processo do Chrome
	// (`playwright-core`); rodar os ~16 spreads do SKU mini em paralelo multiplicaria o
	// pico de memória do worker sem necessidade — geração paga não é caminho de latência
	// crítica (já é assíncrona, D-063).
	for (const spread of book.spreads) {
		pdfs.push(await renderSpreadToPdf(spread, sku, stylizedPhotosByPath));
	}
	return pdfs;
}

export type LoadSourcePhotos = (order: Order) => Promise<SourcePhoto[]>;

export interface ExecutarGeracaoDoPedidoInput {
	uid: string;
	orderId: string;
	/** Lido antes por quem chama (`carregarRascunho`) — `questionnaire`/`choice` são
	 * `Partial` no tipo porque um rascunho normal pode estar incompleto, mas um pedido
	 * `pago` nunca deveria estar (o checkout, F1-07a, já exige os três ids de `choice` e o
	 * questionário completo antes de criar a sessão). Validado abaixo com os MESMOS schemas
	 * do cliente/servidor (`order-schema.ts`, D-022) em vez de reimplementar a checagem —
	 * se um dia isso disparar em produção, é sinal de um bug anterior no checkout, não algo
	 * para adivinhar/preencher aqui. */
	draft: OrderDraft;
}

export interface ExecutarGeracaoDoPedidoDeps {
	store?: OrderStore;
	/** Cliente da Claude API para a narrativa (F2-06a) — sem default aqui de propósito:
	 * `getClaudeClient()` (`server/claude.ts`) já é o default de `gerarNarrativaDoPedido`
	 * quando `client` não é passado, então a Background Function real não precisa fornecer
	 * nada; o teste deste módulo sempre passa um dublê. */
	client?: ClaudeMessagesClient;
	loadSourcePhotos: LoadSourcePhotos;
}

export type ExecutarGeracaoResultado =
	| { outcome: 'ja_em_andamento' | 'ja_concluido' }
	| { outcome: 'gerado'; resultado: GeracaoResultado }
	| { outcome: 'erro'; erro: string };

/**
 * Roda o pipeline completo (narrativa → fotos → layout → render) para UM pedido já `pago`,
 * com idempotência básica via `iniciarGeracao` (`orders.ts`): uma segunda invocação
 * concorrente ou um retry da mesma Background Function não reprocessa um pedido que já
 * está `em_geracao` ou já terminou `gerado`.
 *
 * Nunca lança: todo erro do pipeline (skill, render, SDK) é capturado, sanitizado e
 * gravado em `erro_geracao` — quem chama (a Background Function) só precisa decidir o que
 * fazer com o `ExecutarGeracaoResultado`, nunca lidar com uma promise rejeitada no meio de
 * uma geração paga.
 */
export async function executarGeracaoDoPedido(
	{ uid, orderId, draft }: ExecutarGeracaoDoPedidoInput,
	{ store, client, loadSourcePhotos }: ExecutarGeracaoDoPedidoDeps
): Promise<ExecutarGeracaoResultado> {
	const claim = await iniciarGeracao({ uid, orderId }, store);
	if (claim !== 'iniciado') {
		return { outcome: claim };
	}

	const questionnaire = questionarioSchema.safeParse(draft.questionnaire);
	const choice = styleAndSizeChoiceSchema.safeParse(draft.choice);
	if (!questionnaire.success || !choice.success) {
		const mensagem =
			'Pedido pago com questionnaire/choice incompletos — não deveria acontecer depois do ' +
			'checkout (F1-07a já exige os dois completos antes de criar a sessão).';
		await marcarErroGeracao({ uid, orderId, erro: mensagem }, store);
		return { outcome: 'erro', erro: mensagem };
	}

	const order: Order = { questionnaire: questionnaire.data, choice: choice.data };
	const startedAt = Date.now();

	try {
		const narrative = await gerarNarrativaDoPedido(order, { client });
		const sourcePhotos = await loadSourcePhotos(order);
		const stylizedPhotos = await stylizePhotosForOrder(sourcePhotos, order);
		const book = composeLayoutForOrder(order, narrative, stylizedPhotos);
		const pdfs = await renderBookSpreads(book, stylizedPhotos);

		const resultado: GeracaoResultado = {
			spreadCount: book.spreads.length,
			totalPages: book.totalPages,
			pdfBytesTotalLength: pdfs.reduce((soma, pdf) => soma + pdf.length, 0),
			durationMs: Date.now() - startedAt
		};

		await marcarGerado({ uid, orderId, resultado }, store);
		return { outcome: 'gerado', resultado };
	} catch (erro) {
		const mensagem = sanitizeErrorMessage(erro);
		await marcarErroGeracao({ uid, orderId, erro: mensagem }, store);
		return { outcome: 'erro', erro: mensagem };
	}
}
