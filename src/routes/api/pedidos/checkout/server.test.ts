import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from './$types';

/**
 * `orders.ts` e `stripe.ts` falam com serviços de verdade (Firestore/Stripe) — dependências
 * externas (`.claude/rules/testing.md`), então são elas que se mockam. `$lib/registry` também
 * é mockado para o `validarEscolha` real (não mockado) enxergar um catálogo com entradas
 * `published`, mesmo padrão de `src/lib/escolha-estilo.test.ts` — hoje TODO o registry real é
 * `draft` (ver aviso da issue #86), então sem isto nenhuma escolha passaria.
 */
const carregarRascunhoMock = vi.fn();
const marcarAguardandoPagamentoMock = vi.fn();
const criarSessaoCheckoutMock = vi.fn();

/** Mesma classe do módulo real: o handler distingue por `instanceof` para responder 409. */
class PedidoNaoEditavelError extends Error {
	constructor() {
		super('Pedido não está mais em rascunho e não pode ser alterado.');
		this.name = 'PedidoNaoEditavelError';
	}
}

vi.mock('$lib/server/orders', () => ({
	carregarRascunho: (...args: unknown[]) => carregarRascunhoMock(...args),
	marcarAguardandoPagamento: (...args: unknown[]) => marcarAguardandoPagamentoMock(...args),
	PedidoNaoEditavelError
}));

vi.mock('$lib/server/stripe', () => ({
	criarSessaoCheckout: (...args: unknown[]) => criarSessaoCheckoutMock(...args)
}));

vi.mock('$lib/registry', () => ({
	getPublishedNarrativeStyles: () => [{ id: 'romantico', label: 'Romântico' }],
	getPublishedPhotoStyles: () => [{ id: 'aquarela', label: 'Aquarela' }],
	getPublishedSizes: () => [{ id: 'mini-15x15', label: 'Mini 15 × 15 cm' }]
}));

const { POST } = await import('./+server');

type Handler = RequestHandler;
type Evento = Parameters<Handler>[0];

