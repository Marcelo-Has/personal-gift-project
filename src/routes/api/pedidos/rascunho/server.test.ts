import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from './$types';

/**
 * `orders.ts` fala com o Firestore de verdade — dependência externa
 * (`.claude/rules/testing.md`), então é ela que se mocka aqui. A rota em si
 * (extração de `uid`, validação Zod, códigos de status) é o que este teste cobre.
 */
const salvarRascunhoMock = vi.fn();
const carregarRascunhoMock = vi.fn();

vi.mock('$lib/server/orders', () => ({
	salvarRascunho: (...args: unknown[]) => salvarRascunhoMock(...args),
	carregarRascunho: (...args: unknown[]) => carregarRascunhoMock(...args)
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

describe('POST /api/pedidos/rascunho', () => {
	it('deve responder 401 sem sessão', async () => {
		const resposta = status(
			POST(eventoPost({ orderId: 'pedido-1', questionnaire: QUESTIONARIO_VALIDO }, null))
		);

		expect(await resposta).toBe(401);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 e não escrever nada quando o corpo não é JSON', async () => {
		expect(await status(POST(eventoPost('{ isso não é json', 'uid-alice')))).toBe(400);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 e não escrever nada quando o corpo foge do schema', async () => {
		expect(
			await status(
				POST(eventoPost({ orderId: 'pedido-1', questionnaire: { howTheyMet: 123 } }, 'uid-alice'))
			)
		).toBe(400);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando orderId tem caracteres fora da allow-list', async () => {
		expect(
			await status(POST(eventoPost({ orderId: '../outro', questionnaire: {} }, 'uid-alice')))
		).toBe(400);
		expect(salvarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve salvar com o uid da sessão quando sessão e corpo são válidos', async () => {
		salvarRascunhoMock.mockResolvedValue(undefined);

		const resposta = await POST(
			eventoPost({ orderId: 'pedido-1', questionnaire: QUESTIONARIO_VALIDO }, 'uid-alice')
		);

		expect(resposta.status).toBe(200);
		expect(salvarRascunhoMock).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'uid-alice', orderId: 'pedido-1' })
		);
	});

	it('deve ignorar um ownerId de outro usuário embutido no corpo', async () => {
		salvarRascunhoMock.mockResolvedValue(undefined);

		await POST(
			eventoPost(
				{ orderId: 'pedido-1', ownerId: 'uid-bob', userId: 'uid-bob', questionnaire: {} },
				'uid-alice'
			)
		);

		const chamada = salvarRascunhoMock.mock.calls[0][0];
		expect(chamada.uid).toBe('uid-alice');
		expect(chamada).not.toHaveProperty('ownerId');
		expect(chamada).not.toHaveProperty('userId');
	});
});

describe('GET /api/pedidos/rascunho', () => {
	it('deve responder 401 sem sessão', async () => {
		expect(await status(GET(eventoGet('pedido-1', null)))).toBe(401);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando falta o orderId', async () => {
		expect(await status(GET(eventoGet(null, 'uid-alice')))).toBe(400);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve devolver o rascunho do dono quando ele existe', async () => {
		carregarRascunhoMock.mockResolvedValue({
			id: 'pedido-1',
			ownerId: 'uid-alice',
			status: 'rascunho',
			createdAt: '2026-07-29T12:00:00.000Z',
			updatedAt: '2026-07-29T12:00:00.000Z',
			questionnaire: { howTheyMet: 'oi' }
		});

		const resposta = await GET(eventoGet('pedido-1', 'uid-alice'));

		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toMatchObject({ ownerId: 'uid-alice' });
		expect(carregarRascunhoMock).toHaveBeenCalledWith({ uid: 'uid-alice', orderId: 'pedido-1' });
	});

	it('deve responder 404 (nunca o documento) quando o rascunho não existe para o uid pedido', async () => {
		carregarRascunhoMock.mockResolvedValue(null);

		const resposta = status(GET(eventoGet('pedido-de-outro', 'uid-bob')));

		expect(await resposta).toBe(404);
	});
});
