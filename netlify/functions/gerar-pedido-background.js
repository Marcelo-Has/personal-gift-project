/**
 * Background Function do worker de geração (F2-07, issue #135) — o disparo real depois da
 * PoC de `poc-render-background.js`/D-063: orquestra narrativa + fotos + layout + render
 * (`executarGeracaoDoPedido`, `src/lib/generation-engine/order-worker.ts`) para UM pedido
 * `pago`, disparada pelo webhook do Stripe (`src/routes/api/webhooks/stripe/+server.ts`)
 * logo depois de marcar `aguardando_geracao`.
 *
 * Sufixo `-background` (convenção da Netlify): responde 202 quase de imediato e continua
 * rodando por até 15 min — por isso o resultado nunca vai na resposta HTTP, só no status
 * do pedido no Firestore (`orders.ts`: `gerado`/`erro_geracao`), que é o que
 * `executarGeracaoDoPedido` já grava.
 *
 * Corpo esperado: `{ uid, orderId }` (o `+server.ts` do webhook já validou os dois contra
 * `session.metadata` antes de chamar). Sem validação de assinatura aqui — Netlify Functions
 * não são endpoint público documentado, mas por segurança-em-profundidade o corpo é
 * conferido antes de tocar o Firestore.
 */
import { getAdminFirestore } from '../../src/lib/server/firebase-admin';
import { loadSourcePhotosFromStorage } from '../../src/lib/server/order-photos';
import { carregarRascunho } from '../../src/lib/server/orders';
import { executarGeracaoDoPedido } from '../../src/lib/generation-engine/order-worker';

function isSafeId(value) {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

async function processarPedido(uid, orderId) {
	const store = getAdminFirestore();
	const draft = await carregarRascunho({ uid, orderId }, store);
	if (!draft) {
		console.error(`gerar-pedido-background: pedido "${orderId}" não encontrado para uid "${uid}".`);
		return;
	}

	const resultado = await executarGeracaoDoPedido(
		{ uid, orderId, draft },
		{
			store,
			loadSourcePhotos: (order) => loadSourcePhotosFromStorage(order, uid, orderId)
		}
	);

	// Log de infraestrutura (progresso/observabilidade), nunca conteúdo do pedido — o
	// resultado detalhado já está no Firestore, este log é só o rastro operacional.
	console.log(
		JSON.stringify({
			event: 'gerar_pedido_background_concluido',
			orderId,
			outcome: resultado.outcome
		})
	);
}

export const handler = async (event) => {
	let body;
	try {
		body = JSON.parse(event.body ?? '{}');
	} catch {
		return { statusCode: 400, body: 'JSON inválido.' };
	}

	const { uid, orderId } = body;
	if (!isSafeId(uid) || !isSafeId(orderId)) {
		return { statusCode: 400, body: 'uid/orderId ausentes ou inválidos.' };
	}

	try {
		await processarPedido(uid, orderId);
	} catch (erro) {
		// Infraestrutura (Firestore fora do ar, etc.) antes mesmo de `executarGeracaoDoPedido`
		// poder gravar `erro_geracao` — `executarGeracaoDoPedido` já captura o resto.
		console.error(
			'gerar-pedido-background: falha não tratada',
			erro instanceof Error ? erro.message : erro
		);
	}

	// Ignorado pela Netlify numa Background Function — mantido para rodar localmente via
	// `netlify functions:invoke` (mesma convenção de `poc-render-background.js`).
	return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
