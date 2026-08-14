// Sem shebang, ao contrário dos irmãos desta pasta: este módulo é IMPORTADO por
// `tests/design/`, e o transformador do vitest não aceita `#!` depois de reescrever os
// imports para CJS ("Invalid Character `!`"). Ele nunca é executado como `./script.mjs` —
// quem o chama é sempre `node`, pelo step não-IA do `design-critic.yml`.
/**
 * O fecho do `design-critic`: o veredito passa a REPROVAR de verdade, e a iteração visual ganha
 * teto (EV2.4 · Q4 — [D-078] §7, família [D-047]).
 *
 * DOIS BURACOS DA Q3, E ELES SÃO DO MESMO TIPO.
 *
 * 1. **O gate não gateava.** A [D-084] entregou o critic escrevendo um veredito que termina em
 *    `REPROVADO` ou `APROVADO` e um step não-IA que o publica como comentário. Mas o step só
 *    falha quando o ARQUIVO está vazio: um `REPROVADO` bem escrito era publicado no PR e o job
 *    terminava **verde**. Dois dos 7 quality gates do [D-078] §7 — a rubrica e o teste
 *    anti-default — eram, na prática, um comentário. Este script lê a última linha e faz o job
 *    ficar vermelho. (Que o check ainda não seja *required* na proteção da `main` é outra
 *    pendência, registrada na [D-082]; um gate que nem fica vermelho não chega a ter esse
 *    problema.)
 *
 * 2. **A iteração não tinha fim.** O [D-078] §7 pede "teto de 3 rodadas → `precisa-humano`", e
 *    ele não existia. Sem teto, um desacordo entre o critic e o builder roda até o orçamento
 *    acabar — e a rodada do critic é a mais cara da fábrica (15 PNGs `fullPage`). A contagem
 *    mora em **label no próprio PR** (`design:rodada-N`), exatamente como o `reentrada:N` do
 *    [D-047]: não em log, não em janela de tempo, e auditável no quadro. Esgotado o teto, entra
 *    `precisa-humano` e **o desacordo vira decisão de gente**. Parar é desfecho válido.
 *
 * FAIL-CLOSED, e o caso importa. Arquivo ausente, vazio, ou terminando em qualquer coisa que não
 * seja exatamente `APROVADO` → **reprovado**, contando rodada. Um critic que se cala quando não
 * sabe o que dizer só existe quando não é necessário — é a mesma regra do
 * `conferir-evidencia.mjs`, e é por ela que a reprovação de ofício daquele script (que não tem
 * última linha, porque nem chegou a haver crítica) é lida aqui como o que é: uma reprovação.
 *
 * EV2.5 — A RODADA PASSA A SER DERIVADA, NÃO INCREMENTADA ([D-086] item 3, issue #184).
 *
 * O contador acima tinha um defeito que só apareceu quando a Q5 ligou a fábrica de verdade: ele
 * media **invocações de job**, não iterações. `design-critic.yml` escuta `synchronize` E
 * `labeled` e não tem `concurrency` (ausência deliberada — check run CANCELLED trava o merge),
 * então dois runs podiam nascer do mesmo commit, no mesmo segundo, e cada um gravava uma rodada.
 * Medido no PR #178: dois runs no sha `5bc1abc9` às 14:17:49, duas rodadas.
 *
 * E o defeito era REFLEXIVO: o comando de recuperação `gh pr edit --remove-label "a,b"` emite
 * DOIS eventos `unlabeled` — ou seja, **limpar o teto queimava o teto**, gastando 2/3 do
 * orçamento antes de a primeira sessão de correção rodar.
 *
 * A correção não é um lock nem `concurrency`: é tornar a contagem **idempotente**. A rodada passa
 * a ser o número de SHAs DISTINTOS que já receberam veredito neste PR, incluindo o atual. Dois
 * runs sobre o mesmo commit calculam o mesmo número, em qualquer ordem e sem se enxergarem —
 * porque contam um conjunto, não incrementam um contador. O teto volta a medir o que a [D-078] §7
 * queria medir: **desacordo sobre estados revisados**, não aritmética de gatilhos.
 *
 * O label `design:rodada-N` continua existindo, mas vira **reflexo auditável** no quadro, não a
 * fonte da verdade — por isso `rodadaAtual()` segue exportada e o comando de recuperação humano
 * (remover a label) continua funcionando sem alterar a contagem real.
 *
 * Entradas, todas por ambiente:
 *   VEREDITO_ARQUIVO   caminho do arquivo escrito pelo agente (ou pelo gate de evidência).
 *   PR                 número do PR. Sem ele o script julga e NÃO mexe em label.
 *   SHA                commit sob crítica. É ele que torna a contagem idempotente; sem ele o
 *                      script cai no incremento antigo (fail-open só para a CONTAGEM, nunca
 *                      para o veredito).
 *   TETO               rodadas antes de `precisa-humano` (padrão 3).
 *   GH_TOKEN           token do runner, para o `gh`.
 *
 * Saída: 0 em `APROVADO`; 1 em qualquer outra coisa.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ARQUIVO = (process.env.VEREDITO_ARQUIVO || '').trim();
const PR = (process.env.PR || '').trim();
const SHA = (process.env.SHA || '').trim();
const TETO = Number(process.env.TETO || 3);

/** O prefixo da label que conta as rodadas. Espelha o `reentrada:N` do [D-047]. */
export const PREFIXO_RODADA = 'design:rodada-';
export const LABEL_HUMANO = 'precisa-humano';

