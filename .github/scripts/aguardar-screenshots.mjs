#!/usr/bin/env node
/**
 * Espera o run do workflow `Screenshots` do MESMO commit e devolve o `run_id` dele
 * (EV2.4 · Q3 — [D-078] §7).
 *
 * POR QUE ESPERAR, E NÃO REAGIR A `workflow_run`. A evidência visual é artefato de outro
 * workflow ([D-083]), e a forma óbvia de pegá-la seria disparar o critic em
 * `workflow_run: [Screenshots]`, com o `run_id` já na mão. Foi descartado: check run de
 * `workflow_run` NÃO entra na lista de checks do PR — é assim que o `verdict.yml` roda, e lá isso
 * é aceitável porque o veredito dele é conveniência. Aqui não: o `design-critic` é um dos 7
 * quality gates, e um gate cujo vermelho não bloqueia merge não é um gate. Então o critic dispara
 * em `pull_request`, como o `review.yml`, e paga o preço de esperar — que é este script.
 *
 * FAIL-CLOSED, pelo mesmo argumento do `netlify-preview-url.mjs`: esgotado o tempo sem run
 * concluído, SAI 1. Não existe modo "seguir sem evidência".
 *
 * O que este script NÃO faz: julgar se a evidência está completa. Ele encontra o run; quem
 * confere os arquivos é `conferir-evidencia.mjs`, depois do download. Run que terminou em
 * `failure` ainda assim é devolvido — o `screenshots.yml` sobe o que capturou com `!cancelled()`,
 * e captura parcial é material de diagnóstico. O que reprova é arquivo faltando, não o estado do
 * run vizinho.
 *
 * Entradas, todas por ambiente:
 *   GITHUB_TOKEN       token do runner (`secrets.GITHUB_TOKEN`), com `actions: read`.
 *   GITHUB_REPOSITORY  `dono/repo`.
 *   SHA                head do PR (`pull_request.head.sha`). Conferido no repositório: para run
 *                      de `pull_request`, o `head_sha` do run é o head do BRANCH, não o merge
 *                      commit — por isso o filtro por `head_sha` casa direto.
 *   WORKFLOW           arquivo do workflow a esperar (padrão `screenshots.yml`).
 *   TIMEOUT_SEGUNDOS   teto de espera (padrão 1200) · INTERVALO_SEGUNDOS entre tentativas (15).
 *
 * O teto é 1200s e não 900s porque o `screenshots.yml` já espera até 900s só pelo deploy preview
 * da Netlify, e depois ainda instala browser e captura 15 PNGs.
 *
 * Saída: o id em `stdout` e, se `GITHUB_OUTPUT` existir, `run_id=<id>` e `conclusion=<c>` nele.
 */
import { appendFileSync } from 'node:fs';

const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = (process.env.GITHUB_REPOSITORY || '').trim();
const TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const SHA = (process.env.SHA || '').trim();
const WORKFLOW = (process.env.WORKFLOW || 'screenshots.yml').trim();
const TIMEOUT = Number(process.env.TIMEOUT_SEGUNDOS || 1200) * 1000;
const INTERVALO = Number(process.env.INTERVALO_SEGUNDOS || 15) * 1000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * O run que interessa, entre os que a API devolveu: o do commit exato, mais recente primeiro.
 * Re-execução do mesmo run mantém o `id` e sobe o `run_attempt`; push novo cria `run_number`
 * maior. Ordenar pelos dois nesta ordem escolhe sempre a tentativa mais nova do commit certo.
 *
 * Não é exportada: como todo script desta pasta, este arquivo chama `process.exit` no topo, então
 * importá-lo mataria o processo do teste. O que a cobre é `tests/workflows/evidencia-visual.test.ts`,
 * que EXECUTA o script contra um servidor stub apontado por `GITHUB_API_URL` — mesmo desenho de
 * `screenshots.test.ts`, que roda o captador em vez de reimplementar a convenção dele.
 */
function escolherRun(runs, sha) {
	const doCommit = (runs || []).filter((r) => r && r.head_sha === sha);
	if (doCommit.length === 0) return null;
	return doCommit.sort(
		(a, b) => (b.run_number || 0) - (a.run_number || 0) || (b.run_attempt || 0) - (a.run_attempt || 0)
	)[0];
}

