/**
 * PoC de [F2-07] (issue #135) — condição de [D-063]: rodar o render de F2-08a
 * (`renderDedicatoriaSpreadToPdf`, `playwright-core` com `channel: 'chrome'`) de ponta a
 * ponta DENTRO de uma Netlify Background Function, antes de comprometer o resto da
 * fila+worker a essa opção.
 *
 * Background Function (sufixo `-background` no nome do arquivo, convenção da Netlify):
 * a chamada HTTP volta 202 quase imediatamente e a execução continua depois, por até 15
 * min — por isso o resultado não vai na resposta HTTP, e sim gravado em
 * `_system/poc-f2-07-render` no Firestore (lido por `poc-status.js`).
 *
 * Não usa `$lib/server/firebase-admin.ts` nem `$env/dynamic/private`: funções em
 * `netlify/functions/` são empacotadas por fora do Vite/SvelteKit (sem os aliases `$lib`/
 * `$env`), então o init do Admin SDK é duplicado aqui, mínimo, só para esta PoC.
 *
 * Sem PII: a composição de entrada é um texto fixo da própria PoC, não dado de pedido
 * real, e o campo `errorMessage` grava só `error.message` (mensagem de infraestrutura —
 * Chrome ausente, timeout etc. —, nunca conteúdo de pedido).
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { renderDedicatoriaSpreadToPdf } from '../../src/lib/generation-engine/pdf/render-dedicatoria';
import { composeDedicatoria } from '../../src/lib/product-skills/layout-element/dedicatoria/compose';
import { MINI_SKU_LAYOUT } from '../../src/lib/fixtures/pedido-exemplo';

const ADMIN_APP_NAME = 'personal-gift-admin-poc-f2-07';
const RESULT_DOC_PATH = '_system/poc-f2-07-render';
const POC_TEXT = 'PoC F2-07 — render dentro de Netlify Background Function.';

function getAdminFirestore() {
	const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
	const app =
		existing ??
		initializeApp(
			{
				credential: cert({
					projectId: process.env.FIREBASE_PROJECT_ID,
					clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
					privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
				})
			},
			ADMIN_APP_NAME
		);
	return getFirestore(app);
}

async function runRenderPoc() {
	const startedAt = new Date().toISOString();
	const composition = composeDedicatoria({ dedication: POC_TEXT });

	const t0 = Date.now();
	const pdfBytes = await renderDedicatoriaSpreadToPdf(composition, MINI_SKU_LAYOUT);
	const durationMs = Date.now() - t0;

	return {
		ok: true,
		pdfBytesLength: pdfBytes.length,
		durationMs,
		startedAt,
		finishedAt: new Date().toISOString(),
		netlifyContext: process.env.CONTEXT ?? null
	};
}

export const handler = async () => {
	let resultado;
	try {
		resultado = await runRenderPoc();
	} catch (erro) {
		resultado = {
			ok: false,
			errorMessage: erro instanceof Error ? erro.message : String(erro),
			finishedAt: new Date().toISOString(),
			netlifyContext: process.env.CONTEXT ?? null
		};
	}

	// Log ANTES da gravação: o veredito de [D-063] é este objeto, e amarrá-lo só ao Firestore
	// deixa a PoC cega sempre que o banco falha — na PR #138 o Firestore respondeu
	// `5 NOT_FOUND` e não havia canal nenhum para saber o que o render tinha feito.
	// `resultado` não tem PII: a entrada da PoC é texto fixo e `errorMessage` só carrega
	// falha de infraestrutura.
	console.log('poc-render-background: resultado', JSON.stringify(resultado));

	try {
		await getAdminFirestore().doc(RESULT_DOC_PATH).set(resultado);
	} catch (erroGravacao) {
		// Se nem a gravação no Firestore funcionar, não há como reportar pelo canal
		// combinado — cai no log da function (só consultável via Netlify, não por esta
		// PoC), mas não derruba a function (já é best-effort).
		console.error('poc-render-background: falha ao gravar resultado no Firestore', erroGravacao);
	}

	// Ignorado pela Netlify em uma Background Function (resposta já foi 202 antes disto
	// terminar) — mantido só para rodar localmente/depurar via `netlify functions:invoke`.
	return { statusCode: 200, body: JSON.stringify(resultado) };
};