/**
 * O marcador que o step de publicação embute (em comentário HTML, invisível no corpo renderizado)
 * em cada veredito publicado. É a memória de quais commits já foram criticados — e o PR é o lugar
 * certo para guardá-la, pelo mesmo motivo que a contagem do [D-047] mora em label: fica no próprio
 * objeto, é auditável por quem olha o PR, e não depende de log nem de janela de tempo.
 */
export const MARCADOR_SHA = 'design-critic:sha=';

/**
 * Lê o desfecho do arquivo de veredito.
 *
 * O contrato com o agente (prompt do `design-critic.yml`) é: a ÚLTIMA linha, sozinha, é
 * `REPROVADO` ou `APROVADO`. Só `APROVADO` aprova — qualquer outra coisa, inclusive o silêncio,
 * é reprovação com motivo declarado.
 *
 * @param {string | undefined} conteudo
 * @returns {{ aprovado: boolean, motivo: string }}
 */
export function lerDesfecho(conteudo) {
	if (typeof conteudo !== 'string' || conteudo.trim() === '') {
		return {
			aprovado: false,
			motivo:
				'o arquivo de veredito está vazio ou não existe: a crítica visual não aconteceu. ' +
				'Tratar como reprovado, não como verde.'
		};
	}
	const linhas = conteudo
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l !== '');
	const ultima = linhas[linhas.length - 1];
	if (ultima === 'APROVADO') return { aprovado: true, motivo: 'veredito APROVADO.' };
	if (ultima === 'REPROVADO') return { aprovado: false, motivo: 'veredito REPROVADO.' };
	return {
		aprovado: false,
		motivo:
			`a última linha do veredito é \`${ultima.slice(0, 80)}\`, e o contrato exige ` +
			'`APROVADO` ou `REPROVADO` sozinho na última linha. Fail-closed: reprovado. ' +
			'(É também o formato da reprovação de ofício por evidência ausente.)'
	};
}

/**
 * A rodada já registrada nas labels do PR. Sem label nenhuma, zero.
 * @param {Array<string | { name?: string }> | undefined} labels
 * @returns {number}
 */
export function rodadaAtual(labels) {
	return (labels || [])
		.map((l) => (typeof l === 'string' ? l : l?.name || ''))
		.filter((nome) => nome.startsWith(PREFIXO_RODADA))
		.map((nome) => Number(nome.slice(PREFIXO_RODADA.length)))
		.filter((n) => Number.isInteger(n) && n > 0)
		.reduce((maior, n) => Math.max(maior, n), 0);
}

