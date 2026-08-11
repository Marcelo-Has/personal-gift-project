/**
 * Testes do worker de geração do pedido (F2-07, issue #135).
 *
 * `.claude/rules/testing.md`: mocka dependência EXTERNA, não módulo interno — por isso só o
 * cliente da Claude API (`ClaudeMessagesClient`) e a busca de fotos no Storage
 * (`loadSourcePhotos`) são dublês aqui; narrativa/fotos/layout/render (F2-06/F2-08) rodam
 * de verdade, incluindo o Chrome real via `playwright-core` (mesmo padrão de
 * `render-dedicatoria.test.ts` etc. — já rodam dentro de `test:unit`). Sem `OPENAI_API_KEY`
 * no ambiente de teste, `stylizePhotosForOrder` cai sozinho no `AquarelaFakeProvider`
 * (`http-provider.ts`), então nenhuma chamada de rede acontece em lugar nenhum deste teste.
 */
import { describe, expect, it } from 'vitest';
import type { OrderDraft } from '../order';
import { QUESTIONARIO_EXEMPLO, PEDIDO_EXEMPLO } from '../fixtures/pedido-exemplo';
import type { ClaudeMessage, ClaudeMessagesClient } from '../server/claude';
import type { OrderStore } from '../server/orders';
import type { NarrativeBlocks } from '../product-skills/narrative-style/romantico/generate';
import type { Order } from '../order';
import type { SourcePhoto } from '../product-skills/photo-style/provider';
import { executarGeracaoDoPedido } from './order-worker';

function fakeStore(seed: Record<string, Record<string, unknown>> = {}): {
	store: OrderStore;
	docs: Map<string, Record<string, unknown>>;
} {
	const docs = new Map<string, Record<string, unknown>>(Object.entries(seed));

	const store: OrderStore = {
		doc(path: string) {
			return {
				async get() {
					const data = docs.get(path);
					return { exists: data !== undefined, data: () => data };
				},
				async set(data: unknown, options?: { merge: boolean }) {
					const anterior = docs.get(path) ?? {};
					docs.set(
						path,
						options?.merge
							? { ...anterior, ...(data as object) }
							: (data as Record<string, unknown>)
					);
				}
			};
		},
		collection() {
			throw new Error(
				'fakeStore (order-worker.test.ts): collection() não é usado por este worker.'
			);
		}
	};

	return { store, docs };
}

/** Só as duas legendas/entradas necessárias para os spreads de foto/linha do tempo — mais
 * rápido de renderizar num teste do que o `NARRATIVA_VALIDA` de 7 spreads de `layout.test.ts`. */
const NARRATIVA_VALIDA: NarrativeBlocks = {
	opening: 'Helena e Tomás se conheceram numa festa e nunca mais se separaram.',
	chapters: [
		{
			title: 'A varanda',
			text: 'Ficaram na varanda a noite toda porque a música estava alta demais lá dentro.'
		}
	],
	polaroidCaptions: [{ photoId: 'foto-01-varanda', caption: 'Onde tudo começou.' }],
	timeline: [{ title: 'Primeiro encontro', description: 'A festa na varanda.' }],
	finalLetter: 'Helena e Tomás, que a história continue sendo escrita.',
	dedication: 'Para Helena e Tomás.'
};

function fakeClaudeClient(resposta: NarrativeBlocks | string): ClaudeMessagesClient {
	const texto = typeof resposta === 'string' ? resposta : JSON.stringify(resposta);
	return {
		messages: {
			async create(): Promise<ClaudeMessage> {
				return { content: [{ type: 'text', text: texto }] };
			}
		}
	};
}

async function fakeLoadSourcePhotos(order: Order): Promise<SourcePhoto[]> {
	return order.questionnaire.photos.map((photo) => ({
		id: photo.photoId,
		data: new Uint8Array([1, 2, 3])
	}));
}

function draftPago(overrides: Partial<OrderDraft> = {}): OrderDraft {
	return {
		id: 'pedido-1',
		ownerId: 'uid-alice',
		status: 'aguardando_geracao',
		createdAt: '2026-08-06T00:00:00.000Z',
		updatedAt: '2026-08-06T00:00:00.000Z',
		questionnaire: QUESTIONARIO_EXEMPLO,
		choice: PEDIDO_EXEMPLO.choice,
		...overrides
	};
}

const PEDIDO_PATH = 'users/uid-alice/orders/pedido-1';