function evento(body: unknown, uid: string | null): Evento {
	return {
		request: new Request('http://localhost/api/pedidos/checkout', {
			method: 'POST',
			body: typeof body === 'string' ? body : JSON.stringify(body)
		}),
		locals: { uid },
		url: new URL('http://localhost/api/pedidos/checkout')
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

const CHOICE_VALIDA = {
	narrativeStyleId: 'romantico',
	photoStyleId: 'aquarela',
	sizeId: 'mini-15x15'
};

function rascunho(overrides: Record<string, unknown> = {}) {
	return {
		id: 'pedido-1',
		ownerId: 'uid-1',
		status: 'rascunho',
		createdAt: '2026-07-29T12:00:00.000Z',
		updatedAt: '2026-07-29T12:00:00.000Z',
		questionnaire: QUESTIONARIO_VALIDO,
		choice: CHOICE_VALIDA,
		...overrides
	};
}

// Cada teste usa um uid próprio: `rate-limit.ts` mantém estado em módulo e a chave é
// `checkout:${uid}` — uids repetidos vazariam contagem de um teste para o outro (mesmo
// padrão de `rascunho/server.test.ts`).
beforeEach(() => {
	carregarRascunhoMock.mockReset();
	marcarAguardandoPagamentoMock.mockReset();
	criarSessaoCheckoutMock.mockReset();
});

describe('POST /api/pedidos/checkout', () => {
	it('deve responder 401 sem sessão', async () => {
		expect(await status(POST(evento({ orderId: 'pedido-1' }, null)))).toBe(401);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando o corpo não é JSON', async () => {
		expect(await status(POST(evento('{ isso não é json', 'uid-400-json')))).toBe(400);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando orderId está ausente', async () => {
		expect(await status(POST(evento({}, 'uid-400-orderid')))).toBe(400);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando orderId tem caracteres fora da allow-list', async () => {
		expect(await status(POST(evento({ orderId: '../outro' }, 'uid-400-orderid-2')))).toBe(400);
		expect(carregarRascunhoMock).not.toHaveBeenCalled();
	});

	it('deve responder 404 quando o rascunho não existe', async () => {
		carregarRascunhoMock.mockResolvedValue(null);

		expect(await status(POST(evento({ orderId: 'pedido-1' }, 'uid-404')))).toBe(404);
		expect(criarSessaoCheckoutMock).not.toHaveBeenCalled();
	});

	it('deve responder 409 quando o pedido já saiu do rascunho', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho({ status: 'aguardando_pagamento' }));

		expect(await status(POST(evento({ orderId: 'pedido-1' }, 'uid-409')))).toBe(409);
		expect(criarSessaoCheckoutMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando falta o questionnaire', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho({ questionnaire: undefined }));

		expect(await status(POST(evento({ orderId: 'pedido-1' }, 'uid-400-quest')))).toBe(400);
		expect(criarSessaoCheckoutMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando falta a choice', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho({ choice: undefined }));

		expect(await status(POST(evento({ orderId: 'pedido-1' }, 'uid-400-choice')))).toBe(400);
		expect(criarSessaoCheckoutMock).not.toHaveBeenCalled();
	});

	it('deve responder 400 quando a choice não bate com entradas published do registry', async () => {
		carregarRascunhoMock.mockResolvedValue(
			rascunho({ choice: { ...CHOICE_VALIDA, sizeId: 'tamanho-draft' } })
		);

		expect(await status(POST(evento({ orderId: 'pedido-1' }, 'uid-400-invalida')))).toBe(400);
		expect(criarSessaoCheckoutMock).not.toHaveBeenCalled();
	});

	it('deve criar a sessão de checkout, marcar aguardando_pagamento e devolver a URL', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho());
		criarSessaoCheckoutMock.mockResolvedValue({
			sessionId: 'cs_test_1',
			url: 'https://checkout.stripe.com/cs_test_1'
		});
		marcarAguardandoPagamentoMock.mockResolvedValue(undefined);

		const resposta = await POST(evento({ orderId: 'pedido-1' }, 'uid-200'));

		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ url: 'https://checkout.stripe.com/cs_test_1' });
		expect(criarSessaoCheckoutMock).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'uid-200', orderId: 'pedido-1', sizeId: 'mini-15x15' })
		);
		expect(marcarAguardandoPagamentoMock).toHaveBeenCalledWith({
			uid: 'uid-200',
			orderId: 'pedido-1'
		});
	});

	it('não deve marcar aguardando_pagamento quando a criação da sessão falha', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho());
		criarSessaoCheckoutMock.mockRejectedValue(new Error('Stripe fora do ar'));

		await expect(POST(evento({ orderId: 'pedido-1' }, 'uid-500'))).rejects.toThrow(
			'Stripe fora do ar'
		);
		expect(marcarAguardandoPagamentoMock).not.toHaveBeenCalled();
	});

	it('deve responder 409 quando a transição de status corre em paralelo e perde a corrida', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho());
		criarSessaoCheckoutMock.mockResolvedValue({
			sessionId: 'cs_test_1',
			url: 'https://checkout.stripe.com/cs_test_1'
		});
		marcarAguardandoPagamentoMock.mockRejectedValue(new PedidoNaoEditavelError());

		expect(await status(POST(evento({ orderId: 'pedido-1' }, 'uid-409-race')))).toBe(409);
	});

	it('deve ignorar um ownerId de outro usuário embutido no corpo', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho());
		criarSessaoCheckoutMock.mockResolvedValue({
			sessionId: 'cs_test_1',
			url: 'https://checkout.stripe.com/cs_test_1'
		});
		marcarAguardandoPagamentoMock.mockResolvedValue(undefined);

		await POST(evento({ orderId: 'pedido-1', ownerId: 'uid-bob' }, 'uid-ownerid'));

		expect(carregarRascunhoMock).toHaveBeenCalledWith({ uid: 'uid-ownerid', orderId: 'pedido-1' });
	});

	it('deve responder 429 quando o uid estoura o rate limit', async () => {
		carregarRascunhoMock.mockResolvedValue(rascunho());
		criarSessaoCheckoutMock.mockResolvedValue({
			sessionId: 'cs_test_1',
			url: 'https://checkout.stripe.com/cs_test_1'
		});
		marcarAguardandoPagamentoMock.mockResolvedValue(undefined);
		const uid = 'uid-429';

		for (let i = 0; i < 10; i++) {
			await POST(evento({ orderId: 'pedido-1' }, uid));
		}

		expect(await status(POST(evento({ orderId: 'pedido-1' }, uid)))).toBe(429);
	});
});
