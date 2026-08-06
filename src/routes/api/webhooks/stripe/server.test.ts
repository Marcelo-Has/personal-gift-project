import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from './$types';

/**
 * `stripe.ts` e `orders.ts` falam com serviços de verdade (Stripe/Firestore) — dependências
 * externas (`.claude/rules/testing.md`), então são elas que se mockam. Mesmo padrão de
 * `api/pedidos/checkout/server.test.ts`.
 */
const verificarAssinaturaWebhookMock = vi.fn();
const marcarPagoMock = vi.fn();
const marcarAguardandoGeracaoMock = vi.fn();
const fetchMock = vi.fn();

/** Mesma classe do módulo real: o handler distingue por `instanceof` para responder 400. */
class AssinaturaWebhookInvalidaError extends Error {
	constructor(message = 'Assinatura do webhook do Stripe ausente ou inválida.') {
		super(message);
		this.name = 'AssinaturaWebhookInvalidaError';
	}
}

vi.mock('$lib/server/stripe', () => ({
	verificarAssinaturaWebhook: (...args: unknown[]) => verificarAssinaturaWebhookMock(...args),
	AssinaturaWebhookInvalidaError
}));

vi.mock('$lib/server/orders', () => ({
	marcarPago: (...args: unknown[]) => marcarPagoMock(...args),
	marcarAguardandoGeracao: (...args: unknown[]) => marcarAguardandoGeracaoMock(...args)
}));

const { POST } = await import('./+server');

type Handler = RequestHandler;
type Evento = Parameters<Handler>[0];

function evento(corpo: string, signature: string | null): Evento {
	const headers = new Headers();
	if (signature !== null) headers.set('stripe-signature', signature);

	return {
		request: new Request('http://localhost/api/webhooks/stripe', {
			method: 'POST',
			body: corpo,
			headers
		})
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

function eventoStripe(type: string, metadata: Record<string, string> | undefined = undefined) {
	return {
		id: 'evt_1',
		type,
		data: {
			object: {
				id: 'cs_test_1',
				metadata
			}
		}
	};
}

beforeEach(() => {
	verificarAssinaturaWebhookMock.mockReset();
	marcarPagoMock.mockReset();
	marcarAguardandoGeracaoMock.mockReset().mockResolvedValue(undefined);
	fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
	vi.stubGlobal('fetch', fetchMock);
});

describe('POST /api/webhooks/stripe', () => {
	it('deve responder 400 quando a assinatura está ausente ou inválida, sem tocar o pedido', async () => {
		verificarAssinaturaWebhookMock.mockImplementation(() => {
			throw new AssinaturaWebhookInvalidaError();
		});

		expect(await status(POST(evento('{}', null)))).toBe(400);
		expect(marcarPagoMock).not.toHaveBeenCalled();
	});

	it('deve ler o corpo cru e repassar payload + header de assinatura para a verificação', async () => {
		verificarAssinaturaWebhookMock.mockReturnValue(
			eventoStripe('checkout.session.completed', { uid: 'uid-1', orderId: 'pedido-1' })
		);
		marcarPagoMock.mockResolvedValue(undefined);

		const corpoBruto = '{"id":"evt_1","type":"checkout.session.completed"}';
		await POST(evento(corpoBruto, 'sig-valida'));

		expect(verificarAssinaturaWebhookMock).toHaveBeenCalledWith({
			payload: corpoBruto,
			signature: 'sig-valida'
		});
	});

	it('deve responder 200 sem chamar marcarPago para um tipo de evento diferente', async () => {
		verificarAssinaturaWebhookMock.mockReturnValue(eventoStripe('payment_intent.succeeded'));

		expect(await status(POST(evento('{}', 'sig-valida')))).toBe(200);
		expect(marcarPagoMock).not.toHaveBeenCalled();
	});

	it('deve marcar o pedido pago e disparar a geração quando o evento é checkout.session.completed com assinatura válida', async () => {
		verificarAssinaturaWebhookMock.mockReturnValue(
			eventoStripe('checkout.session.completed', { uid: 'uid-1', orderId: 'pedido-1' })
		);
		marcarPagoMock.mockResolvedValue(undefined);

		const resposta = await POST(evento('{}', 'sig-valida'));

		expect(resposta.status).toBe(200);
		expect(marcarPagoMock).toHaveBeenCalledWith({ uid: 'uid-1', orderId: 'pedido-1' });
		expect(marcarAguardandoGeracaoMock).toHaveBeenCalledWith({ uid: 'uid-1', orderId: 'pedido-1' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
		expect(url.toString()).toBe('http://localhost/.netlify/functions/gerar-pedido-background');
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({ uid: 'uid-1', orderId: 'pedido-1' });
	});

	it('deve responder 500 quando o disparo da Background Function falha, para o Stripe reenviar o evento', async () => {
		verificarAssinaturaWebhookMock.mockReturnValue(
			eventoStripe('checkout.session.completed', { uid: 'uid-1', orderId: 'pedido-1' })
		);
		marcarPagoMock.mockResolvedValue(undefined);
		fetchMock.mockResolvedValue(new Response('erro interno', { status: 500 }));

		expect(await status(POST(evento('{}', 'sig-valida')))).toBe(500);
	});

	it('deve responder 200 sem chamar marcarPago quando a sessão não tem metadata de uid/orderId', async () => {
		verificarAssinaturaWebhookMock.mockReturnValue(
			eventoStripe('checkout.session.completed', undefined)
		);

		expect(await status(POST(evento('{}', 'sig-valida')))).toBe(200);
		expect(marcarPagoMock).not.toHaveBeenCalled();
	});

	it('deve propagar erro (500) quando marcarPago falha depois da assinatura verificada', async () => {
		verificarAssinaturaWebhookMock.mockReturnValue(
			eventoStripe('checkout.session.completed', { uid: 'uid-1', orderId: 'pedido-1' })
		);
		marcarPagoMock.mockRejectedValue(new Error('Firestore fora do ar'));

		await expect(POST(evento('{}', 'sig-valida'))).rejects.toThrow('Firestore fora do ar');
	});

	it('evento repetido (idempotente) responde 200 sem lançar erro', async () => {
		verificarAssinaturaWebhookMock.mockReturnValue(
			eventoStripe('checkout.session.completed', { uid: 'uid-1', orderId: 'pedido-1' })
		);
		marcarPagoMock.mockResolvedValue(undefined);

		expect(await status(POST(evento('{}', 'sig-valida')))).toBe(200);
	});
});
