#!/usr/bin/env node
/**
 * Descobre a URL do **deploy preview da Netlify** do commit em revisão (EV2.4 · Q2).
 *
 * O deploy preview por PR já existe desde o [D-018] — o que faltava era um jeito não interativo
 * de saber a URL dele. Ninguém aqui dispara deploy: este script só ESPERA e LÊ o que a integração
 * da Netlify com o GitHub já publica, por duas fontes, nesta ordem:
 *
 *   1. **commit status** do commit do PR (contexto `netlify/<site>/deploy-preview`);
 *   2. **comentário do `netlify[bot]`** no PR — a fonte que este repositório comprovadamente tem
 *      (ver o guard-rail do `fix.yml`, que precisou filtrar esse bot justamente porque ele
 *      comenta em todo PR).
 *
 * Duas fontes e não uma porque o `target_url` do status varia conforme o estado do deploy
 * (log da Netlify enquanto constrói, permalink quando conclui): o validador abaixo aceita só
 * hostname em `*.netlify.app`, e o que não passar cai para a fonte seguinte.
 *
 * FAIL-CLOSED: esgotado o tempo sem URL válida, o script SAI 1. Não existe modo "seguir sem
 * evidência" — a ausência de screenshot é o que reprova o PR de ofício no critic da Q3, e um
 * resolvedor que se cala quando não sabe entrega um verde que não significa nada.
 *
 * Entradas, todas por ambiente:
 *   PREVIEW_URL        atalho: se vier preenchida, é validada e devolvida sem consultar a API.
 *   GITHUB_TOKEN       token do runner (`secrets.GITHUB_TOKEN`), com `statuses: read` e
 *                      `pull-requests: read`.
 *   GITHUB_REPOSITORY  `dono/repo`.
 *   SHA                commit que a Netlify construiu (`pull_request.head.sha`).
 *   PR_NUMBER          número do PR, para a fonte 2.
 *   TIMEOUT_SEGUNDOS   teto de espera (padrão 900) · INTERVALO_SEGUNDOS entre tentativas (15).
 *
 * Saída: a URL em `stdout` e, se `GITHUB_OUTPUT` existir, `url=<URL>` nele.
 */
import { appendFileSync } from 'node:fs';

const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = (process.env.GITHUB_REPOSITORY || '').trim();
const TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
const SHA = (process.env.SHA || '').trim();
const PR = (process.env.PR_NUMBER || '').trim();
const TIMEOUT = Number(process.env.TIMEOUT_SEGUNDOS || 900) * 1000;
const INTERVALO = Number(process.env.INTERVALO_SEGUNDOS || 15) * 1000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `null` se não for uma URL de deploy preview. Aceita só `https://*.netlify.app` — `app.netlify.com`
 * (o painel, para onde o status aponta enquanto constrói) e qualquer outro domínio são recusados.
 * Devolve a ORIGEM: o caminho que vier junto é do painel de deploy, não da rota a capturar.
 */
