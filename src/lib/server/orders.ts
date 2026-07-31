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
