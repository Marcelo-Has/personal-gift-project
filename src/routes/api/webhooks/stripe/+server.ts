import { error, json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import { AssinaturaWebhookInvalidaError, verificarAssinaturaWebhook } from '$lib/server/stripe';
import { marcarAguardandoGeracao, marcarPago } from '$lib/server/orders';
import type { RequestHandler } from './$types';

/**
 * Webhook do Stripe (F1-07b, issue #97): confirma `checkout.session.completed` e marca o
 * pedido `pago`. `.claude/rules/payments.md`/`security.md`: assinatura verificada antes de
 * qualquer outra coisa — assinatura ausente/inválida nunca chega a tocar o pedido.
 *
 * Corpo lido cru (`request.text()`, nunca `request.json()`): a verificação HMAC do Stripe
 * precisa dos bytes originais da requisição — reparsear o JSON e recodificar mudaria a
 * string assinada e quebraria a verificação.
 *
 * [D-021] Sem `requireUid`: quem autentica esta rota é a assinatura HMAC do Stripe, não uma
 * sessão do Firebase Auth — o Stripe nunca manda uma.
 */
export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.text();
	const signature = request.headers.get('stripe-signature');

	let event: Stripe.Event;
	try {
		event = verificarAssinaturaWebhook({ payload, signature });
	} catch (erro) {
		if (erro instanceof AssinaturaWebhookInvalidaError) {
			error(400, erro.message);
		}
		throw erro;
	}

	if (event.type !== 'checkout.session.completed') {
		return json({ recebido: true });
	}

	const session = event.data.object as Stripe.Checkout.Session;
	const uid = session.metadata?.uid;
	const orderId = session.metadata?.orderId;

	// Sessão sem metadata de uid/orderId não foi criada por `criarSessaoCheckout` — não há
	// pedido para reconciliar aqui (não é erro do comprador, 200 evita retry do Stripe).
	if (!uid || !orderId) {
		return json({ recebido: true });
	}

	// Falha daqui pra frente (pedido não encontrado, Firestore fora do ar) vira 500 e o
	// Stripe reenvia nativamente — retry/dead-letter fica fora do escopo desta issue.
	await marcarPago({ uid, orderId });

	// F2-07 (issue #135): enfileira a geração pesada. `marcarAguardandoGeracao` é idempotente
	// (ver os comentários em `orders.ts`) — um retry do Stripe do mesmo evento não duplica
	// trabalho nem regride o status.
	//
	// O DISPARO do worker não acontece aqui ainda: [D-068] tirou a geração das Netlify
	// Functions (a PoC de D-063 reprovou) e o worker dedicado, com sua URL e seu mecanismo de
	// gatilho, é a issue de continuação. Até lá o pedido fica em `aguardando_geracao` — que é
	// o estado correto de "pago, na fila", não um estado inconsistente.
	await marcarAguardandoGeracao({ uid, orderId });

	return json({ recebido: true });
};
