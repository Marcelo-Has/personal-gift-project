/**
 * Sonda mínima de [D-063] (issue #135): o Chrome sobe dentro de uma function da Netlify?
 *
 * Existe separada de `poc-render-background.js` porque aquela PoC arrasta o grafo inteiro
 * de `src/lib` (skills, fonte, Firestore) e, na PR #138, morreu três vezes em problemas de
 * empacotamento ANTES de chegar ao Chrome — que é a única coisa que D-063 pede para provar.
 * Esta sonda importa só `playwright-core` e não lê nada do disco do repositório, então o
 * resultado dela é imune a bundler, a `import.meta.url` e ao estado do Firestore.
 *
 * Síncrona de propósito (sem o sufixo `-background`): a resposta HTTP já traz o veredito,
 * sem depender de log nem de gravação em banco. Se estourar o timeout da Netlify, o
 * `console.log` abaixo ainda mostra até onde chegou.
 *
 * Sem PII: o HTML renderizado é uma constante deste arquivo.
 */
import { chromium } from 'playwright-core';

const HTML = '<html><body><h1>PoC F2-07 / D-063</h1></body></html>';

export const handler = async () => {
	const t0 = Date.now();
	let resultado;

	try {
		// Mesmo mecanismo de [D-062]: `channel: 'chrome'` procura o Chrome instalado no
		// sistema. `--no-sandbox` porque o container da function roda como root sem
		// namespaces de usuário, onde o sandbox do Chrome trava o launch.
		const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
		try {
			const page = await browser.newPage();
			await page.setContent(HTML, { waitUntil: 'load' });
			const pdf = await page.pdf({ printBackground: true });
			resultado = { ok: true, pdfBytesLength: pdf.length, durationMs: Date.now() - t0 };
		} finally {
			await browser.close();
		}
	} catch (erro) {
		resultado = {
			ok: false,
			errorMessage: erro instanceof Error ? erro.message : String(erro),
			durationMs: Date.now() - t0
		};
	}

	resultado.netlifyContext = process.env.CONTEXT ?? null;
	console.log('poc-chrome: resultado', JSON.stringify(resultado));

	return {
		statusCode: resultado.ok ? 200 : 500,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(resultado)
	};
};