function origemDePreview(bruta) {
	if (typeof bruta !== 'string' || bruta.trim() === '') return null;
	let url;
	try {
		url = new URL(bruta.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:') return null;
	if (!url.hostname.endsWith('.netlify.app')) return null;
	return url.origin;
}

async function api(caminho) {
	const resposta = await fetch(`${API}${caminho}`, {
		headers: {
			accept: 'application/vnd.github+json',
			'x-github-api-version': '2022-11-28',
			...(TOKEN === '' ? {} : { authorization: `Bearer ${TOKEN}` })
		}
	});
	if (!resposta.ok) {
		throw new Error(`GET ${caminho} respondeu ${resposta.status}`);
	}
	return resposta.json();
}

/** Fonte 1: commit status publicado pela Netlify no commit do PR. */
async function pelosStatuses() {
	if (REPO === '' || SHA === '') return null;
	const { statuses = [] } = await api(`/repos/${REPO}/commits/${SHA}/status`);
	const daNetlify = statuses.filter(
		(s) => typeof s.context === 'string' && s.context.toLowerCase().includes('netlify')
	);
	for (const status of daNetlify) {
		const origem = origemDePreview(status.target_url);
		if (origem !== null) return origem;
	}
	return null;
}

/** Fonte 2: o comentário do `netlify[bot]` no PR. O mais recente vence — é o deploy do HEAD. */
async function pelosComentarios() {
	if (REPO === '' || PR === '') return null;
	const comentarios = await api(`/repos/${REPO}/issues/${PR}/comments?per_page=100`);
	const doBot = comentarios.filter((c) => c.user?.login === 'netlify[bot]');
	for (const comentario of doBot.reverse()) {
		const achadas = String(comentario.body || '').match(/https:\/\/[a-z0-9.-]+\.netlify\.app/gi) || [];
		// Preferência pelo permalink `deploy-preview-<n>--<site>`: é o que aponta para o HEAD do PR;
		// o comentário também traz a URL do deploy específico, que serve, mas envelhece.
		const permalink = achadas.filter((u) => u.includes('deploy-preview-'));
		for (const bruta of [...permalink, ...achadas]) {
			const origem = origemDePreview(bruta);
			if (origem !== null) return origem;
		}
	}
	return null;
}

/** A URL existir não é a mesma coisa que o preview estar no ar: confere antes de devolver. */
async function responde(url) {
	for (let tentativa = 1; tentativa <= 3; tentativa++) {
		try {
			const resposta = await fetch(url, { redirect: 'follow' });
			if (resposta.ok) return true;
			console.log(`${url} respondeu ${resposta.status} (tentativa ${tentativa}/3).`);
		} catch (erro) {
			console.log(`${url} não respondeu: ${erro.message} (tentativa ${tentativa}/3).`);
		}
		if (tentativa < 3) await dormir(10_000);
	}
	return false;
}

async function main() {
	const atalho = origemDePreview(process.env.PREVIEW_URL || '');
	if (atalho !== null) {
		console.log(`URL informada por \`PREVIEW_URL\`: ${atalho}`);
		return publicar(atalho);
	}

	const limite = Date.now() + TIMEOUT;
	let tentativas = 0;
	while (Date.now() < limite) {
		tentativas += 1;
		for (const [nome, buscar] of [
			['commit status', pelosStatuses],
			['comentário do netlify[bot]', pelosComentarios]
		]) {
			let achada = null;
			try {
				achada = await buscar();
			} catch (erro) {
				console.log(`::warning::Falha ao ler ${nome}: ${erro.message}`);
			}
			if (achada !== null) {
				console.log(`Deploy preview encontrado via ${nome}: ${achada}`);
				if (await responde(achada)) return publicar(achada);
				console.log(`::warning::${achada} não está no ar ainda — continuando a esperar.`);
			}
		}
		console.log(
			`Preview ainda não publicado (tentativa ${tentativas}); nova checagem em ${INTERVALO / 1000}s.`
		);
		await dormir(INTERVALO);
	}

	console.log(
		'::error::Não foi possível descobrir a URL do deploy preview da Netlify para ' +
			`${SHA.slice(0, 8) || 'este commit'} dentro de ${TIMEOUT / 1000}s. ` +
			'Sem preview não há screenshot, e sem screenshot não há evidência do Visual Verification ' +
			'Loop — o `design-critic` reprova o PR de ofício ([D-078] §7). Confira o deploy do PR na ' +
			'Netlify antes de reexecutar este job.'
	);
	return 1;
}

function publicar(url) {
	console.log(url);
	const saida = process.env.GITHUB_OUTPUT;
	// Escrito daqui, e não com `>>` no shell: a URL vem de fora do repositório e nunca passa por
	// interpolação do `run:` — o mesmo cuidado que o resto da fábrica tem com entrada de terceiro.
	if (saida) appendFileSync(saida, `url=${url}\n`);
	return 0;
}

process.exit(await main());
