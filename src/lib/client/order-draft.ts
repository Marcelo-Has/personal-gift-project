import type { CoupleQuestionnaire, OrderDraft, StyleAndSizeChoice } from '../order';

/**
 * Cliente do rascunho do pedido (F1-05c, issue #33) — chama
 * `POST`/`GET /api/pedidos/rascunho`. Módulo isolado do componente Svelte para
 * poder ser testado sem Firebase nem DOM: `fetch` e o token entram por
 * parâmetro, no mesmo padrão de dependência injetada usado no servidor
 * (`src/lib/server/signed-url.ts`).
 */

const ORDER_ID_STORAGE_KEY = 'personal-gift:rascunho-order-id';

/** Ids gerados no cliente também precisam bater com `orderIdSchema` do servidor. */
type ArmazenamentoDeId = Pick<Storage, 'getItem' | 'setItem'>;

/** Um `orderId` por navegador, gerado uma vez e reaproveitado entre visitas. */
export function obterOuCriarOrderId(storage: ArmazenamentoDeId): string {
	const existente = storage.getItem(ORDER_ID_STORAGE_KEY);
	if (existente) return existente;

	const novo = crypto.randomUUID();
	storage.setItem(ORDER_ID_STORAGE_KEY, novo);
	return novo;
}

export interface RascunhoParaSalvar {
	questionnaire?: Partial<CoupleQuestionnaire>;
	choice?: Partial<StyleAndSizeChoice>;
}

/** Grava o rascunho. Lança se o servidor recusar (chamador decide se ignora). */
export async function salvarRascunhoCliente(
	orderId: string,
	dados: RascunhoParaSalvar,
	idToken: string,
	fetchImpl: typeof fetch = fetch
): Promise<void> {
	const resposta = await fetchImpl('/api/pedidos/rascunho', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${idToken}`
		},
		body: JSON.stringify({ orderId, ...dados })
	});

	if (!resposta.ok) {
		throw new Error(`Falha ao salvar rascunho (status ${resposta.status}).`);
	}
}

/** Carrega o rascunho do dono. `null` quando ainda não existe (pedido novo). */
export async function carregarRascunhoCliente(
	orderId: string,
	idToken: string,
	fetchImpl: typeof fetch = fetch
): Promise<OrderDraft | null> {
	const resposta = await fetchImpl(`/api/pedidos/rascunho?orderId=${encodeURIComponent(orderId)}`, {
		headers: { Authorization: `Bearer ${idToken}` }
	});

	if (resposta.status === 404) return null;
	if (!resposta.ok) {
		throw new Error(`Falha ao carregar rascunho (status ${resposta.status}).`);
	}

	return (await resposta.json()) as OrderDraft;
}
