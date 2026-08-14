/**
 * Une as duas passadas do `design-critic` num veredito só (EV2.5 — [D-086] item 5, issue #184).
 *
 * POR QUE DUAS PASSADAS. A onda Q5 mediu quatro pares de runs gêmeos do critic — mesmo commit,
 * mesmo instante, pipeline idêntico. Em três deles os vereditos divergiram, e a divergência não
 * era de severidade: era de PERCEPÇÃO. Um run descreveu a voz do sistema quebrando em escada e
 * cruzando a régua; o outro não a mencionou. Os dois estavam certos sobre o que viram. O [High]
 * da barra de topo ausente do wireframe sobreviveu a OITO rodadas por nunca ter caído na amostra.
 *
 * A conclusão da [D-086] é que o critic **amostra** o contrato: cada passada cobre um subconjunto,
 * e o subconjunto muda. Isso não se corrige com um juiz mais severo — um modelo melhor com uma
 * passada só continua sendo uma amostra. O que a medição mostrou é que a UNIÃO de duas passadas
 * foi, nas quatro vezes, mais completa que qualquer run isolado.
 *
 * A REGRA DE FECHO É FAIL-CLOSED, e é o ponto: **basta UMA passada reprovar para o veredito ser
 * REPROVADO.** Não é votação. Um defeito visto por uma passada e não pela outra é, pela evidência
 * da Q5, um defeito real que a outra não amostrou — não um falso-positivo a ser diluído por
 * maioria. Exigir consenso jogaria fora exatamente o achado que a segunda passada existe para
 * pegar.
 *
 * TOLERÂNCIA A PASSADA AUSENTE. Se só uma passada escreveu, ela vale sozinha (com aviso no corpo):
 * uma passada perdida não pode custar as duas. Se NENHUMA escreveu, o script **não toca** no
 * arquivo de veredito — porque nesse caso quem escreveu foi o `conferir-evidencia.mjs`, com a
 * reprovação de ofício por evidência ausente ([D-083] §6), e sobrescrevê-la apagaria o motivo.
 *
 * Entradas, todas por ambiente:
 *   PASSADA_A / PASSADA_B   arquivos escritos por cada passada.
 *   VEREDITO_ARQUIVO        arquivo final, consumido pelos steps de publicação e de contagem.
 *
 * Saída: sempre 0. Quem transforma o desfecho em vermelho é o `veredito-critic.mjs`, num lugar só.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lerDesfecho } from './veredito-critic.mjs';

const A = (process.env.PASSADA_A || '').trim();
const B = (process.env.PASSADA_B || '').trim();
const SAIDA = (process.env.VEREDITO_ARQUIVO || '').trim();

/** Um achado é uma linha no formato `- [High|Med|Low] D<n> · <rota>@<viewport> — ...`. */
const ACHADO = /^-\s*\[(High|Med|Low)\]/i;
const TITULO_ANTIDEFAULT = '### Teste anti-default';

/**
 * Quebra o veredito de uma passada nas partes que a união precisa.
 *
 * Tolerante de propósito: o corpo vem de um agente e pode variar em espaçamento ou trazer texto
 * extra. O que NÃO se infere é o desfecho — esse vem do `lerDesfecho`, que é fail-closed.
 *
 * @param {string} conteudo
 * @returns {{ achados: string[], antidefault: string }}
 */
export function separarPartes(conteudo) {
	const linhas = (conteudo || '').split(/\r?\n/);
	const achados = [];
	const antidefault = [];
	let dentroAntidefault = false;

	for (const linha of linhas) {
		if (linha.trim().toLowerCase().startsWith(TITULO_ANTIDEFAULT.toLowerCase())) {
			dentroAntidefault = true;
			continue;
		}
		if (dentroAntidefault) {
			// A última linha isolada é o desfecho, não faz parte da seção.
			if (/^(APROVADO|REPROVADO)$/.test(linha.trim())) continue;
			antidefault.push(linha);
			continue;
		}
		if (ACHADO.test(linha.trim())) achados.push(linha.trim());
	}

	return { achados, antidefault: antidefault.join('\n').trim() };
}

/**
 * Monta o veredito unificado. Exportada para o teste montar o corpo sem tocar em disco.
 *
 * @param {{ rotulo: string, conteudo: string }[]} passadas — só as que de fato escreveram.
 * @returns {string}
 */