describe('executarGeracaoDoPedido — caminho feliz', () => {
	it('roda narrativa → fotos → layout → render e marca "gerado" com o resumo do resultado', async () => {
		const { store, docs } = fakeStore({ [PEDIDO_PATH]: { status: 'aguardando_geracao' } });

		const resultado = await executarGeracaoDoPedido(
			{ uid: 'uid-alice', orderId: 'pedido-1', draft: draftPago() },
			{ store, client: fakeClaudeClient(NARRATIVA_VALIDA), loadSourcePhotos: fakeLoadSourcePhotos }
		);

		expect(resultado.outcome).toBe('gerado');
		if (resultado.outcome !== 'gerado') return;
		// abertura + 1 capítulo + 1 polaroid + 1 grupo de timeline + carta final + dedicatória
		expect(resultado.resultado.spreadCount).toBe(6);
		expect(resultado.resultado.totalPages).toBeGreaterThanOrEqual(6);
		expect(resultado.resultado.pdfBytesTotalLength).toBeGreaterThan(0);

		const doc = docs.get(PEDIDO_PATH);
		expect(doc?.status).toBe('gerado');
		expect(doc?.geracao).toEqual(resultado.resultado);
	}, 30_000);
});

describe('executarGeracaoDoPedido — idempotência', () => {
	it('devolve "ja_em_andamento" sem rodar o pipeline quando o pedido já está em_geracao', async () => {
		const { store } = fakeStore({ [PEDIDO_PATH]: { status: 'em_geracao' } });
		const client = fakeClaudeClient(NARRATIVA_VALIDA);
		let chamouLoadSourcePhotos = false;

		const resultado = await executarGeracaoDoPedido(
			{ uid: 'uid-alice', orderId: 'pedido-1', draft: draftPago() },
			{
				store,
				client,
				loadSourcePhotos: async (order) => {
					chamouLoadSourcePhotos = true;
					return fakeLoadSourcePhotos(order);
				}
			}
		);

		expect(resultado).toEqual({ outcome: 'ja_em_andamento' });
		expect(chamouLoadSourcePhotos).toBe(false);
	});

	it('devolve "ja_concluido" sem rodar o pipeline quando o pedido já está gerado', async () => {
		const { store } = fakeStore({ [PEDIDO_PATH]: { status: 'gerado' } });

		const resultado = await executarGeracaoDoPedido(
			{ uid: 'uid-alice', orderId: 'pedido-1', draft: draftPago() },
			{ store, client: fakeClaudeClient(NARRATIVA_VALIDA), loadSourcePhotos: fakeLoadSourcePhotos }
		);

		expect(resultado).toEqual({ outcome: 'ja_concluido' });
	});
});

describe('executarGeracaoDoPedido — caminho de erro', () => {
	it('marca erro_geracao com mensagem sanitizada quando a narrativa falha', async () => {
		const { store, docs } = fakeStore({ [PEDIDO_PATH]: { status: 'aguardando_geracao' } });

		const resultado = await executarGeracaoDoPedido(
			{ uid: 'uid-alice', orderId: 'pedido-1', draft: draftPago() },
			{
				store,
				client: fakeClaudeClient('isto não é JSON'),
				loadSourcePhotos: fakeLoadSourcePhotos
			}
		);

		expect(resultado.outcome).toBe('erro');
		const doc = docs.get(PEDIDO_PATH);
		expect(doc?.status).toBe('erro_geracao');
		expect(typeof doc?.geracaoErro).toBe('string');
	});

	it('marca erro_geracao sem rodar o pipeline quando questionnaire/choice estão incompletos', async () => {
		const { store, docs } = fakeStore({ [PEDIDO_PATH]: { status: 'aguardando_geracao' } });
		let chamouLoadSourcePhotos = false;

		const resultado = await executarGeracaoDoPedido(
			{
				uid: 'uid-alice',
				orderId: 'pedido-1',
				draft: draftPago({ choice: { narrativeStyleId: 'romantico' } })
			},
			{
				store,
				client: fakeClaudeClient(NARRATIVA_VALIDA),
				loadSourcePhotos: async (order) => {
					chamouLoadSourcePhotos = true;
					return fakeLoadSourcePhotos(order);
				}
			}
		);

		expect(resultado.outcome).toBe('erro');
		expect(chamouLoadSourcePhotos).toBe(false);
		expect(docs.get(PEDIDO_PATH)?.status).toBe('erro_geracao');
	});
});
