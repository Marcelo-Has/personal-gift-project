import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	carregarRascunho,
	PedidoNaoEditavelError,
	salvarRascunho,
	type OrderStore
} from './orders';

/**
 * Firestore falso: é dependência externa (`.claude/rules/testing.md`), então é
 * ele que se mocka. Registra as chamadas para provar caminho, `merge` e
 * `createdAt`/`updatedAt` sem credencial nem emulador — mesmo padrão de
 * `signed-url.test.ts`.
 */
function ehObjetoPlano(valor: unknown): valor is Record<string, unknown> {
	return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Reproduz o merge recursivo real do Firestore: mapas aninhados mesclam campo a campo. */
function mesclarProfundo(
	anterior: Record<string, unknown>,
	novo: Record<string, unknown>
): Record<string, unknown> {
	const resultado = { ...anterior };
	for (const [chave, valor] of Object.entries(novo)) {
		resultado[chave] =
			ehObjetoPlano(valor) && ehObjetoPlano(resultado[chave])
				? mesclarProfundo(resultado[chave] as Record<string, unknown>, valor)
				: valor;
	}
	return resultado;
}

function fakeStore(seed: Record<string, Record<string, unknown>> = {}) {
	const docs = new Map<string, Record<string, unknown>>(Object.entries(seed));
	const calls: { method: 'get' | 'set'; path: string; data?: unknown; options?: unknown }[] = [];

	const store: OrderStore = {
		doc(path: string) {
			return {
				async get() {
					calls.push({ method: 'get', path });
					const data = docs.get(path);
					return {
						exists: data !== undefined,
						data: () => data
					};
				},
				async set(data: unknown, options?: { merge: boolean }) {
					calls.push({ method: 'set', path, data, options });
					const anterior = docs.get(path) ?? {};
					docs.set(
						path,
						options?.merge
							? mesclarProfundo(anterior, data as Record<string, unknown>)
							: (data as Record<string, unknown>)
					);
				}
			};
		}
	};

	return { store, calls, docs };
}

const AGORA = new Date('2026-07-29T12:00:00Z');

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(AGORA);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('salvarRascunho', () => {
	it('deve montar o caminho a partir do uid quando salva o rascunho', async () => {
		const { store, calls } = fakeStore();

		await salvarRascunho({ uid: 'uid-alice', orderId: 'pedido-1', dados: {} }, store);

		expect(calls.some((c) => c.path === 'users/uid-alice/orders/pedido-1')).toBe(true);
	});

	it('deve gravar createdAt só na primeira escrita, e sempre atualizar updatedAt', async () => {
		const { store, docs } = fakeStore();

		await salvarRascunho(
			{ uid: 'uid-alice', orderId: 'pedido-1', dados: { questionnaire: { howTheyMet: 'a' } } },
			store
		);
		const primeiraEscrita = docs.get('users/uid-alice/orders/pedido-1');
		expect(primeiraEscrita?.createdAt).toBeDefined();
		expect(primeiraEscrita?.updatedAt).toBeDefined();

		await salvarRascunho(
			{ uid: 'uid-alice', orderId: 'pedido-1', dados: { questionnaire: { howTheyMet: 'b' } } },
			store
		);
		const segundaEscrita = docs.get('users/uid-alice/orders/pedido-1');
		expect(segundaEscrita?.createdAt).toEqual(primeiraEscrita?.createdAt);
	});

	it('deve gravar com merge:true para não apagar o que já foi preenchido em outra etapa', async () => {
		const { store, docs } = fakeStore();

		await salvarRascunho(
			{ uid: 'uid-alice', orderId: 'pedido-1', dados: { questionnaire: { howTheyMet: 'oi' } } },
			store
		);
		await salvarRascunho(
			{
				uid: 'uid-alice',
				orderId: 'pedido-1',
				dados: { questionnaire: { specialMessage: 'te amo' } }
			},
			store
		);

		const doc = docs.get('users/uid-alice/orders/pedido-1');
		expect((doc?.questionnaire as Record<string, unknown>).howTheyMet).toBe('oi');
		expect((doc?.questionnaire as Record<string, unknown>).specialMessage).toBe('te amo');
	});

	it('deve gravar status rascunho', async () => {
		const { store, docs } = fakeStore();

		await salvarRascunho({ uid: 'uid-alice', orderId: 'pedido-1', dados: {} }, store);

		expect(docs.get('users/uid-alice/orders/pedido-1')?.status).toBe('rascunho');
	});

	// Sem esta trava, um POST rebaixaria o status de um pedido pago de volta para rascunho e
	// sobrescreveria o conteúdo — reabrindo pelo servidor o que `firestore.rules` fecha no
	// cliente. Hoje só existe `'rascunho'`; a trava existe para o F1-07 não herdar o buraco.
	it.each(['aguardando_pagamento', 'pago'])(
		'deve recusar alteração e não escrever nada quando o status já é %s',
		async (status) => {
			const { store, calls, docs } = fakeStore({
				'users/uid-alice/orders/pedido-1': { status, questionnaire: { howTheyMet: 'original' } }
			});

			await expect(
				salvarRascunho(
					{
						uid: 'uid-alice',
						orderId: 'pedido-1',
						dados: { questionnaire: { howTheyMet: 'sobrescrito' } }
					},
					store
				)
			).rejects.toThrow(PedidoNaoEditavelError);

			expect(calls.filter((chamada) => chamada.method === 'set')).toHaveLength(0);
			const doc = docs.get('users/uid-alice/orders/pedido-1');
			expect(doc?.status).toBe(status);
			expect((doc?.questionnaire as { howTheyMet?: string })?.howTheyMet).toBe('original');
		}
	);

	it('deve continuar aceitando escrita quando o pedido existente ainda é rascunho', async () => {
		const { store, docs } = fakeStore({
			'users/uid-alice/orders/pedido-1': { status: 'rascunho' }
		});

		await salvarRascunho(
			{ uid: 'uid-alice', orderId: 'pedido-1', dados: { questionnaire: { howTheyMet: 'novo' } } },
			store
		);

		const doc = docs.get('users/uid-alice/orders/pedido-1');
		expect((doc?.questionnaire as { howTheyMet?: string })?.howTheyMet).toBe('novo');
	});

	it.each([
		['..', 'travessia de diretório'],
		['../../etc/passwd', 'travessia com barras'],
		['', 'vazio'],
		['pedido com espaco', 'espaço']
	])('deve recusar orderId %j (%s) antes de qualquer escrita', async (idPerigoso) => {
		const { store, calls } = fakeStore();

		await expect(
			salvarRascunho({ uid: 'uid-alice', orderId: idPerigoso, dados: {} }, store)
		).rejects.toThrow(/orderId inválido/);
		expect(calls).toHaveLength(0);
	});

	it('deve ignorar um ownerId embutido nos dados e usar sempre o uid do parâmetro no caminho', async () => {
		const { store, calls } = fakeStore();

		await salvarRascunho(
			{
				uid: 'uid-alice',
				orderId: 'pedido-1',
				dados: { questionnaire: { howTheyMet: 'oi' } }
			},
			store
		);

		expect(calls.every((c) => c.path.startsWith('users/uid-alice/'))).toBe(true);
	});
});

describe('carregarRascunho', () => {
	it('deve devolver null quando o rascunho não existe', async () => {
		const { store } = fakeStore();

		const resultado = await carregarRascunho({ uid: 'uid-alice', orderId: 'pedido-1' }, store);

		expect(resultado).toBeNull();
	});

	it('deve ler o rascunho do dono a partir do uid, nunca de outro caminho', async () => {
		const { store } = fakeStore({
			'users/uid-alice/orders/pedido-1': {
				status: 'rascunho',
				questionnaire: { howTheyMet: 'oi' },
				createdAt: { toDate: () => AGORA },
				updatedAt: { toDate: () => AGORA }
			}
		});

		const resultado = await carregarRascunho({ uid: 'uid-alice', orderId: 'pedido-1' }, store);

		expect(resultado).toMatchObject({
			id: 'pedido-1',
			ownerId: 'uid-alice',
			status: 'rascunho',
			questionnaire: { howTheyMet: 'oi' }
		});
		expect(resultado?.createdAt).toBe(AGORA.toISOString());
	});

	it('não deve encontrar o rascunho de outro dono mesmo pedindo o mesmo orderId', async () => {
		const { store } = fakeStore({
			'users/uid-bob/orders/pedido-1': { status: 'rascunho' }
		});

		const resultado = await carregarRascunho({ uid: 'uid-alice', orderId: 'pedido-1' }, store);

		expect(resultado).toBeNull();
	});

	it('deve recusar orderId inválido antes de qualquer leitura', async () => {
		const { store, calls } = fakeStore();

		await expect(
			carregarRascunho({ uid: 'uid-alice', orderId: '../outro' }, store)
		).rejects.toThrow(/orderId inválido/);
		expect(calls).toHaveLength(0);
	});
});
