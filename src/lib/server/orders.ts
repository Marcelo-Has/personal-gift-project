import { FieldValue } from 'firebase-admin/firestore';
import type { CoupleQuestionnaire, OrderDraft, OrderStatus, StyleAndSizeChoice } from '../order';
import { getAdminFirestore } from './firebase-admin';

/**
 * Repositório do rascunho do pedido (F1-05c, issue #33).
 *
 * `firebase-admin.ts` avisa: o Admin SDK ignora `firestore.rules`. A autorização é
 * deste módulo — o caminho `users/${uid}/orders/${orderId}` é sempre montado a
 * partir do `uid` que chama, nunca de um valor recebido do cliente.
 */

/**
 * Ids que viram caminho de documento. Mesma allow-list de `SAFE_ID`/`assertSafeId`
 * em `signed-url.ts:41` — o mesmo `orderId` também vira caminho de foto
 * (`photoObjectPath`), então os dois precisam concordar sobre o que é válido.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Pedido que já saiu do rascunho não é editável por esta rota. Erro tipado, e não `Error`
 * genérico, porque o handler precisa distinguir isto (409) de falha de infraestrutura (500).
 */
export class PedidoNaoEditavelError extends Error {
	constructor() {
		super('Pedido não está mais em rascunho e não pode ser alterado.');
		this.name = 'PedidoNaoEditavelError';
	}
}

/**
 * Teto de rascunhos distintos por uid (issue #74, achado MÉDIO #4 da revisão do PR #67).
 * Sessão é anônima (`signInAnonymously`): sem isto, um uid cria documentos ilimitados em
 * `users/<uid>/orders`. Complementar ao rate limit por janela — um fecha rajada, este fecha
 * acúmulo. Erro tipado, como `PedidoNaoEditavelError`, para o handler responder 429 e não 500.
 */
export class LimiteDeRascunhosError extends Error {
	constructor() {
		super('Limite de rascunhos atingido para esta sessão.');
		this.name = 'LimiteDeRascunhosError';
	}
}

const MAX_RASCUNHOS_POR_UID = 10;

function assertSafeOrderId(orderId: string): void {
	if (!SAFE_ID.test(orderId)) {
		throw new Error(
			'orderId inválido: use apenas letras, números, "-" e "_" (1 a 128 caracteres).'
		);
	}
}

/**
 * Interface mínima do Firestore usada aqui — permite o teste injetar um dublê sem
 * credencial nem emulador, no mesmo padrão de `SignableBucket` em `signed-url.ts`:
 * não é uma camada de abstração sobre o Firestore.
 */
export interface OrderStore {
	doc(path: string): {
		get(): Promise<{ exists: boolean; data(): unknown }>;
		set(data: unknown, options?: { merge: boolean }): Promise<unknown>;
	};
	collection(path: string): {
		count(): { get(): Promise<{ data(): { count: number } }> };
	};
}

function orderPath(uid: string, orderId: string): string {
	assertSafeOrderId(orderId);
	return `users/${uid}/orders/${orderId}`;
}

/** Converte `Timestamp` do Admin SDK (não serializável em JSON) para ISO string. */
function timestampToIso(value: unknown): string {
	if (value && typeof value === 'object' && 'toDate' in value) {
		return (value as { toDate(): Date }).toDate().toISOString();
	}
	return new Date().toISOString();
}

export interface RascunhoDados {
	questionnaire?: Partial<CoupleQuestionnaire>;
	choice?: Partial<StyleAndSizeChoice>;
}

export interface SalvarRascunhoInput {
	uid: string;
	orderId: string;
	dados: RascunhoDados;
}

/**
 * Cria ou atualiza o rascunho, etapa a etapa. `merge: true` preserva o que já foi
 * salvo; `createdAt` só entra na primeira escrita, `updatedAt` sempre.
 */
