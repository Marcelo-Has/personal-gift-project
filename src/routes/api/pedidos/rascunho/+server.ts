import { error, json } from '@sveltejs/kit';
import { requireUid } from '$lib/server/auth';
import { salvarRascunhoSchema } from '$lib/order-schema';
import { carregarRascunho, salvarRascunho } from '$lib/server/orders';
import type { RequestHandler } from './$types';

/**
 * Rascunho do pedido, pré-pagamento (F1-05c, issue #33).
 *
 * `requireUid` exige sessão (401 sem ela). O corpo é sempre revalidado com o
 * mesmo schema Zod do cliente (`.claude/rules/security.md`: "valide e sanitize
 * TODA entrada") — corpo fora do schema nunca chega a tocar o Firestore.
 * `orderId` vem do corpo/query, mas o caminho do documento é sempre
 * `users/<uid>/orders/<orderId>` com o `uid` da sessão: nada no corpo (nem um
 * `ownerId` de outro usuário) altera de quem é o rascunho.
 */

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUid(locals);

	let corpo: unknown;
	try {
		corpo = await request.json();
	} catch {
		error(400, 'Corpo da requisição precisa ser JSON.');
	}

	const resultado = salvarRascunhoSchema.safeParse(corpo);
	if (!resultado.success) {
		error(400, `Corpo inválido: ${resultado.error.issues.map((i) => i.message).join('; ')}`);
	}

	const { orderId, questionnaire, choice } = resultado.data;

	await salvarRascunho({ uid, orderId, dados: { questionnaire, choice } });

	return json({ ok: true });
};

export const GET: RequestHandler = async ({ locals, url }) => {
	const uid = requireUid(locals);

	const orderId = url.searchParams.get('orderId');
	if (!orderId) {
		error(400, 'Parâmetro orderId é obrigatório.');
	}

	const rascunho = await carregarRascunho({ uid, orderId });
	if (!rascunho) {
		error(404, 'Rascunho não encontrado.');
	}

	return json(rascunho);
};
