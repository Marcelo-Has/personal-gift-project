import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type { CheckoutSessionsClient, WebhookEventsClient } from './stripe';

/**
 * `$env/dynamic/private` lê `process.env` só no momento em que o plugin do SvelteKit monta o
 * módulo virtual — mudar `process.env` em runtime de teste não é visto por quem já importou.
 * Mesma técnica de mock de dependência externa das outras suítes, aplicada ao módulo de env.
 * Prefixo `mock` é exigido pelo vitest: variável referenciada dentro de `vi.mock` (hoisted).
 */
const mockEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

const {
	AssinaturaWebhookInvalidaError,
	criarSessaoCheckout,
	getTestPricingForSize,
	verificarAssinaturaWebhook
} = await import('./stripe');

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
					return session.url
						? session
						: { ...session, url: 'https://checkout.stripe.com/cs_test_1' };
				}
			}
		}
	};
	return { stripe, calls };
}

describe('getTestPricingForSize', () => {
	it('deve devolver preço e label para um sizeId mapeado', () => {
		expect(getTestPricingForSize('mini-15x15')).toEqual({
			amountCents: 9900,
			label: 'Mini 15 × 15 cm'
		});
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

describe('verificarAssinaturaWebhook', () => {
	const SEGREDO_DE_TESTE = 'segredo-de-teste-do-webhook';
	const EVENTO_FALSO = { id: 'evt_1', type: 'checkout.session.completed' } as Stripe.Event;

	function fakeWebhookStripe(deveFalhar = false) {
		const calls: unknown[] = [];
		const stripe: WebhookEventsClient = {
			webhooks: {
				constructEvent(payload, signature, secret) {
					calls.push({ payload, signature, secret });
					if (deveFalhar) throw new Error('assinatura não bate');
					return EVENTO_FALSO;
				}
			}
		};
		return { stripe, calls };
	}

	beforeEach(() => {
		mockEnv.STRIPE_WEBHOOK_SECRET = SEGREDO_DE_TESTE;
	});

	afterEach(() => {
		delete mockEnv.STRIPE_WEBHOOK_SECRET;
	});

	it('deve devolver o evento quando a assinatura é válida', () => {
		const { stripe, calls } = fakeWebhookStripe();

		const resultado = verificarAssinaturaWebhook(
			{ payload: '{"id":"evt_1"}', signature: 'sig-valida' },
			stripe
		);

		expect(resultado).toBe(EVENTO_FALSO);
		expect(calls).toEqual([
			{ payload: '{"id":"evt_1"}', signature: 'sig-valida', secret: SEGREDO_DE_TESTE }
		]);
	});

	it('deve lançar AssinaturaWebhookInvalidaError quando o SDK rejeita a assinatura', () => {
		const { stripe } = fakeWebhookStripe(true);

		expect(() =>
			verificarAssinaturaWebhook({ payload: '{}', signature: 'sig-invalida' }, stripe)
		).toThrow(AssinaturaWebhookInvalidaError);
	});

	it('deve lançar AssinaturaWebhookInvalidaError quando o header de assinatura está ausente', () => {
		const { stripe, calls } = fakeWebhookStripe();

		expect(() => verificarAssinaturaWebhook({ payload: '{}', signature: null }, stripe)).toThrow(
			AssinaturaWebhookInvalidaError
		);
		expect(calls).toHaveLength(0);
	});

	it('deve lançar AssinaturaWebhookInvalidaError quando a env var do segredo está ausente', () => {
		delete mockEnv.STRIPE_WEBHOOK_SECRET;
		const { stripe, calls } = fakeWebhookStripe();

		expect(() =>
			verificarAssinaturaWebhook({ payload: '{}', signature: 'sig-valida' }, stripe)
		).toThrow(AssinaturaWebhookInvalidaError);
		expect(calls).toHaveLength(0);
	});
});
