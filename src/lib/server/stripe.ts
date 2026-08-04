import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

/**
 * Cliente Stripe do servidor (F1-07a, issue #86), modo TESTE.
 *
 * Mesmo padrão de `firebase-admin.ts`: mora em `src/lib/server/` para o SvelteKit recusar
 * o build se um módulo de cliente importar daqui, e a chave secreta vem só de
 * `$env/dynamic/private` — nunca no bundle do navegador, nunca commitada (ver `.env.example`).
 *
 * [D-036] autoriza preço de TESTE fictício em código (os números reais são [D-101],
 * pendente). `price_data` inline no line item evita depender de `Price` pré-cadastrado no
 * dashboard do Stripe — configuração manual fora do repo não bloqueia o PR fechar (ver
 * "Fora de escopo" da issue).
 */

const STRIPE_SECRET_KEY_VAR = 'STRIPE_SECRET_KEY';

/** Preço/label de TESTE por `sizeId` do registry (`src/lib/registry.ts`). Valores fictícios. */
const TEST_PRICING_BY_SIZE_ID: Record<string, { amountCents: number; label: string }> = {
	'mini-15x15': { amountCents: 9900, label: 'Mini 15 × 15 cm' },
	'medio-20x20': { amountCents: 14900, label: 'Médio 20 × 20 cm' }
};

/** `undefined` quando o tamanho não tem preço de TESTE mapeado — chamador decide o erro. */
export function getTestPricingForSize(
	sizeId: string
): { amountCents: number; label: string } | undefined {
	return TEST_PRICING_BY_SIZE_ID[sizeId];
}

let cachedClient: Stripe | undefined;

/** Instância única do SDK, criada sob demanda (evita ler a env var em tempo de import). */
export function getStripeClient(): Stripe {
	if (cachedClient) return cachedClient;

	const secretKey = env[STRIPE_SECRET_KEY_VAR];
	if (!secretKey) {
		throw new Error(
			`Variável de ambiente ${STRIPE_SECRET_KEY_VAR} ausente: o cliente Stripe não pode ser inicializado. Ver .env.example.`
		);
	}

	cachedClient = new Stripe(secretKey);
	return cachedClient;
}

/**
 * Interface mínima do SDK usada aqui — permite o teste injetar um dublê sem chave nem
 * chamar a API real, mesmo padrão de `SignableBucket` em `signed-url.ts`.
 */
export interface CheckoutSessionsClient {
	checkout: {
		sessions: {
			create(params: unknown): Promise<{ id: string; url: string | null }>;
		};
	};
}

const STRIPE_WEBHOOK_SECRET_VAR = 'STRIPE_WEBHOOK_SECRET';

/**
 * Erro tipado para a rota do webhook distinguir "assinatura ausente/inválida" (400) de falha
 * de infraestrutura (500) — mesmo padrão de `PedidoNaoEditavelError` em `orders.ts`. Cobre
 * também a env var do segredo ausente: do ponto de vista de quem chama o Stripe, os dois
 * casos são "não processei, tente configurar de novo", então respondem igual.
 */
export class AssinaturaWebhookInvalidaError extends Error {
	constructor(message = 'Assinatura do webhook do Stripe ausente ou inválida.') {
		super(message);
		this.name = 'AssinaturaWebhookInvalidaError';
	}
}

/**
 * Interface mínima do SDK usada aqui — mesmo padrão de `CheckoutSessionsClient`, permite o
 * teste injetar um dublê sem depender de uma assinatura HMAC real.
 */
export interface WebhookEventsClient {
	webhooks: {
		constructEvent(payload: string, signature: string, secret: string): Stripe.Event;
	};
}

export interface VerificarAssinaturaWebhookInput {
	payload: string;
	signature: string | null;
}

/**
 * Verifica a assinatura do evento de webhook (F1-07b, issue #97) — `.claude/rules/payments.md`:
 * todo webhook do Stripe valida a assinatura antes de processar. Segredo lido só via
 * `$env/dynamic/private`, nunca no bundle do cliente, mesmo padrão de `getStripeClient()`.
 */
export function verificarAssinaturaWebhook(
	{ payload, signature }: VerificarAssinaturaWebhookInput,
	stripe: WebhookEventsClient = getStripeClient()
): Stripe.Event {
	const secret = env[STRIPE_WEBHOOK_SECRET_VAR];
	if (!secret || !signature) {
		throw new AssinaturaWebhookInvalidaError();
	}

	try {
		return stripe.webhooks.constructEvent(payload, signature, secret);
	} catch {
		throw new AssinaturaWebhookInvalidaError();
	}
}

export interface CriarSessaoCheckoutInput {
	uid: string;
	orderId: string;
	sizeId: string;
	successUrl: string;
	cancelUrl: string;
}

export interface SessaoCheckout {
	sessionId: string;
	url: string;
}

/**
 * Cria a Checkout Session de TESTE para o tamanho escolhido. `metadata` +
 * `client_reference_id` carregam `uid`/`orderId` para o webhook de F1-07b reconciliar o
 * pagamento com o pedido depois — convenção que esta issue define.
 */
export async function criarSessaoCheckout(
	{ uid, orderId, sizeId, successUrl, cancelUrl }: CriarSessaoCheckoutInput,
	stripe: CheckoutSessionsClient = getStripeClient()
): Promise<SessaoCheckout> {
	const precificacao = getTestPricingForSize(sizeId);
	if (!precificacao) {
		throw new Error(`Sem preço de TESTE configurado para o tamanho "${sizeId}".`);
	}

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: 'brl',
					unit_amount: precificacao.amountCents,
					product_data: { name: `Nossa História — ${precificacao.label}` }
				}
			}
		],
		client_reference_id: uid,
		metadata: { uid, orderId, sizeId },
		success_url: successUrl,
		cancel_url: cancelUrl
	});

	if (!session.url) {
		throw new Error('Stripe não retornou a URL da sessão de checkout.');
	}

	return { sessionId: session.id, url: session.url };
}