async function api(caminho) {
	const resposta = await fetch(`${API}${caminho}`, {
		headers: {
			accept: 'application/vnd.github+json',
			'x-github-api-version': '2022-11-28',
			...(TOKEN === '' ? {} : { authorization: `Bearer ${TOKEN}` })
		},
		// Teto por requisição, e não só o teto global do laço: `fetch` sem sinal espera para sempre,
		// e uma conexão pendurada faria o job estourar o tempo do JOB em vez de o deste script —
		// ou seja, o fail-closed viraria um job travado, que é pior que vermelho. O erro daqui cai
		// no `catch` do laço, vira `::warning::` e a próxima tentativa segue.
		signal: AbortSignal.timeout(30_000)
	});
	if (!resposta.ok) {
		throw new Error(`GET ${caminho} respondeu ${resposta.status}`);
	}
	return resposta.json();
}

async function buscarRun() {
	const { workflow_runs: runs = [] } = await api(
		`/repos/${REPO}/actions/workflows/${encodeURIComponent(WORKFLOW)}/runs` +
			`?head_sha=${encodeURIComponent(SHA)}&per_page=20`
	);
	return escolherRun(runs, SHA);
}

async function main() {
	if (REPO === '' || SHA === '') {
		console.log(
			'::error::`GITHUB_REPOSITORY` e `SHA` são obrigatórios para achar o run de ' +
				`\`${WORKFLOW}\` da evidência visual.`
		);
		return 1;
	}

	const limite = Date.now() + TIMEOUT;
	let tentativas = 0;
	while (Date.now() < limite) {
		tentativas += 1;
		let run = null;
		try {
			run = await buscarRun();
		} catch (erro) {
			console.log(`::warning::Falha ao consultar os runs de \`${WORKFLOW}\`: ${erro.message}`);
		}

		if (run !== null && run.status === 'completed') {
			// `skipped` é o único desfecho que este script trata como erro próprio, porque a causa é
			// sempre a mesma e é de configuração: os `paths:` dos dois workflows divergiram, e o
			// captador não rodou num PR em que o critic rodou. Esperar mais não conserta isso.
			if (run.conclusion === 'skipped') {
				console.log(
					`::error::O run ${run.id} de \`${WORKFLOW}\` foi PULADO neste commit, mas o ` +
						'`design-critic` rodou. Os filtros `paths:` dos dois workflows precisam ser ' +
						'idênticos — sem captura não há evidência, e sem evidência o critic reprova de ' +
						'ofício ([D-083] §6). Alinhe os `paths:` antes de reexecutar.'
				);
				return 1;
			}
			console.log(
				`Evidência visual pronta: run ${run.id} de \`${WORKFLOW}\` ` +
					`(tentativa ${run.run_attempt || 1}, conclusão \`${run.conclusion}\`).`
			);
			return publicar(run);
		}

		const estado = run === null ? 'ainda não criado' : `em \`${run.status}\``;
		console.log(
			`Run de \`${WORKFLOW}\` para ${SHA.slice(0, 8)} ${estado} ` +
				`(tentativa ${tentativas}); nova checagem em ${INTERVALO / 1000}s.`
		);
		await dormir(INTERVALO);
	}

	console.log(
		`::error::O run de \`${WORKFLOW}\` para ${SHA.slice(0, 8) || 'este commit'} não concluiu ` +
			`em ${TIMEOUT / 1000}s. Sem os screenshots não há o que criticar, e o \`design-critic\` ` +
			'reprova o PR de ofício ([D-083] §6). Confira o workflow `Screenshots` deste PR — ele ' +
			'espera o deploy preview da Netlify — antes de reexecutar este job.'
	);
	return 1;
}

function publicar(run) {
	console.log(run.id);
	const saida = process.env.GITHUB_OUTPUT;
	// Escrito daqui, e não com `>>` no shell: o mesmo cuidado do `netlify-preview-url.mjs` — valor
	// vindo da API nunca passa por interpolação do `run:`.
	if (saida) appendFileSync(saida, `run_id=${run.id}\nconclusion=${run.conclusion}\n`);
	return 0;
}

process.exit(await main());