/**
 * Os commits que já receberam veredito neste PR, lidos do `MARCADOR_SHA` nos comentários.
 *
 * Aceita SHA curto ou completo e normaliza para minúsculas: o que importa é a IDENTIDADE do
 * estado revisado, e dois runs do mesmo commit têm de cair no mesmo balde.
 *
 * @param {Array<string | { body?: string }> | undefined} comentarios
 * @returns {Set<string>}
 */
export function shasCriticados(comentarios) {
	const achados = new Set();
	const padrao = new RegExp(`${MARCADOR_SHA}([0-9a-fA-F]{7,40})`, 'g');
	for (const c of comentarios || []) {
		const corpo = typeof c === 'string' ? c : c?.body || '';
		for (const m of corpo.matchAll(padrao)) achados.add(m[1].toLowerCase());
	}
	return achados;
}

/**
 * O que fazer depois de uma reprovação: qual label entra, qual sai, e se o teto estourou.
 *
 * A rodada é **derivada**: `|{SHAs já criticados} ∪ {SHA atual}|`. Isso é o que torna a operação
 * idempotente — dois runs simultâneos sobre o mesmo commit calculam o mesmo número sem se
 * enxergarem, porque ambos contam o mesmo conjunto. Nenhum lock, e a ausência de `concurrency`
 * no workflow (deliberada) deixa de ser um problema.
 *
 * Sem `sha` — ambiente incompleto — cai no incremento antigo. É fail-open só na CONTAGEM, nunca
 * no veredito: um teto que erra para mais gastaria orçamento à toa; o desfecho REPROVADO já foi
 * decidido antes daqui e não depende deste cálculo.
 *
 * O teto é comparado com a rodada NOVA: com `TETO = 3`, a terceira reprovação já entrega o PR ao
 * humano. Deixar para a quarta seria pagar mais uma rodada do job mais caro da fábrica para
 * confirmar o que a terceira já disse.
 *
 * @param {{ labels?: Array<string | { name?: string }>, comentarios?: Array<string | { body?: string }>, sha?: string, teto?: number }} [entrada]
 * @returns {{ atual: number, nova: number, adicionar: string[], remover: string[], estourou: boolean }}
 */
export function proximaRodada({ labels, comentarios, sha, teto = TETO } = {}) {
	const atual = rodadaAtual(labels);
	const criticados = shasCriticados(comentarios);
	if (sha) criticados.add(String(sha).toLowerCase());
	const nova = criticados.size > 0 ? criticados.size : atual + 1;
	return {
		atual,
		nova,
		adicionar: [`${PREFIXO_RODADA}${nova}`, ...(nova >= teto ? [LABEL_HUMANO] : [])],
		// Só tira a label anterior quando ela de fato ficou obsoleta. Re-criticar o MESMO commit
		// mantém o número, e nesse caso remover-e-readicionar produziria dois eventos de label
		// por nada — que é a própria classe de defeito que esta mudança fecha.
		remover: atual > 0 && atual !== nova ? [`${PREFIXO_RODADA}${atual}`] : [],
		estourou: nova >= teto
	};
}

/**
 * @param {string[]} args
 * @param {{ tolerarFalha?: boolean }} [opcoes]
 */
function gh(args, { tolerarFalha = false } = {}) {
	const r = spawnSync('gh', args, { encoding: 'utf8' });
	if (r.status !== 0 && !tolerarFalha) {
		throw new Error(`\`gh ${args.join(' ')}\` saiu ${r.status}: ${(r.stderr || '').trim()}`);
	}
	return r;
}

