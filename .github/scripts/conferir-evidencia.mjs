#!/usr/bin/env node
/**
 * O gate de evidência do Visual Verification Loop (EV2.4 · Q3 — [D-078] §7, [D-083] §6).
 *
 * É o 7º dos 7 quality gates: **sem evidência de screenshot, o PR reprova de ofício, sem análise
 * de mérito**. Não é "não deu para avaliar" — é reprovação. Um critic que se cala quando não tem o
 * que olhar só existe quando não é necessário.
 *
 * Confere que TODOS os arquivos que uma rodada completa produz existem e não estão vazios, no
 * caminho que a [D-083] fixou como contrato: `artifacts/screenshots/<rota>-<viewport>.png`.
 * Evidência incompleta é ausência de evidência — uma rota que faltou é justamente a rota que
 * ninguém olhou.
 *
 * A LISTA ESPERADA É PERGUNTADA AO PRÓPRIO CAPTADOR, não reimplementada aqui: roda
 * `screenshots.mjs --listar`, que existe exatamente para isso ([D-083] fixou o modo pensando nesta
 * onda). Reimplementar a convenção provaria só que sei escrevê-la duas vezes — e o dia em que as
 * duas cópias divergissem, o critic reprovaria PR correto por não achar arquivo que existe com
 * outro nome. É `spawn` e não `import` porque `screenshots.mjs` chama `process.exit` no topo do
 * módulo; importá-lo mataria este processo.
 *
 * Entradas, todas por ambiente:
 *   DESTINO            raiz a partir da qual os caminhos valem (padrão `.`).
 *   VEREDITO_ARQUIVO   se definido, a reprovação de ofício é ESCRITA nele quando falta evidência.
 *                      É o que faz o PR ficar vermelho **com explicação publicada** em vez de
 *                      vermelho mudo: o step não-IA de publicação do `design-critic.yml` roda com
 *                      `if: always()` e encontra o arquivo já pronto.
 *
 * Saída: 0 se a evidência está completa; 1 (com `::error::`) se falta qualquer arquivo.
 */
import { spawnSync } from 'node:child_process';
import { statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CAPTADOR = join(AQUI, 'screenshots.mjs');
const DESTINO = process.env.DESTINO || '.';
const VEREDITO = (process.env.VEREDITO_ARQUIVO || '').trim();

/** Os arquivos que uma rodada completa tem de produzir, segundo o próprio captador. */
function arquivosEsperados() {
	const r = spawnSync(process.execPath, [CAPTADOR, '--listar'], { encoding: 'utf8' });
	if (r.status !== 0) {
		throw new Error(
			`\`screenshots.mjs --listar\` saiu ${r.status}: ${`${r.stdout || ''}${r.stderr || ''}`.trim()}`
		);
	}
	return r.stdout
		.split('\n')
		.map((linha) => linha.trim())
		.filter((linha) => linha !== '');
}

/** Falta = não existe, não é arquivo, ou tem 0 byte. PNG vazio é verde sem conteúdo. */
function faltantes(esperados) {
	return esperados.filter((relativo) => {
		try {
			const info = statSync(join(DESTINO, relativo));
			return !info.isFile() || info.size === 0;
		} catch {
			return true;
		}
	});
}

/** O veredito que o step não-IA publica no PR quando não houve o que criticar. */
function reprovacaoDeOficio(ausentes, esperados) {
	return [
		'## `design-critic` — REPROVADO (evidência visual ausente)',
		'',
		'Este PR toca a interface e **não apresentou a evidência visual** que o Visual Verification',
		'Loop exige ([D-078] §7, [D-083] §6). Nenhuma análise de mérito foi feita: sem os',
		'screenshots não há o que criticar, e a ausência de evidência reprova **de ofício** — não é',
		'"não deu para avaliar".',
		'',
		`Faltaram ${ausentes.length} de ${esperados.length} arquivos em \`artifacts/screenshots/\`:`,
		'',
		...ausentes.map((a) => `- \`${a}\``),
		'',
		'**Como destravar:** confira o job `Screenshots` deste PR. Ele depende do deploy preview da',
		'Netlify; se o preview falhou, a captura falha junto. Rota de UI nova também precisa de uma',
		'linha em `ROTAS`, no `.github/scripts/screenshots.mjs` — rota sem captura é rota sem',
		'evidência.',
		'',
		'Para reproduzir localmente:',
		'',
		'```bash',
		'npm run build && npm run preview',
		'PREVIEW_URL=http://localhost:4173 node .github/scripts/screenshots.mjs',
		'node .github/scripts/conferir-evidencia.mjs',
		'```',
		''
	].join('\n');
}

function main() {
	let esperados;
	try {
		esperados = arquivosEsperados();
	} catch (erro) {
		console.log(`::error::Não foi possível saber quais screenshots esperar: ${erro.message}`);
		return 1;
	}

	if (esperados.length === 0) {
		console.log(
			'::error::O captador não listou nenhum arquivo. A convenção de caminho da [D-083] é ' +
				'contrato do `design-critic` — uma lista vazia deixaria o gate de evidência sempre verde.'
		);
		return 1;
	}

	const ausentes = faltantes(esperados);
	if (ausentes.length === 0) {
		console.log(`Evidência visual completa: ${esperados.length} screenshots em \`${DESTINO}\`.`);
		return 0;
	}

	if (VEREDITO !== '') {
		writeFileSync(VEREDITO, reprovacaoDeOficio(ausentes, esperados));
		console.log(`Reprovação de ofício escrita em ${VEREDITO} para o step de publicação.`);
	}
	console.log(
		`::error::Evidência visual incompleta: faltam ${ausentes.length} de ${esperados.length} ` +
			`screenshots (${ausentes.join(', ')}). O \`design-critic\` reprova o PR de ofício ` +
			'([D-083] §6) — evidência incompleta é ausência de evidência.'
	);
	return 1;
}

process.exit(main());
