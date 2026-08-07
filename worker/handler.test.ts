import { describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import {
	CAMINHO_EVENTO_PEDIDO,
	criarHandler,
	extrairPedidoDoSubject,
	isSafeId,
	type WorkerDeps
} from './handler';

/**
 * O handler é exercitado por HTTP de verdade (servidor efêmero na porta 0) em vez de
 * chamar a função com `req`/`res` falsos: o que interessa testar é o contrato de rede
 * (método, rota, status, corpo), e dublar `IncomingMessage` mal reproduziria isso.
 * As duas operações caras entram por injeção, então nada de Chrome nem Firestore aqui.
 */
function subirServidor(deps: Partial<WorkerDeps> = {}): Promise<{
	server: Server;
	baseUrl: string;
}> {
	const completas: WorkerDeps = {
		processarPedido: vi.fn().mockResolvedValue({ outcome: 'gerado' }),
		executarPocRender: vi.fn().mockResolvedValue({ ok: true, pdfBytesLength: 1 }),
		...deps
	};

	const server = createServer(criarHandler(completas));
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			const port = typeof address === 'object' && address ? address.port : 0;
			resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
		});
	});
}

async function comServidor(
	deps: Partial<WorkerDeps>,
	fn: (baseUrl: string) => Promise<void>
): Promise<void> {
	const { server, baseUrl } = await subirServidor(deps);
	try {
		await fn(baseUrl);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}

describe('isSafeId', () => {
	it('deve aceitar ids do formato que Firestore e Stripe produzem', () => {
		expect(isSafeId('pedido-1')).toBe(true);
		expect(isSafeId('AbC_123-xyz')).toBe(true);
	});

	it('deve recusar valores que não são id, incluindo tentativa de path traversal', () => {
		expect(isSafeId('../../etc/passwd')).toBe(false);
		expect(isSafeId('users/uid/orders/x')).toBe(false);
		expect(isSafeId('')).toBe(false);
		expect(isSafeId(undefined)).toBe(false);
		expect(isSafeId(123)).toBe(false);
		expect(isSafeId('a'.repeat(129))).toBe(false);
	});
});

describe('handler do worker', () => {
	it('deve responder 200 na raiz para o Cloud Run considerar a instância saudável', async () => {
		await comServidor({}, async (baseUrl) => {
			const resposta = await fetch(`${baseUrl}/`);
			expect(resposta.status).toBe(200);
			expect(await resposta.json()).toEqual({ ok: true });
		});
	});

	it('deve rodar o pipeline e devolver o outcome quando /gerar recebe uid e orderId válidos', async () => {
		const processarPedido = vi.fn().mockResolvedValue({ outcome: 'gerado' });

		await comServidor({ processarPedido }, async (baseUrl) => {
			const resposta = await fetch(`${baseUrl}/gerar`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ uid: 'uid-1', orderId: 'pedido-1' })
			});

			expect(resposta.status).toBe(200);
			expect(await resposta.json()).toEqual({ outcome: 'gerado' });
			expect(processarPedido).toHaveBeenCalledWith('uid-1', 'pedido-1');
		});
	});

	it('deve responder 400 sem tocar o pipeline quando /gerar recebe id inválido', async () => {
		const processarPedido = vi.fn();

		await comServidor({ processarPedido }, async (baseUrl) => {
			const resposta = await fetch(`${baseUrl}/gerar`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ uid: '../outro-usuario', orderId: 'pedido-1' })
			});

			expect(resposta.status).toBe(400);
			expect(processarPedido).not.toHaveBeenCalled();
		});
	});

	it('deve responder 500 sem derrubar o processo quando o corpo de /gerar não é JSON', async () => {
		await comServidor({}, async (baseUrl) => {
			const resposta = await fetch(`${baseUrl}/gerar`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: 'isto não é json'
			});

			expect(resposta.status).toBe(500);
		});
	});

	it('deve devolver 500 com a mensagem de erro quando a PoC de render falha', async () => {
		const executarPocRender = vi
			.fn()
			.mockResolvedValue({ ok: false, errorMessage: 'chrome não encontrado' });

		await comServidor({ executarPocRender }, async (baseUrl) => {
			const resposta = await fetch(`${baseUrl}/poc-render`, { method: 'POST' });

			expect(resposta.status).toBe(500);
			expect(await resposta.json()).toMatchObject({ ok: false });
		});
	});

	it('deve responder 404 para rota desconhecida', async () => {
		await comServidor({}, async (baseUrl) => {
			expect((await fetch(`${baseUrl}/qualquer-coisa`)).status).toBe(404);
		});
	});
});

describe('extrairPedidoDoSubject', () => {
	it('deve extrair uid e orderId do subject de um evento do Firestore', () => {
		expect(extrairPedidoDoSubject('documents/users/uid-1/orders/pedido-1')).toEqual({
			uid: 'uid-1',
			orderId: 'pedido-1'
		});
	});

	it('deve recusar subject de outra coleção, incompleto ou ausente', () => {
		expect(extrairPedidoDoSubject('documents/users/uid-1/fotos/foto-1')).toBeNull();
		expect(extrairPedidoDoSubject('documents/users/uid-1')).toBeNull();
		expect(extrairPedidoDoSubject('documents/users/uid-1/orders/a/b')).toBeNull();
		expect(extrairPedidoDoSubject('')).toBeNull();
		expect(extrairPedidoDoSubject(undefined)).toBeNull();
	});

	it('deve recusar subject cujos ids não passam na validação de formato', () => {
		expect(extrairPedidoDoSubject('documents/users/../orders/pedido-1')).toBeNull();
	});
});

describe('gatilho do Eventarc', () => {
	it('deve processar o pedido identificado pelo ce-subject do evento', async () => {
		const processarPedido = vi.fn().mockResolvedValue({ outcome: 'gerado' });

		await comServidor({ processarPedido }, async (baseUrl) => {
			const resposta = await fetch(`${baseUrl}${CAMINHO_EVENTO_PEDIDO}`, {
				method: 'POST',
				headers: {
					'ce-subject': 'documents/users/uid-1/orders/pedido-1',
					'ce-type': 'google.cloud.firestore.document.v1.written'
				},
				// Corpo protobuf do evento: o worker não lê, então bytes arbitrários servem.
				body: 'protobuf-cru'
			});

			expect(resposta.status).toBe(200);
			expect(processarPedido).toHaveBeenCalledWith('uid-1', 'pedido-1');
		});
	});

	it('deve responder 2xx sem processar quando o subject é inválido, para o Eventarc não reentregar para sempre', async () => {
		const processarPedido = vi.fn();

		await comServidor({ processarPedido }, async (baseUrl) => {
			const resposta = await fetch(`${baseUrl}${CAMINHO_EVENTO_PEDIDO}`, {
				method: 'POST',
				headers: { 'ce-subject': 'documents/outra-coisa/x' },
				body: 'protobuf-cru'
			});

			expect(resposta.status).toBe(200);
			expect(await resposta.json()).toMatchObject({ outcome: 'ignorado' });
			expect(processarPedido).not.toHaveBeenCalled();
		});
	});
});
