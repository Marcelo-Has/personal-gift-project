import { describe, expect, it, vi } from 'vitest';
import { carregarRascunhoCliente, obterOuCriarOrderId, salvarRascunhoCliente } from './order-draft';

function fakeStorage(inicial: Record<string, string> = {}) {
	const dados = { ...inicial };
	return {
		getItem: (chave: string) => dados[chave] ?? null,
		setItem: (chave: string, valor: string) => {
			dados[chave] = valor;
		}
	};
}

function fakeFetch(resposta: { status: number; body?: unknown }) {
	const chamadas: { url: string; init?: RequestInit }[] = [];
	const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
		chamadas.push({ url, init });
		return new Response(resposta.body !== undefined ? JSON.stringify(resposta.body) : null, {
			status: resposta.status
		});
	});
	return { fetchImpl: fetchImpl as unknown as typeof fetch, chamadas };
}

describe('obterOuCriarOrderId', () => {
	it('deve reaproveitar o id já salvo quando existe', () => {
		const storage = fakeStorage({ 'personal-gift:rascunho-order-id': 'id-existente' });

		expect(obterOuCriarOrderId(storage)).toBe('id-existente');
	});

	it('deve gerar e persistir um id novo quando não existe nenhum', () => {
		const storage = fakeStorage();

		const id = obterOuCriarOrderId(storage);

		expect(id).toMatch(/^[A-Za-z0-9-]+$/);
		expect(obterOuCriarOrderId(storage)).toBe(id);
	});
});

describe('salvarRascunhoCliente', () => {
	it('deve mandar o token e o orderId no corpo quando salva', async () => {
		const { fetchImpl, chamadas } = fakeFetch({ status: 200, body: { ok: true } });

		await salvarRascunhoCliente(
			'pedido-1',
			{ questionnaire: { howTheyMet: 'oi' } },
			'token-123',
			fetchImpl
		);

		expect(chamadas[0].url).toBe('/api/pedidos/rascunho');
		expect(chamadas[0].init?.method).toBe('POST');
		expect((chamadas[0].init?.headers as Record<string, string>).Authorization).toBe(
			'Bearer token-123'
		);
		expect(JSON.parse(chamadas[0].init?.body as string)).toMatchObject({
			orderId: 'pedido-1',
			questionnaire: { howTheyMet: 'oi' }
		});
	});

	it('deve lançar quando o servidor recusa', async () => {
		const { fetchImpl } = fakeFetch({ status: 400 });

		await expect(salvarRascunhoCliente('pedido-1', {}, 'token-123', fetchImpl)).rejects.toThrow(
			/400/
		);
	});
});

describe('carregarRascunhoCliente', () => {
	it('deve devolver null quando o servidor responde 404', async () => {
		const { fetchImpl } = fakeFetch({ status: 404 });

		expect(await carregarRascunhoCliente('pedido-1', 'token-123', fetchImpl)).toBeNull();
	});

	it('deve devolver o rascunho quando o servidor responde 200', async () => {
		const rascunho = {
			id: 'pedido-1',
			ownerId: 'uid-alice',
			status: 'rascunho',
			createdAt: '2026-07-29T12:00:00.000Z',
			updatedAt: '2026-07-29T12:00:00.000Z',
			questionnaire: { howTheyMet: 'oi' }
		};
		const { fetchImpl, chamadas } = fakeFetch({ status: 200, body: rascunho });

		const resultado = await carregarRascunhoCliente('pedido-1', 'token-123', fetchImpl);

		expect(resultado).toEqual(rascunho);
		expect(chamadas[0].url).toBe('/api/pedidos/rascunho?orderId=pedido-1');
	});

	it('deve lançar quando o servidor responde erro fora do 404', async () => {
		const { fetchImpl } = fakeFetch({ status: 500 });

		await expect(carregarRascunhoCliente('pedido-1', 'token-123', fetchImpl)).rejects.toThrow(
			/500/
		);
	});
});
