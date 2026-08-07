/**
 * Roteamento e validação de entrada do worker de geração (F2-07b, issue #148).
 *
 * Separado de `server.ts` para ser testável sem subir Chrome, Firestore nem porta: as duas
 * operações caras entram por injeção (`WorkerDeps`), mesmo padrão que
 * `executarGeracaoDoPedido` já usa com `ExecutarGeracaoDoPedidoDeps`.
 *
 * Não há checagem de autenticação aqui de propósito: o serviço do Cloud Run é criado com
 * "exigir autenticação" ([D-069]), então quem não tem `roles/run.invoker` não chega neste
 * processo — a plataforma barra antes. O que este módulo valida é o FORMATO do corpo, que é
 * defesa contra chamada malformada de quem já está autorizado, não controle de acesso.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Corpo legítimo é `{uid, orderId}` — alguns bytes. O limite existe para que um corpo
 * absurdo não consuma memória da instância que pode estar renderizando. */
const MAX_BODY_BYTES = 8 * 1024;

export interface WorkerDeps {
	/** Roda o pipeline completo para UM pedido. Nunca lança (ver `order-worker.ts`). */
	processarPedido: (uid: string, orderId: string) => Promise<Record<string, unknown>>;
	/** PoC de [D-069]: renderiza um spread fixo para provar que o Chrome sobe no container. */
	executarPocRender: () => Promise<Record<string, unknown>>;
}

/** Ids de pedido/usuário vêm do Firestore e do Stripe, nunca de digitação livre. */
export function isSafeId(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	let bytes = 0;
	for await (const chunk of req) {
		bytes += (chunk as Buffer).length;
		if (bytes > MAX_BODY_BYTES) throw new Error('Corpo da requisição grande demais.');
		chunks.push(chunk as Buffer);
	}
	if (chunks.length === 0) return {};
	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function json(res: ServerResponse, statusCode: number, body: unknown): void {
	res.writeHead(statusCode, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

export function criarHandler(deps: WorkerDeps) {
	return function handler(req: IncomingMessage, res: ServerResponse): void {
		void (async () => {
			try {
				// Cloud Run bate na raiz para checar saúde antes de rotear tráfego.
				if (req.method === 'GET' && (req.url === '/' || req.url === '/healthz')) {
					return json(res, 200, { ok: true });
				}

				if (req.method === 'POST' && req.url === '/poc-render') {
					const resultado = await deps.executarPocRender();
					console.log('worker: poc-render', JSON.stringify(resultado));
					return json(res, resultado.ok === true ? 200 : 500, resultado);
				}

				if (req.method === 'POST' && req.url === '/gerar') {
					const body = (await readJsonBody(req)) as { uid?: unknown; orderId?: unknown };
					if (!isSafeId(body.uid) || !isSafeId(body.orderId)) {
						return json(res, 400, { erro: 'uid/orderId ausentes ou inválidos.' });
					}
					return json(res, 200, await deps.processarPedido(body.uid, body.orderId));
				}

				return json(res, 404, { erro: 'Rota não encontrada.' });
			} catch (erro) {
				// `processarPedido` não lança (grava `erro_geracao` sozinho); cair aqui é
				// infraestrutura ou corpo malformado, antes ou fora do pipeline.
				console.error('worker: falha não tratada', erro instanceof Error ? erro.message : erro);
				if (!res.headersSent) json(res, 500, { erro: 'Falha interna do worker.' });
			}
		})();
	};
}
