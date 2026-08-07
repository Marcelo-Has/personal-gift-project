/**
 * Worker de geração pesada (F2-07b, issue #148) — o processo que roda em container,
 * decidido em [D-068] depois de a PoC de Netlify Background Functions reprovar.
 *
 * **Por que um servidor HTTP e não um script:** o Cloud Run entrega trabalho por requisição
 * HTTP. Cada requisição carrega UM pedido e vive até o pipeline terminar — o serviço é
 * configurado com timeout de 60 min e concorrência 1, para que cada instância trate um
 * pedido por vez (cada spread lança um processo do Chrome).
 *
 * **Por que TypeScript direto, sem build:** é a lição de [D-068]. `product-skills/loader.ts`
 * resolve as skills a partir de `import.meta.url` e confirma o caminho no disco, e
 * `render-shared.ts` acha a fonte por `require.resolve`. Empacotar destrói as duas coisas.
 * Aqui o repositório é copiado inteiro para a imagem e executado com `tsx`, então o layout
 * que o código pressupõe existe de verdade — sem bundler, sem surpresa de formato de módulo.
 *
 * Este arquivo é só a fiação: roteamento e validação estão em `handler.ts`, testáveis sem
 * subir porta, Chrome ou Firestore.
 */
import { createServer } from 'node:http';
import { getAdminFirestore } from '../src/lib/server/firebase-admin';
import { loadSourcePhotosFromStorage } from '../src/lib/server/order-photos';
import { carregarRascunho } from '../src/lib/server/orders';
import { executarGeracaoDoPedido } from '../src/lib/generation-engine/order-worker';
import { renderDedicatoriaSpreadToPdf } from '../src/lib/generation-engine/pdf/render-dedicatoria';
import { composeDedicatoria } from '../src/lib/product-skills/layout-element/dedicatoria/compose';
import { MINI_SKU_LAYOUT } from '../src/lib/fixtures/pedido-exemplo';
import { criarHandler } from './handler';

const PORT = Number(process.env.PORT ?? 8080);

/**
 * PoC de [D-069]: renderiza um spread com o Chrome do container e devolve o tamanho do PDF.
 *
 * A issue #148, como a #135 antes dela, exige provar que o Chrome sobe no ambiente real
 * ANTES de comprometer o resto. Não toca em Firestore nem em dado de pedido — a entrada é
 * texto fixo —, então o resultado isola a pergunta "o Chrome funciona aqui?" de qualquer
 * outro problema de infraestrutura. Foi a falta desse isolamento que fez a PoC da #135
 * custar três ciclos até chegar à resposta.
 *
 * Rota temporária: sai junto com a fixture importada aqui assim que a PoC for registrada.
 */
async function executarPocRender(): Promise<Record<string, unknown>> {
	const t0 = Date.now();
	try {
		const composition = composeDedicatoria(
			{ dedication: 'PoC F2-07b — render dentro do worker em container.' },
			MINI_SKU_LAYOUT
		);
		const pdf = await renderDedicatoriaSpreadToPdf(composition, MINI_SKU_LAYOUT);
		return { ok: true, pdfBytesLength: pdf.length, durationMs: Date.now() - t0 };
	} catch (erro) {
		return {
			ok: false,
			errorMessage: erro instanceof Error ? erro.message : String(erro),
			durationMs: Date.now() - t0
		};
	}
}

async function processarPedido(uid: string, orderId: string): Promise<Record<string, unknown>> {
	const store = getAdminFirestore();
	const draft = await carregarRascunho({ uid, orderId }, store);
	if (!draft) {
		// Sem PII: o id do pedido não identifica pessoa por si só.
		console.error(`worker: pedido "${orderId}" não encontrado.`);
		return { outcome: 'nao_encontrado' };
	}

	const resultado = await executarGeracaoDoPedido(
		{ uid, orderId, draft },
		{ store, loadSourcePhotos: (order) => loadSourcePhotosFromStorage(order, uid, orderId) }
	);

	// Rastro operacional, nunca conteúdo do pedido — o detalhe já está no Firestore.
	console.log(JSON.stringify({ event: 'geracao_concluida', orderId, outcome: resultado.outcome }));
	return { outcome: resultado.outcome };
}

const server = createServer(criarHandler({ processarPedido, executarPocRender }));

// Sem timeout de socket: um pedido legítimo roda por minutos (8 imagens + um Chrome por
// spread) e o corte de tempo real é o do Cloud Run, não o do Node.
server.requestTimeout = 0;
server.headersTimeout = 0;
server.timeout = 0;

server.listen(PORT, () => {
	console.log(`worker: ouvindo na porta ${PORT}`);
});
