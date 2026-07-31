import { error, json } from '@sveltejs/kit';
import { requireUid } from '$lib/server/auth';
import { orderIdSchema, salvarRascunhoSchema } from '$lib/order-schema';
import {
	carregarRascunho,
	LimiteDeRascunhosError,
	PedidoNaoEditavelError,
	salvarRascunho
} from '$lib/server/orders';
import { checkRateLimit } from '$lib/server/rate-limit';
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
 *
 * Primeira rota pública de ESCRITA do repositório com sessão anônima — sem rate limit,
 * qualquer um cria `uid`s de graça e enche `users/<uid>/orders` sem custo (issue #74,
 * achado MÉDIO #4 da revisão do PR #67). Mesma chave `rascunho:${uid}` para `POST` e
 * `GET`, e mesmo `checkRateLimit` que a rota de fotos (PR #66) já usa — sem mecanismo
 * novo. O teto de rascunhos distintos por uid (complementar: fecha acúmulo, não rajada)
 * vive em `salvarRascunho` (`orders.ts`), perto da contagem que ele exige.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = requireUid(locals);

	if (
		!checkRateLimit(`rascunho:${uid}`, {
			windowMs: RATE_LIMIT_WINDOW_MS,
			maxRequests: RATE_LIMIT_MAX_REQUESTS
		})
	) {
		error(429, 'Muitas requisições. Aguarde um pouco antes de tentar de novo.');
	}

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

	try {
		await salvarRascunho({ uid, orderId, dados: { questionnaire, choice } });
	} catch (erro) {
		// 409 e não 500: o pedido existe e a requisição é válida — o que não bate é o estado.
		if (erro instanceof PedidoNaoEditavelError) {
			error(409, erro.message);
		}
		// 429 e não 500: teto de acúmulo, não erro — mesmo código do rate limit por janela.
		if (erro instanceof LimiteDeRascunhosError) {
			error(429, erro.message);
		}
		throw erro;
	}

	return json({ ok: true });
};

export const GET: RequestHandler = async ({ locals, url }) => {
	const uid = requireUid(locals);

	if (
		!checkRateLimit(`rascunho:${uid}`, {
			windowMs: RATE_LIMIT_WINDOW_MS,
			maxRequests: RATE_LIMIT_MAX_REQUESTS
		})
	) {
		error(429, 'Muitas requisições. Aguarde um pouco antes de tentar de novo.');
	}

	// Valida a FORMA aqui, com o mesmo schema do `POST`. Antes, o parâmetro cru descia até
	// `assertSafeOrderId`, que lança `Error` comum — e `orderId` malformado virava 500 em vez
	// de 400. O traversal já estava barrado; era o contrato que divergia entre os dois verbos.
	const parametro = orderIdSchema.safeParse(url.searchParams.get('orderId') ?? '');
	if (!parametro.success) {
		error(400, 'Parâmetro orderId ausente ou inválido.');
	}
	const orderId = parametro.data;

	const rascunho = await carregarRascunho({ uid, orderId });
	if (!rascunho) {
		error(404, 'Rascunho não encontrado.');
	}

	return json(rascunho);
};