/**
 * Labels e comentários do PR, numa chamada só. Falha de rede aqui não pode virar "rodada 1" para
 * sempre — daí o `throw`.
 *
 * Os comentários são a memória dos SHAs já criticados (`MARCADOR_SHA`), e vêm junto das labels de
 * propósito: são lidos no mesmo instante, então não há janela em que um esteja atualizado e o
 * outro não.
 *
 * @param {string} numero
 * @returns {{ labels: Array<{ name?: string }>, comentarios: Array<{ body?: string }> }}
 */
function estadoDoPr(numero) {
	const r = gh(['pr', 'view', numero, '--json', 'labels,comments']);
	const dados = JSON.parse(r.stdout || '{"labels":[],"comments":[]}');
	return { labels: dados.labels || [], comentarios: dados.comments || [] };
}

/**
 * `gh pr edit --add-label` falha se a label não existir no repositório. Criar é idempotente.
 * @param {string} nome
 * @param {string} cor
 * @param {string} descricao
 */
function garantirLabel(nome, cor, descricao) {
	gh(['label', 'create', nome, '--color', cor, '--description', descricao], {
		tolerarFalha: true
	});
}

function main() {
	let conteudo;
	try {
		conteudo = readFileSync(ARQUIVO, 'utf8');
	} catch {
		// Arquivo ausente é o mesmo caso de arquivo vazio: não houve crítica. Quem transforma isso
		// em reprovação é o `lerDesfecho`, num lugar só.
		conteudo = '';
	}

	const desfecho = lerDesfecho(conteudo);

	if (desfecho.aprovado) {
		console.log(`design-critic: APROVADO — ${desfecho.motivo}`);
		// A rodada NÃO é zerada na aprovação: o histórico do PR é o que torna o teto auditável, e
		// um PR que precisou de duas rodadas para passar é informação, não sujeira.
		return 0;
	}

	console.log(`::error::design-critic REPROVOU este PR — ${desfecho.motivo}`);

	if (PR === '') {
		console.log(
			'::warning::Sem `PR` no ambiente: a rodada não foi contada e nenhuma label foi aplicada. ' +
				'O teto de rodadas ([D-078] §7) depende dela.'
		);
		return 1;
	}

	try {
		const { labels, comentarios } = estadoDoPr(PR);
		const passo = proximaRodada({ labels, comentarios, sha: SHA });
		if (!SHA) {
			console.log(
				'::warning::Sem `SHA` no ambiente: a rodada foi contada por incremento, não por commit ' +
					'distinto. Dois runs do mesmo commit voltam a contar duas rodadas ([D-086] item 3).'
			);
		}
		garantirLabel(
			`${PREFIXO_RODADA}${passo.nova}`,
			'C5DEF5',
			'Rodada de iteração visual do design-critic (EV2.4 · Q4)'
		);
		if (passo.remover.length > 0) {
			gh(['pr', 'edit', PR, '--remove-label', passo.remover.join(',')], { tolerarFalha: true });
		}
		if (passo.estourou) {
			garantirLabel(LABEL_HUMANO, 'D93F0B', 'Precisa de decisão humana — saiu da fila automática');
		}
		gh(['pr', 'edit', PR, '--add-label', passo.adicionar.join(',')]);

		if (passo.estourou) {
			console.log(
				`::error::Teto de ${TETO} rodadas de iteração visual esgotado no PR #${PR}. ` +
					`Aplicada a label \`${LABEL_HUMANO}\`: o PR sai da fila automática e o desacordo entre ` +
					'o critic e quem constrói passa a ser decisão de gente ([D-078] §7, família [D-047]). ' +
					'Se três rodadas não bastaram, o problema não é a próxima rodada.'
			);
		} else {
			console.log(
				`Rodada ${passo.nova} de ${TETO} registrada no PR #${PR} ` +
					`(label \`${PREFIXO_RODADA}${passo.nova}\`).`
			);
		}
	} catch (erro) {
		console.log(
			`::error::Não foi possível registrar a rodada no PR #${PR}: ${erro instanceof Error ? erro.message : erro}. ` +
				'O veredito continua valendo — o job segue vermelho.'
		);
	}

	return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exit(main());
}
