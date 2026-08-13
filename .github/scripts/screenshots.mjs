#!/usr/bin/env node
/**
 * Evidência visual do Visual Verification Loop (EV2.4 · Q2 — [D-078] §7).
 *
 * Captura cada rota de UI nos TRÊS viewports da §10 do `DESIGN.md` — 375 / 768 / 1280 — contra
 * uma URL já servida (o deploy preview do PR na Netlify, no CI; um `npm run preview` local, na
 * mão) e grava um PNG por rota e por largura.
 *
 * CONVENÇÃO DE CAMINHO — FIXA, e é contrato, não detalhe de implementação:
 *
 *     artifacts/screenshots/<rota>-<viewport>.png
 *
 * `<rota>` é o caminho da URL sem a barra inicial, com `/` trocado por `-`; a raiz (`/`) é
 * `home`. `<viewport>` é a largura em px, sem unidade — `home-375.png`,
 * `pedido-cancelado-1280.png`. O `design-critic` da Q3 LÊ este caminho para achar a evidência, e
 * a ausência dela reprova o PR de ofício: por isso a convenção é fixada aqui, coberta por
 * `tests/workflows/screenshots.test.ts` e exposta por `--listar` (que imprime exatamente os
 * arquivos que uma rodada completa tem de produzir, sem subir browser).
 *
 * SEM MCP: é o Playwright chamado direto como biblioteca. Um servidor MCP de browser seria uma
 * dependência de runtime a mais no caminho do CI para fazer o que `page.screenshot` já faz.
 *
 * Uso:
 *     node .github/scripts/screenshots.mjs https://deploy-preview-1--site.netlify.app
 *     PREVIEW_URL=http://localhost:4173 node .github/scripts/screenshots.mjs
 *     node .github/scripts/screenshots.mjs --listar
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright-core';
// A lista de rotas, os viewports e a convenção de caminho saíram deste arquivo na EV2.4 · Q4 e
// moram em `rotas-de-ui.mjs`. O motivo está no cabeçalho de lá: o gate de viewports (Q4) precisa
// IMPORTAR a mesma lista, e este módulo chama `process.exit` no topo — quem o importa morre junto.
// O re-export mantém `screenshots.mjs` como a fachada que a [D-083] fixou.
import {
	DIRETORIO,
	ROTAS,
	VIEWPORTS,
	caminhoDoArquivo,
	listarArquivos,
	slugDaRota
} from './rotas-de-ui.mjs';

export { DIRETORIO, ROTAS, VIEWPORTS, caminhoDoArquivo, listarArquivos, slugDaRota };

/**
 * Captura tudo e devolve a lista de arquivos gravados.
 *
 * Browser: o **Chromium empacotado pelo Playwright**, com o sandbox LIGADO — e não o Chrome do
 * sistema com `--no-sandbox` de `src/lib/generation-engine/pdf/render-shared.ts`. A diferença é
 * deliberada: lá o HTML é gerado pelo próprio repositório, aqui a página vem de uma URL remota
 * (o deploy preview), que é exatamente a condição de invalidação registrada naquele arquivo.
 * Conteúdo remoto navegado sem sandbox é o que o sandbox existe para conter.
 */
export async function capturar({ baseUrl, rotas = ROTAS, viewports = VIEWPORTS, destino = '.' }) {
	const browser = await chromium.launch();
	const gerados = [];
	try {
		for (const { largura, altura } of viewports) {
			const contexto = await browser.newContext({
				viewport: { width: largura, height: altura },
				deviceScaleFactor: 1,
				locale: 'pt-BR',
				// A evidência é estática: animação em curso no instante da captura produziria PNG
				// diferente a cada rodada e transformaria "uma volta que não muda nada" em ruído.
				// O estado capturado é o que a §4.6 declara para `prefers-reduced-motion`.
				reducedMotion: 'reduce'
			});
			const pagina = await contexto.newPage();
			for (const rota of rotas) {
				const url = new URL(rota, baseUrl).toString();
				const resposta = await pagina.goto(url, { waitUntil: 'load', timeout: 45_000 });
				const status = resposta?.status() ?? 0;
				if (status >= 400) {
					throw new Error(`${url} respondeu ${status} — não há evidência a capturar desta rota.`);
				}
				// A fonte é auto-hospedada e com `font-display: swap` (§4.5): capturar antes de ela
				// carregar fotografa o fallback, e aí a evidência mostra uma tipografia que o produto
				// não tem. `.then(() => true)` porque `document.fonts` não é serializável.
				// O corpo do `evaluate` roda DENTRO da página, no browser, e não neste processo Node
				// (onde `document` de fato não existe) — daí o desligamento pontual da regra.
				// eslint-disable-next-line no-undef
				await pagina.evaluate(() => document.fonts.ready.then(() => true));
				await pagina.waitForTimeout(300);

				const caminho = join(destino, caminhoDoArquivo(rota, largura));
				await mkdir(dirname(caminho), { recursive: true });
				await pagina.screenshot({ path: caminho, fullPage: true });
				gerados.push(caminhoDoArquivo(rota, largura));
				console.log(`${largura}px  ${rota}  ->  ${caminhoDoArquivo(rota, largura)}`);
			}
			await contexto.close();
		}
	} finally {
		await browser.close();
	}
	return gerados;
}

async function main(argv) {
	if (argv.includes('--listar')) {
		console.log(listarArquivos().join('\n'));
		return 0;
	}

	const baseUrl = (argv.find((a) => !a.startsWith('--')) ?? process.env.PREVIEW_URL ?? '').trim();
	if (baseUrl === '') {
		console.log(
			'::error::Sem URL para capturar. Passe a URL do deploy preview como argumento ' +
				'(`node .github/scripts/screenshots.mjs <url>`) ou em `PREVIEW_URL`. ' +
				'Sem screenshots não há evidência do Visual Verification Loop, e sem evidência o ' +
				'`design-critic` reprova o PR de ofício ([D-078] §7).'
		);
		return 1;
	}

	try {
		const gerados = await capturar({ baseUrl });
		console.log(`${gerados.length} screenshot(s) em \`${DIRETORIO}/\`, a partir de ${baseUrl}.`);
		return 0;
	} catch (erro) {
		console.log(`::error::Falha ao capturar a evidência visual: ${erro.message}`);
		return 1;
	}
}

process.exit(await main(process.argv.slice(2)));
