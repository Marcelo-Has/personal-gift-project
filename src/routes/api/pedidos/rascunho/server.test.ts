import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from './$types';

/**
 * `orders.ts` fala com o Firestore de verdade — dependência externa
 * (`.claude/rules/testing.md`), então é ela que se mocka aqui. A rota em si
 * (extração de `uid`, validação Zod, códigos de status) é o que este teste cobre.
 */
const salvarRascunhoMock = vi.fn();
const carregarRascunhoMock = vi.fn();

/** Mesma classe do módulo real: o handler distingue por `instanceof` para responder 409. */
class PedidoNaoEditavelError extends Error {
	constructor() {
		super('Pedido não está mais em rascunho e não pode ser alterado.');
		this.name = 'PedidoNaoEditavelError';
	}
}

/** Mesma classe do módulo real: o handler distingue por `instanceof` para responder 429. */
class LimiteDeRascunhosError extends Error {
	constructor() {
		super('Limite de rascunhos atingido para esta sessão.');
		this.name = 'LimiteDeRascunhosError';
	}
}

vi.mock('$lib/server/orders', () => ({
	salvarRascunho: (...args: unknown[]) => salvarRascunhoMock(...args),
	carregarRascunho: (...args: unknown[]) => carregarRascunhoMock(...args),
	PedidoNaoEditavelError,
	LimiteDeRascunhosError
}));

const { GET, POST } = await import('./+server');

type Handler = RequestHandler;
type Evento = Parameters<Handler>[0];

function eventoPost(body: unknown, uid: string | null): Evento {
	return {
		request: new Request('http://localhost/api/pedidos/rascunho', {
			method: 'POST',
			body: typeof body === 'string' ? body : JSON.stringify(body)
		}),
		locals: { uid }
	} as unknown as Evento;
}

function eventoGet(orderId: string | null, uid: string | null): Evento {
	const url = new URL('http://localhost/api/pedidos/rascunho');
	if (orderId !== null) url.searchParams.set('orderId', orderId);
	return {
		url,
		locals: { uid }
	} as unknown as Evento;
}

async function status(respostaOuPromessa: Response | Promise<Response>): Promise<number> {
	try {
		const resposta = await respostaOuPromessa;
		return resposta.status;
	} catch (erro) {
		return (erro as { status: number }).status;
	}
}

const QUESTIONARIO_VALIDO = {
	people: [
		{ name: 'Ana', traits: ['gentil'] },
		{ name: 'Bia', traits: ['engraçada'] }
	],
	photos: [],
	howTheyMet: 'Na faculdade',
	milestones: [{ title: 'Encontro', description: 'No parque' }],
	insideJokes: ['pizza de sexta'],
	trips: [{ destination: 'Bariloche' }],
	challenges: ['distância'],
	futurePlans: ['morar juntos'],
	specialMessage: 'Amo vocês'
};

beforeEach(() => {
	salvarRascunhoMock.mockReset();
	carregarRascunhoMock.mockReset();
});

