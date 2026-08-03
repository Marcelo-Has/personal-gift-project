import { describe, expect, it } from 'vitest';
import {
	criarSessaoCheckout,
	getTestPricingForSize,
	type CheckoutSessionsClient
} from './stripe';

/**
 * Cliente Stripe falso: a API é dependência externa, então é ela que se mocka
 * (`.claude/rules/testing.md`). Mesmo padrão de `fakeBucket()` em `signed-url.test.ts`.
 */
function fakeStripe(session: { id: string; url: string | null } = { id: 'cs_test_1', url: null }) {
	const calls: unknown[] = [];
	const stripe: CheckoutSessionsClient = {
		checkout: {
			sessions: {
				async create(params) {
					calls.push(params);
					return session.url ? session : { ...session, url: 'https://checkout.stripe.com/cs_test_1' };
				}
			}
		}
	};
	return { stripe, calls };
}

describe('getTestPricingForSize', () => {
	it('deve devolver preço e label para um sizeId mapeado', () => {
		expect(getTestPricingForSize('mini-15x15')).toEqual({ amountCents: 9900, label: 'Mini 15 × 15 cm' });
	});

	it('deve devolver undefined para um sizeId sem preço de teste', () => {
		expect(getTestPricingForSize('tamanho-inexistente')).toBeUndefined();
	});
});

describe('criarSessaoCheckout', () => {
	it('deve criar a sessão com o line_item do tamanho certo e devolver a URL', async () => {
		const { stripe, calls } = fakeStripe();

		const resultado = await criarSessaoCheckout(
			{
				uid: 'uid-1',
				orderId: 'pedido-1',
				sizeId: 'mini-15x15',
				successUrl: 'https://app.exemplo/pedido/sucesso',
				cancelUrl: 'https://app.exemplo/pedido/cancelado'
			},
			stripe
		);

		expect(resultado).toEqual({
			sessionId: 'cs_test_1',
			url: 'https://checkout.stripe.com/cs_test_1'
		});

		const params = calls[0] as Record<string, unknown>;
		expect(params.mode).toBe('payment');
		expect(params.client_reference_id).toBe('uid-1');
		expect(params.metadata).toEqual({ uid: 'uid-1', orderId: 'pedido-1', sizeId: 'mini-15x15' });
		expect(params.success_url).toBe('https://app.exemplo/pedido/sucesso');
		expect(params.cancel_url).toBe('https://app.exemplo/pedido/cancelado');
		expect(params.line_items).toEqual([
			{
				quantity: 1,
				price_data: {
					currency: 'brl',
					unit_amount: 9900,
					product_data: { name: 'Nossa História — Mini 15 × 15 cm' }
				}
			}
		]);
	});

	it('deve rejeitar um sizeId sem preço de teste mapeado, sem chamar o Stripe', async () => {
		const { stripe, calls } = fakeStripe();

		await expect(
			criarSessaoCheckout(
				{
					uid: 'uid-1',
					orderId: 'pedido-1',
					sizeId: 'tamanho-inexistente',
					successUrl: 'https://app.exemplo/pedido/sucesso',
					cancelUrl: 'https://app.exemplo/pedido/cancelado'
				},
				stripe
			)
		).rejects.toThrow(/Sem preço de TESTE configurado/);

		expect(calls).toHaveLength(0);
	});

	it('deve propagar erro quando o Stripe não devolve URL da sessão', async () => {
		const { stripe } = fakeStripe({ id: 'cs_test_2', url: null });
		// Sobrescreve para simular o Stripe respondendo sem `url` mesmo em caso de sucesso.
		stripe.checkout.sessions.create = async () => ({ id: 'cs_test_2', url: null });

		await expect(
			criarSessaoCheckout(
				{
					uid: 'uid-1',
					orderId: 'pedido-1',
					sizeId: 'mini-15x15',
					successUrl: 'https://app.exemplo/pedido/sucesso',
					cancelUrl: 'https://app.exemplo/pedido/cancelado'
				},
				stripe
			)
		).rejects.toThrow(/não retornou a URL/);
	});
});
