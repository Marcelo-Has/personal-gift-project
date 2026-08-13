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
 * A LISTA ESPERADA VEM DA FONTE ÚNICA, `rotas-de-ui.mjs`, e não é reimplementada aqui:
 * reimplementar a convenção provaria só que sei escrevê-la duas vezes — e o dia em que as duas
 * cópias divergissem, o critic reprovaria PR correto por não achar arquivo que existe com outro
 * nome.
 *
 * POR QUE NÃO `spawn` DO CAPTADOR (EV2.4 · Q5). Até o primeiro PR de UI real, esta lista era obtida
 * rodando `screenshots.mjs --listar`. O modo existe e funciona — mas `screenshots.mjs` importa
 * `playwright-core` no topo do módulo, e o job `design-critic` **não instala dependências** (não há
 * `npm ci` nele: ele baixa PNGs prontos e chama um agente). No CI o `--listar` saía 1 com
 * `ERR_MODULE_NOT_FOUND`, este gate falhava fechado, o veredito nunca era escrito e o job ficava
 * vermelho e MUDO — em TODO PR de UI, sem exceção. O `design-critic` era, na prática, um gate que
 * ninguém podia passar.
 *
 * O teste não pegou porque roda sob o vitest, com `node_modules` no disco: o ambiente do teste
 * tinha o que o ambiente do job não tem. Por isso a correção não é só trocar o `spawn` por
 * `import` — é `tests/workflows/evidencia-visual.test.ts` passar a EXECUTAR este script a partir de
 * uma cópia fora da árvore do repositório, onde nenhum `node_modules` é alcançável. Só esse formato
 * cobre as duas portas: uma checagem de `import` sozinha não veria o `spawn` de um irmão, que foi
 * exatamente por onde o bug entrou. É essa propriedade de ambiente, e não o modo de obter a lista,
 * que o job precisa.
 *
 * `rotas-de-ui.mjs` é importável sem efeito colateral (é justamente por isso que ele foi extraído
 * na Q4) e não tem dependência nenhuma; `screenshots.mjs`, que chama `process.exit` no topo,
 * continua importando a MESMA lista de lá — a fonte única não se perde.
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
import { statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listarArquivos } from './rotas-de-ui.mjs';

const DESTINO = process.env.DESTINO || '.';
const VEREDITO = (process.env.VEREDITO_ARQUIVO || '').trim();

/** Os arquivos que uma rodada completa tem de produzir, segundo a fonte única das rotas. */
function arquivosEsperados() {
	return listarArquivos();
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
