#!/usr/bin/env node
/**
 * Gate 2 dos 4 determinísticos da EV2.4 · Q4, segunda metade: LIGHTHOUSE A11Y ≥ 0,9.
 *
 * O axe (`e2e/design/a11y.spec.ts`) reprova violação `critical`/`serious` com catraca. Este
 * script mede a MESMA página pela outra régua — o score de acessibilidade do Lighthouse — e exige
 * 0,9 em cada rota. Não é redundância: o score é ponderado e inclui auditorias que o nosso corte
 * por impacto descarta de propósito (`moderate`/`minor`), então ele pega a degradação lenta que
 * nunca chega a `serious`. Um só dos dois deixaria um buraco: o axe, o da soma; o Lighthouse, o
 * da violação grave e isolada, que quase não move o score.
 *
 * POR QUE `npx` E NÃO `devDependency`. O `lighthouse` traz uma árvore grande, e o gate
 * `npm audit --audit-level=high` do `security.yml` não perdoa: uma vulnerabilidade alta em
 * qualquer galho deixaria o scan permanentemente vermelho por causa de uma FERRAMENTA de
 * desenvolvimento. É o mesmo raciocínio — e a mesma solução — que o `ci.yml` já registra para o
 * `firebase-tools`: CLI de desenvolvimento roda por `npx` com versão fixa, fora do `package.json`.
 *
 * O browser é o Chromium do Playwright, via `CHROME_PATH`: instalar um segundo Chrome no runner
 * para medir a mesma página seria pagar duas vezes pelo mesmo download.
 *
 * Entradas, todas por ambiente:
 *   PREVIEW_URL   base a medir (ex.: `http://localhost:4173`). Obrigatória.
 *   PISO          score mínimo por rota (padrão `0.9`).
 *   LIGHTHOUSE    versão da CLI (padrão `13.4.1`) — fixa, porque score que muda com a ferramenta
 *                 não é gate, é sorteio.
 *
 * Saída: 0 se todas as rotas alcançam o piso; 1 (com `::error::`) na primeira que não alcança.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROTAS, slugDaRota } from './rotas-de-ui.mjs';

const BASE = (process.env.PREVIEW_URL || '').trim();
const PISO = Number(process.env.PISO || 0.9);
const VERSAO = (process.env.LIGHTHOUSE || '13.4.1').trim();

/**
 * Emulação de celular DESLIGADA e `screenEmulation` em 375 (a §10: a tela real do público). O
 * default do Lighthouse é Moto G com throttling de rede, que mede DESEMPENHO; aqui o que se mede
 * é acessibilidade, e o throttling só acrescentaria variância ao número sem mudar o que ele diz.
 */
const ARGUMENTOS = [
	'--only-categories=accessibility',
	'--output=json',
	'--quiet',
	'--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
	'--form-factor=mobile',
	'--screenEmulation.mobile',
	'--screenEmulation.width=375',
	'--screenEmulation.height=812',
	'--screenEmulation.deviceScaleFactor=1',
	'--throttling-method=provided'
];

/** O Chromium que o Playwright já baixou. Sem ele o Lighthouse procura um Chrome do sistema. */
function acharChromium() {
	if ((process.env.CHROME_PATH || '').trim() !== '') return process.env.CHROME_PATH.trim();
	const r = spawnSync(
		process.execPath,
		['-e', "import('playwright-core').then((p) => console.log(p.chromium.executablePath()))"],
		{ encoding: 'utf8' }
	);
	return r.status === 0 ? r.stdout.trim() : '';
}

/** Aspas só onde precisa. O `--chrome-flags` e o caminho do temp do Windows têm espaço. */
const aspas = (a) => (/\s/.test(a) ? `"${a}"` : a);

function medir(url, destino, chrome) {
	const arquivo = join(destino, `${slugDaRota(new URL(url).pathname)}.json`);
	// `shell: true`, e é por necessidade, não por comodidade: desde o Node 20.12 o `spawn` recusa
	// executar `.cmd`/`.bat` sem shell (correção da CVE-2024-27980), e no Windows o `npx` É um
	// `.cmd` — sem isto o processo morre com `status: null` e stderr vazio, que foi exatamente o
	// modo de falha visto ao escrever este script. Nenhum argumento vem de fora: `url` sai de
	// `PREVIEW_URL` mais uma rota da lista fixa, e o resto é constante deste arquivo.
	const comando = ['npx', '-y', `lighthouse@${VERSAO}`, url, ...ARGUMENTOS, `--output-path=${arquivo}`]
		.map(aspas)
		.join(' ');
	const r = spawnSync(comando, {
		shell: true,
		encoding: 'utf8',
		env: { ...process.env, CHROME_PATH: chrome },
		timeout: 180_000
	});
	if (r.status !== 0) {
		throw new Error(
			`\`lighthouse\` saiu ${r.status}${r.error ? ` (${r.error.message})` : ''} em ${url}: ` +
				`${`${r.stdout || ''}${r.stderr || ''}`.trim().slice(-600)}`
		);
	}
	const relatorio = JSON.parse(readFileSync(arquivo, 'utf8'));
	const score = relatorio?.categories?.accessibility?.score;
	if (typeof score !== 'number') {
		throw new Error(`o relatório de ${url} não trouxe score de acessibilidade.`);
	}
	// As auditorias reprovadas, para o erro dizer O QUE derrubou o score — e não só que derrubou.
	const reprovadas = Object.values(relatorio.audits || {})
		.filter((a) => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative')
		.map((a) => a.id);
	return { score, reprovadas };
}

function main() {
	if (BASE === '') {
		console.log(
			'::error::Sem `PREVIEW_URL`. O gate de Lighthouse mede uma página SERVIDA — rode ' +
				'`npm run build && npm run preview` e aponte `PREVIEW_URL=http://localhost:4173`.'
		);
		return 1;
	}

	const chrome = acharChromium();
	if (chrome === '') {
		console.log(
			'::error::Não achei o Chromium do Playwright. Rode `npm run test:e2e:install-browsers` ' +
				'ou aponte `CHROME_PATH` para um Chrome instalado.'
		);
		return 1;
	}

	const destino = mkdtempSync(join(tmpdir(), 'lh-a11y-'));
	const falhas = [];
	try {
		for (const rota of ROTAS) {
			const url = new URL(rota, BASE).toString();
			let resultado;
			try {
				resultado = medir(url, destino, chrome);
			} catch (erro) {
				console.log(`::error::Falha ao medir ${url}: ${erro.message}`);
				return 1;
			}
			const passou = resultado.score >= PISO;
			console.log(
				`${passou ? 'ok  ' : 'FALHA'}  ${resultado.score.toFixed(2)}  ${rota}` +
					(resultado.reprovadas.length > 0 ? `  (${resultado.reprovadas.join(', ')})` : '')
			);
			if (!passou) falhas.push({ rota, ...resultado });
		}
	} finally {
		rmSync(destino, { recursive: true, force: true });
	}

	if (falhas.length === 0) {
		console.log(`Lighthouse a11y ≥ ${PISO} em todas as ${ROTAS.length} rotas de UI.`);
		return 0;
	}

	for (const f of falhas) {
		console.log(
			`::error::Lighthouse a11y ${f.score.toFixed(2)} < ${PISO} em ${f.rota}. ` +
				`Auditorias reprovadas: ${f.reprovadas.join(', ') || '(nenhuma nomeada)'}. ` +
				'A §12 do `DESIGN.md` põe WCAG 2.2 AA como piso não negociável.'
		);
	}
	return 1;
}

process.exit(main());