// Cada teste usa um uid próprio: `rate-limit.ts` mantém estado em módulo, e POST/GET
// compartilham a mesma chave `rascunho:${uid}` — uids repetidos vazariam contagem de um
// teste para o outro (mesmo padrão de `url-de-upload/server.test.ts`).
describe('POST /api/pedidos/rascunho', () => {
	it('deve responder 401 sem sessão', async () => {
		const resposta = status(
			POST(eventoPost({ orderId: 'pedido-1', questionnaire: QUESTIONARIO_VALIDO }, null))
		);

		expect(await resposta).toBe(401);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	// 409 e não 500: a requisição é válida, o que não bate é o estado do pedido. Sem isto, um
	// POST rebaixaria pedido pago para rascunho — o buraco que a trava em `orders.ts` fecha.
	it('deve responder 409 quando o pedido já saiu do rascunho', async () => {
		salvarRascunhoMock.mockRejectedValue(new PedidoNaoEditavelError());

		const resposta = status(
			POST(eventoPost({ orderId: 'pedido-1', questionnaire: QUESTIONARIO_VALIDO }, 'uid-409-1'))
		);

		expect(await resposta).toBe(409);
	});

	// Issue #74: `salvarRascunho` recusa criar um rascunho novo acima do teto por uid. O
	// handler distingue por `instanceof`, como já faz com `PedidoNaoEditavelError`/409.
	it('deve responder 429 quando o uid estourou o teto de rascunhos distintos', async () => {
		salvarRascunhoMock.mockRejectedValue(new LimiteDeRascunhosError());

		const resposta = status(
			POST(
				eventoPost({ orderId: 'pedido-novo', questionnaire: QUESTIONARIO_VALIDO }, 'uid-limite-1')
			)
		);

		expect(await resposta).toBe(429);
	});

	it('deve responder 400 e não escrever nada quando o corpo não é JSON', async () => {
		expect(await status(POST(eventoPost('{ isso não é json', 'uid-400-json')))).toBe(400);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 e não escrever nada quando o corpo foge do schema', async () => {
		expect(
			await status(
				POST(
					eventoPost({ orderId: 'pedido-1', questionnaire: { howTheyMet: 123 } }, 'uid-400-schema')
				)
			)
		).toBe(400);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando orderId tem caracteres fora da allow-list', async () => {
		expect(
			await status(POST(eventoPost({ orderId: '../outro', questionnaire: {} }, 'uid-400-orderid')))
		).toBe(400);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve salvar com o uid da sessão quando sessão e corpo são válidos', async () => {
		salvarRascunhoMock.mockResolvedValue(undefined);

		const resposta = await POST(
			eventoPost({ orderId: 'pedido-1', questionnaire: QUESTIONARIO_VALIDO }, 'uid-200-post')
		);

		expect(resposta.status).toBe(200);
		expect(salvarRascunhoMock).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'uid-200-post', orderId: 'pedido-1' })
		);
	});

	it('deve ignorar um ownerId de outro usuário embutido no corpo', async () => {
		salvarRascunhoMock.mockResolvedValue(undefined);

		await POST(
			eventoPost(
				{ orderId: 'pedido-1', ownerId: 'uid-bob', userId: 'uid-bob', questionnaire: {} },
				'uid-ownerid-post'
			)
		);

		const chamada = salvarRascunhoMock.mock.calls[0][0];
		expect(chamada.uid).toBe('uid-ownerid-post');
		expect(chamada).not.toHaveProperty('ownerId');
		expect(chamada).not.toHaveProperty('userId');
	});

	it('deve responder 429 quando o uid estoura o rate limit', async () => {
		salvarRascunhoMock.mockResolvedValue(undefined);
		const uid = 'uid-429-post';

		for (let i = 0; i < 10; i++) {
			await POST(eventoPost({ orderId: `pedido-${i}`, questionnaire: {} }, uid));
		}

		expect(await status(POST(eventoPost({ orderId: 'pedido-10', questionnaire: {} }, uid)))).toBe(
			429
		);
	});
});

describe('GET /api/pedidos/rascunho', () => {
	it('deve responder 401 sem sessão', async () => {
		expect(await status(GET(eventoGet('pedido-1', null)))).toBe(401);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando falta o orderId', async () => {
		expect(await status(GET(eventoGet(null, 'uid-400-get-missing')))).toBe(400);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	// Antes, o parâmetro cru descia até `assertSafeOrderId` e o `Error` comum de lá virava
	// 500. O traversal já estava barrado; era o contrato que divergia do `POST`, que valida
	// o mesmo id com Zod e responde 400.
	it.each(['../outro', '../../etc/passwd', 'pedido com espaco', 'a'.repeat(129)])(
		'deve responder 400 (não 500) quando o orderId é malformado: %j',
		async (orderId, indice) => {
			expect(await status(GET(eventoGet(orderId, `uid-400-malformado-${indice}`)))).toBe(400);
			expect(carregarRascunhoMock).not.toHaveBeenCalled();
		}
	);

	it('deve devolver o rascunho do dono quando ele existe', async () => {
		carregarRascunhoMock.mockResolvedValue({
			id: 'pedido-1',
			ownerId: 'uid-200-get',
			status: 'rascunho',
			createdAt: '2026-07-29T12:00:00.000Z',
			updatedAt: '2026-07-29T12:00:00.000Z',
			questionnaire: { howTheyMet: 'oi' }
		});

		const resposta = await GET(eventoGet('pedido-1', 'uid-200-get'));

		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toMatchObject({ ownerId: 'uid-200-get' });
		expect(carregarRascunhoMock).toHaveBeenCalledWith({ uid: 'uid-200-get', orderId: 'pedido-1' });
	});

	it('deve responder 404 (nunca o documento) quando o rascunho não existe para o uid pedido', async () => {
		carregarRascunhoMock.mockResolvedValue(null);

		const resposta = status(GET(eventoGet('pedido-de-outro', 'uid-404-bob')));

		expect(await resposta).toBe(404);
	});

	it('deve responder 429 quando o uid estoura o rate limit', async () => {
		carregarRascunhoMock.mockResolvedValue({
			id: 'pedido-1',
			ownerId: 'uid-429-get',
			status: 'rascunho',
			createdAt: '2026-07-29T12:00:00.000Z',
			updatedAt: '2026-07-29T12:00:00.000Z'
		});
		const uid = 'uid-429-get';

		for (let i = 0; i < 10; i++) {
			await GET(eventoGet('pedido-1', uid));
		}

		expect(await status(GET(eventoGet('pedido-1', uid)))).toBe(429);
	});
});