export async function salvarRascunho(
	{ uid, orderId, dados }: SalvarRascunhoInput,
	store: OrderStore = getAdminFirestore()
): Promise<void> {
	const ref = store.doc(orderPath(uid, orderId));
	const existente = await ref.get();

	// Pedido que já saiu do rascunho não volta atrás por esta rota (achado MÉDIO da revisão
	// de segurança do PR #67). Sem isto, um POST em `orderId` existente rebaixaria o `status`
	// e sobrescreveria `questionnaire`/`choice` seja qual for o estado — reabrindo pelo
	// servidor exatamente o que `firestore.rules` fecha no cliente ("o comprador não altera o
	// próprio pedido"). Hoje não há superfície, porque só existe `'rascunho'`; quando o F1-07
	// introduzir `aguardando_pagamento`/`pago`, isto vira alteração de pedido pago se ninguém
	// lembrar. É mais barato fechar agora, com o estado ainda vazio.
	const statusAtual = (existente.data() as { status?: OrderStatus } | undefined)?.status;
	if (existente.exists && statusAtual && statusAtual !== 'rascunho') {
		throw new PedidoNaoEditavelError();
	}

	// Teto só entra na criação de um rascunho NOVO — atualizar um dos já existentes (etapa a
	// etapa, como este mesmo endpoint faz) nunca deve travar por causa de um limite que ele
	// respeitou ao ser criado.
	if (!existente.exists) {
		const contagem = await store.collection(`users/${uid}/orders`).count().get();
		if (contagem.data().count >= MAX_RASCUNHOS_POR_UID) {
			throw new LimiteDeRascunhosError();
		}
	}

	const payload: Record<string, unknown> = {
		...dados,
		status: 'rascunho',
		updatedAt: FieldValue.serverTimestamp()
	};

	if (!existente.exists) {
		payload.createdAt = FieldValue.serverTimestamp();
	}

	await ref.set(payload, { merge: true });
}

export interface MarcarAguardandoPagamentoInput {
	uid: string;
	orderId: string;
}

/**
 * Transição única `rascunho` → `aguardando_pagamento` (F1-07a, issue #86), chamada ao criar
 * a sessão de Checkout. Não reusa `salvarRascunho`: aquela função sempre regrava
 * `status: 'rascunho'` (é para questionário/escolha, não para avançar o estado do pedido) —
 * reusá-la para isto abriria uma via geral de sobrescrever pedido pago, o que o comentário
 * em `salvarRascunho` explicitamente evita. Mesmo erro tipado de `salvarRascunho`
 * (`PedidoNaoEditavelError`) para o handler responder 409 sem distinguir "não existe" de "já
 * saiu do rascunho" neste nível — quem chama decide 404 vs 409 antes, com o rascunho já em mãos.
 */
export async function marcarAguardandoPagamento(
	{ uid, orderId }: MarcarAguardandoPagamentoInput,
	store: OrderStore = getAdminFirestore()
): Promise<void> {
	const ref = store.doc(orderPath(uid, orderId));
	const existente = await ref.get();

	const statusAtual = (existente.data() as { status?: OrderStatus } | undefined)?.status;
	if (!existente.exists || statusAtual !== 'rascunho') {
		throw new PedidoNaoEditavelError();
	}

	await ref.set(
		{ status: 'aguardando_pagamento', updatedAt: FieldValue.serverTimestamp() },
		{ merge: true }
	);
}

export interface MarcarPagoInput {
	uid: string;
	orderId: string;
}

/**
 * Transição `aguardando_pagamento` → `pago` (F1-07b, issue #97), chamada pelo webhook do
 * Stripe depois da assinatura do evento verificada. Idempotente: se o pedido já estiver
 * `pago`, retorna sem escrever de novo — o Stripe reenvia o mesmo evento em retry. Mesmo
 * erro tipado de `marcarAguardandoPagamento` para pedido inexistente ou ainda em `rascunho`
 * (nunca passou pelo checkout): não é o que o webhook espera reconciliar.
 */
export async function marcarPago(
	{ uid, orderId }: MarcarPagoInput,
	store: OrderStore = getAdminFirestore()
): Promise<void> {
	const ref = store.doc(orderPath(uid, orderId));
	const existente = await ref.get();

	const statusAtual = (existente.data() as { status?: OrderStatus } | undefined)?.status;
	if (!existente.exists || statusAtual === 'rascunho') {
		throw new PedidoNaoEditavelError();
	}

	if (statusAtual === 'pago') return;

	await ref.set({ status: 'pago', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export interface CarregarRascunhoInput {
	uid: string;
	orderId: string;
}

/** Lê o rascunho do dono. `null` quando não existe — quem chama decide 404/403. */
export async function carregarRascunho(
	{ uid, orderId }: CarregarRascunhoInput,
	store: OrderStore = getAdminFirestore()
): Promise<OrderDraft | null> {
	const ref = store.doc(orderPath(uid, orderId));
	const snap = await ref.get();

	if (!snap.exists) return null;

	const dados = (snap.data() ?? {}) as Record<string, unknown>;

	return {
		id: orderId,
		ownerId: uid,
		status: (dados.status as OrderStatus | undefined) ?? 'rascunho',
		createdAt: timestampToIso(dados.createdAt),
		updatedAt: timestampToIso(dados.updatedAt),
		questionnaire: dados.questionnaire as Partial<CoupleQuestionnaire> | undefined,
		choice: dados.choice as Partial<StyleAndSizeChoice> | undefined
	};
}