export function unir(passadas) {
	const lidas = passadas.map((p) => ({
		...p,
		desfecho: lerDesfecho(p.conteudo),
		partes: separarPartes(p.conteudo)
	}));

	// Fail-closed: uma reprovação basta. Ver o cabeçalho — não é votação.
	const aprovado = lidas.every((p) => p.desfecho.aprovado);
	const desfecho = aprovado ? 'APROVADO' : 'REPROVADO';

	const out = [`## design-critic — ${desfecho}`, ''];

	if (lidas.length === 1) {
		out.push(
			`> [!WARNING]`,
			`> Só a **passada ${lidas[0].rotulo}** produziu veredito. A outra não escreveu arquivo —`,
			`> a cobertura desta rodada é de UMA amostra, não da união das duas ([D-086] item 5).`,
			''
		);
	}

	for (const p of lidas) {
		out.push(`**Passada ${p.rotulo}** — ${p.partes.achados.length} achado(s), ${p.desfecho.aprovado ? 'APROVADO' : 'REPROVADO'}`);
		out.push('');
		if (p.partes.achados.length === 0) out.push('- (nenhum achado)');
		else out.push(...p.partes.achados);
		out.push('');
	}

	out.push(
		'> As duas passadas são independentes e recebem o MESMO prompt. Achado que aparece em uma e',
		'> não na outra não é ruído: a [D-086] mediu que o critic amostra o contrato, e a união cobre',
		'> mais que qualquer passada isolada. **Uma reprovação basta para reprovar.**',
		''
	);

	for (const p of lidas) {
		if (!p.partes.antidefault) continue;
		out.push(`${TITULO_ANTIDEFAULT} — passada ${p.rotulo}`, '', p.partes.antidefault, '');
	}

	// A ÚLTIMA linha, sozinha: é o contrato que o `veredito-critic.mjs` lê.
	out.push(desfecho);
	return out.join('\n');
}

/** @param {string} caminho */
function lerSeExistir(caminho) {
	if (!caminho) return '';
	try {
		return readFileSync(caminho, 'utf8');
	} catch {
		return '';
	}
}

function main() {
	const passadas = [
		{ rotulo: 'A', conteudo: lerSeExistir(A) },
		{ rotulo: 'B', conteudo: lerSeExistir(B) }
	].filter((p) => p.conteudo.trim() !== '');

	if (passadas.length === 0) {
		// Nenhuma passada escreveu. Dois casos, e o arquivo de saída os distingue.
		if (lerSeExistir(SAIDA).trim() !== '') {
			// Já existe veredito: é a reprovação de ofício por evidência ausente ([D-083] §6).
			// Sobrescrevê-la apagaria o motivo da reprovação.
			console.log(
				'::warning::Nenhuma das duas passadas escreveu veredito. Preservando o arquivo existente ' +
					'(reprovação de ofício). O `veredito-critic.mjs` decide o desfecho.'
			);
			return 0;
		}

		// Nada escrito por ninguém. O job reprova de qualquer forma (fail-closed), mas reprovar
		// EM SILÊNCIO é o pior modo de falha da fábrica — a [D-086] item 1 registrou justamente
		// um gate que ficava "vermelho e MUDO" em todo PR de UI, sem nada no fio explicando por
		// quê. Então o motivo é escrito aqui.
		//
		// A causa mais provável é o impasse [D-014]: a `claude-code-action` recusa rodar quando o
		// PR altera o workflow que a invoca. Nesse caso o vermelho é ESPERADO, não tem conserto
		// na branch, e o desfecho é merge manual.
		writeFileSync(
			SAIDA,
			[
				'## design-critic — REPROVADO',
				'',
				'> [!WARNING]',
				'> **Nenhuma das duas passadas produziu veredito.** A crítica visual não aconteceu —',
				'> por fail-closed isto é reprovação, não aprovação.',
				'',
				'Causas conhecidas, em ordem de probabilidade:',
				'',
				'1. **Impasse [D-014]** — este PR altera um workflow, e a `claude-code-action` recusa',
				'   rodar em PR que muda o workflow que a invoca. É o caso esperado em PR de fábrica:',
				'   o vermelho **não tem conserto na branch**, e o desfecho é **merge manual** (label',
				'   `merge-manual`). Confirme no log dos steps `Passada A`/`Passada B` se aparece',
				'   `Workflow validation failed`.',
				'2. As duas passadas esgotaram o orçamento de turnos sem escrever o arquivo.',
				'3. Falha de infraestrutura nos dois steps de agente.',
				'',
				'REPROVADO'
			].join('\n'),
			'utf8'
		);
		console.log(
			'::warning::Nenhuma passada escreveu e não havia veredito de ofício. Escrita uma ' +
				'reprovação EXPLICADA — o PR fica vermelho com o motivo no fio, nunca vermelho e mudo.'
		);
		return 0;
	}

	if (passadas.length === 1) {
		console.log(
			`::warning::Só a passada ${passadas[0].rotulo} escreveu veredito — a rodada tem UMA amostra, ` +
				'não duas. A cobertura cai para a de um run isolado ([D-086] item 5).'
		);
	}

	writeFileSync(SAIDA, unir(passadas), 'utf8');
	console.log(`Veredito unificado escrito em ${SAIDA} a partir de ${passadas.length} passada(s).`);
	return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exit(main());
}
