import { describe, expect, it } from 'vitest';
import {
	TEST_PRICE_CENTS_BY_SIZE_ID,
	TamanhoSemPrecoDeTesteError,
	createCheckoutSession,
	type CheckoutSessionsClient
} from './stripe';

/**
 * Cliente Stripe falso: o SDK é dependência externa, então é ele que se mocka
 * (`.claude/rules/testing.md`), no mesmo padrão de `SignableBucket`/`fakeBucket` em
 * `signed-url.test.ts`. Nenhuma chave, nenhuma chamada à API real.
 */
function fakeStripeClient() {
	const chamadas: unknown[] = [];
	const client: CheckoutSessionsClient = {
		checkout: {
			sessions: {
				async create(params) {
					chamadas.push(params);
					return { id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' };
				}
			}
		}
	};
	return { client, chamadas };
}

const ENTRADA_BASE = {
	uid: 'uid-1',
	orderId: 'pedido-9',
	sizeId: 'mini-15x15',
	sizeLabel: 'Mini 15 × 15 cm',
	successUrl: 'https://app.exemplo.com/pedido/sucesso',
	cancelUrl: 'https://app.exemplo.com/pedido/cancelado'
};

describe('createCheckoutSession', () => {
	it('deve criar a sessão em modo pagamento com o preço de teste do tamanho', async () => {
		const { client, chamadas } = fakeStripeClient();

		const resultado = await createCheckoutSession(ENTRADA_BASE, client);

		expect(resultado).toEqual({
			id: 'cs_test_123',
			url: 'https://checkout.stripe.com/c/pay/cs_test_123'
		});
		expect(chamadas).toHaveLength(1);
		const params = chamadas[0] as {
			mode: string;
			success_url: string;
			cancel_url: string;
			client_reference_id: string;
			metadata: Record<string, string>;
			line_items: { quantity: number; price_data: { currency: string; unit_amount: number } }[];
		};
		expect(params.mode).toBe('payment');
		expect(params.success_url).toBe(ENTRADA_BASE.successUrl);
		expect(params.cancel_url).toBe(ENTRADA_BASE.cancelUrl);
		expect(params.line_items).toHaveLength(1);
		expect(params.line_items[0].quantity).toBe(1);
		expect(params.line_items[0].price_data.currency).toBe('brl');
		expect(params.line_items[0].price_data.unit_amount).toBe(
			TEST_PRICE_CENTS_BY_SIZE_ID['mini-15x15']
		);
	});

	// Webhook de F1-07b reconcilia pagamento com pedido a partir daqui — sem isto, a sessão
	// paga não teria como voltar a ser associada a um `uid`/`orderId`.
	it('deve carregar uid e orderId em metadata e client_reference_id', async () => {
		const { client, chamadas } = fakeStripeClient();

		await createCheckoutSession(ENTRADA_BASE, client);

		const params = chamadas[0] as {
			client_reference_id: string;
			metadata: Record<string, string>;
		};
		expect(params.client_reference_id).toBe('uid-1');
		expect(params.metadata).toEqual({ uid: 'uid-1', orderId: 'pedido-9', sizeId: 'mini-15x15' });
	});

	it('deve usar o preço do tamanho médio quando o sizeId é medio-20x20', async () => {
		const { client, chamadas } = fakeStripeClient();

		await createCheckoutSession({ ...ENTRADA_BASE, sizeId: 'medio-20x20' }, client);

		const params = chamadas[0] as {
			line_items: { price_data: { unit_amount: number } }[];
		};
		expect(params.line_items[0].price_data.unit_amount).toBe(
			TEST_PRICE_CENTS_BY_SIZE_ID['medio-20x20']
		);
	});

	it('deve recusar um sizeId sem preço de teste configurado, sem chamar o Stripe', async () => {
		const { client, chamadas } = fakeStripeClient();

		await expect(
			createCheckoutSession({ ...ENTRADA_BASE, sizeId: 'tamanho-inexistente' }, client)
		).rejects.toThrow(TamanhoSemPrecoDeTesteError);
		expect(chamadas).toHaveLength(0);
	});
});
