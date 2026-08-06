import { error, json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import { AssinaturaWebhookInvalidaError, verificarAssinaturaWebhook } from '$lib/server/stripe';
import { marcarAguardandoGeracao, marcarPago } from '$lib/server/orders';
import type { RequestHandler } from './$types';

/**
 * Nome do arquivo em `netlify/functions/` (F2-07, issue #135) — Background Function que
 * roda o pipeline completo. Caminho fixo da convenção da Netlify
 * (`/.netlify/functions/<nome-do-arquivo-sem-extensão>`), não configurável.
 */
const GERAR_PEDIDO_FUNCTION_PATH = '/.netlify/functions/gerar-pedido-background';

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

	// F2-07 (issue #135): enfileira a geração pesada e dispara a Background Function que a
	// roda de ponta a ponta (D-063). `marcarAguardandoGeracao` e o disparo abaixo são
	// idempotentes (ver os comentários em `orders.ts`/`iniciarGeracao`) — um retry do Stripe
	// do mesmo evento (ex.: porque o disparo abaixo falhou da primeira vez, o que faz este
	// handler lançar e responder 500) não duplica trabalho nem regride o status.
	await marcarAguardandoGeracao({ uid, orderId });

	const gerarPedidoUrl = new URL(GERAR_PEDIDO_FUNCTION_PATH, request.url);
	const disparo = await fetch(gerarPedidoUrl, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ uid, orderId })
	});
	if (!disparo.ok) {
		error(500, 'Falha ao disparar a geração do pedido.');
	}

	return json({ recebido: true });
};
