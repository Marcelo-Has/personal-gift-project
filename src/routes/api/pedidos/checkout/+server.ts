import { error, json } from '@sveltejs/kit';
import { requireUid } from '$lib/server/auth';
import { checkoutSchema, questionarioSchema, styleAndSizeChoiceSchema } from '$lib/order-schema';
import { validarEscolha } from '$lib/escolha-estilo';
import {
	carregarRascunho,
	marcarAguardandoPagamento,
	PedidoNaoEditavelError
} from '$lib/server/orders';
import { criarSessaoCheckout } from '$lib/server/stripe';
import { checkRateLimit } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

/**
 * Cria a sessão de Checkout do Stripe em modo TESTE (F1-07a, issue #86).
 *
 * Mesmo padrão de `/api/pedidos/rascunho`: `requireUid` exige sessão (401), rate limit por
 * `uid` (mesma janela/chave por rota), corpo revalidado com Zod. `orderId` vem do corpo, mas
 * o rascunho é sempre carregado do caminho `users/<uid>/orders/<orderId>` com o `uid` da
 * sessão — nada no corpo escolhe de quem é o pedido ([D-021]).
 *
 * O webhook que confirma o pagamento e marca `pago` é F1-07b (fora de escopo aqui).
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const uid = requireUid(locals);

	if (
		!checkRateLimit(`checkout:${uid}`, {
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

	const resultadoCorpo = checkoutSchema.safeParse(corpo);
	if (!resultadoCorpo.success) {
		error(400, `Corpo inválido: ${resultadoCorpo.error.issues.map((i) => i.message).join('; ')}`);
	}
	const { orderId } = resultadoCorpo.data;

	const rascunho = await carregarRascunho({ uid, orderId });
	if (!rascunho) {
		error(404, 'Rascunho não encontrado.');
	}

	// 409 e não 400: o pedido existe, mas já saiu de 'rascunho' — reprocessar em silêncio
	// criaria uma segunda sessão de checkout para o mesmo pedido (mesmo padrão de
	// PedidoNaoEditavelError em salvarRascunho).
	if (rascunho.status !== 'rascunho') {
		error(409, new PedidoNaoEditavelError().message);
	}

	const questionarioValido = questionarioSchema.safeParse(rascunho.questionnaire);
	if (!questionarioValido.success) {
		error(400, 'Questionário incompleto: preencha todas as etapas antes de pagar.');
	}

	const escolhaValida = styleAndSizeChoiceSchema.safeParse(rascunho.choice);
	if (!escolhaValida.success) {
		error(400, 'Escolha de estilo e tamanho incompleta.');
	}

	if (!validarEscolha(escolhaValida.data)) {
		error(400, 'Escolha de estilo e tamanho inválida.');
	}

	const { sizeId } = escolhaValida.data;

	const sessao = await criarSessaoCheckout({
		uid,
		orderId,
		sizeId,
		successUrl: `${url.origin}/pedido/sucesso?orderId=${encodeURIComponent(orderId)}`,
		cancelUrl: `${url.origin}/pedido/cancelado?orderId=${encodeURIComponent(orderId)}`
	});

	try {
		await marcarAguardandoPagamento({ uid, orderId });
	} catch (erro) {
		if (erro instanceof PedidoNaoEditavelError) {
			error(409, erro.message);
		}
		throw erro;
	}

	return json({ url: sessao.url });
};
