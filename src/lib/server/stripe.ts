import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

/**
 * Cliente Stripe do servidor, modo TESTE (F1-07a, issue #86).
 *
 * Mora em `src/lib/server/` pelo mesmo motivo de `firebase-admin.ts`: o SvelteKit recusa
 * o build se um módulo de cliente importar daqui — garantia mecânica de que a chave
 * secreta nunca entra no bundle do navegador. `$env/dynamic/private` (não o estático)
 * pelo mesmo motivo de `firebase-admin.ts`: não exige a variável em tempo de build.
 *
 * `.claude/rules/payments.md`: preço nunca vem do cliente. O `sizeId` (já validado contra
 * o registry por quem chama) escolhe o preço AQUI, em `TEST_PRICE_CENTS_BY_SIZE_ID` — valores
 * fictícios que [D-036] autoriza em código; os números reais ficam em [D-101] (Fase 3) e não
 * bloqueiam o modo teste. `price_data` inline no line_item em vez de um `Price` pré-cadastrado
 * no dashboard: evita depender de configuração manual externa ao repo para o PR fechar.
 */

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(
			`Variável de ambiente ${name} ausente: o Stripe não pode ser inicializado. Ver .env.example.`
		);
	}
	return value;
}

let cachedClient: Stripe | undefined;

/** Instância única do SDK, criada sob demanda (mesmo padrão de `getAdminApp`). */
export function getStripeClient(): Stripe {
	if (!cachedClient) {
		cachedClient = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
	}
	return cachedClient;
}

/**
 * Preço de TESTE por `sizeId`, em centavos de BRL — ids batem com
 * `src/lib/product-skills/registry.json`. Valores de mentira ([D-036]); quem chama já
 * validou o `sizeId` contra as entradas `published` do registry (`validarEscolha`) antes
 * de chegar aqui.
 */
export const TEST_PRICE_CENTS_BY_SIZE_ID: Record<string, number> = {
	'mini-15x15': 9990,
	'medio-20x20': 14990
};

/** Interface mínima do Checkout usada aqui — permite o teste injetar um dublê sem chave nem API real. */
export interface CheckoutSessionsClient {
	checkout: {
		sessions: {
			create(
				params: Stripe.Checkout.SessionCreateParams
			): Promise<{ id: string; url: string | null }>;
		};
	};
}

export class TamanhoSemPrecoDeTesteError extends Error {
	constructor(sizeId: string) {
		super(`Tamanho "${sizeId}" não tem preço de teste configurado.`);
		this.name = 'TamanhoSemPrecoDeTesteError';
	}
}

export interface CreateCheckoutSessionInput {
	uid: string;
	orderId: string;
	sizeId: string;
	sizeLabel: string;
	successUrl: string;
	cancelUrl: string;
}

export interface CheckoutSessionResult {
	id: string;
	url: string;
}

/**
 * Cria a Checkout Session de TESTE para o tamanho escolhido. `metadata` e
 * `client_reference_id` carregam `uid`+`orderId` para o webhook de F1-07b reconciliar o
 * pagamento com o pedido depois — nenhum dos dois é lido de volta aqui.
 */
export async function createCheckoutSession(
	{ uid, orderId, sizeId, sizeLabel, successUrl, cancelUrl }: CreateCheckoutSessionInput,
	client: CheckoutSessionsClient = getStripeClient()
): Promise<CheckoutSessionResult> {
	const unitAmount = TEST_PRICE_CENTS_BY_SIZE_ID[sizeId];
	if (unitAmount === undefined) {
		throw new TamanhoSemPrecoDeTesteError(sizeId);
	}

	const session = await client.checkout.sessions.create({
		mode: 'payment',
		client_reference_id: uid,
		metadata: { uid, orderId, sizeId },
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: 'brl',
					unit_amount: unitAmount,
					product_data: { name: `Nossa História — ${sizeLabel}` }
				}
			}
		],
		success_url: successUrl,
		cancel_url: cancelUrl
	});

	if (!session.url) {
		throw new Error('Stripe não devolveu a URL da sessão de checkout.');
	}

	return { id: session.id, url: session.url };
}
