import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Teste da seleção de PR para re-entrada automática (FU-17, issue #90).
 *
 * O filtro `jq` do `daily-report.yml` decide sozinho quais PRs a fábrica vai re-disparar sem
 * ninguém olhando. Errar para MENOS devolve o beco sem saída que a FU-17 existe para fechar;
 * errar para MAIS gasta crédito de API em looping, ou pior: re-dispara um PR `[BLOQUEADO]`,
 * que espera decisão humana de propósito (FU-06) e desfaria aquele conserto.
 *
 * Nenhum desses casos é verificável lendo o YAML — são quatro condições compostas e um `max`
 * sobre labels. Por isso o filtro é EXTRAÍDO do workflow e executado de verdade, como
 * `tests/hooks/pretooluse.test.ts` faz com o comando dos hooks: reimplementar a regra no teste
 * provaria só que sei escrever a regra duas vezes.
 *
 * `jq` não vem no Windows e o runner do CI já o traz — sem ele os casos são pulados, e é o job
 * `ci` que vale como verificação (mesmo limite dos testes de regra do Firebase).
 */

const RAIZ = process.cwd();
const WORKFLOW = `${RAIZ}/.github/workflows/daily-report.yml`;
const IMPLEMENT = `${RAIZ}/.github/workflows/implement.yml`;

const temJq = spawnSync('jq', ['--version'], { encoding: 'utf8' }).status === 0;

/**
 * Extrai do workflow o programa `jq` que seleciona os candidatos a re-entrada, para o teste
 * seguir o arquivo em vez de uma cópia que envelhece em silêncio.
 */
function filtroDeSelecao(): string {
	// `\r\n` normalizado antes de procurar: com `core.autocrlf=true` (o caso no Windows) o
	// arquivo em disco tem CRLF, e as âncoras abaixo terminam em `\n`. Sem isto a extração
	// falha só fora do CI — o pior tipo de fragilidade, porque o teste passa onde ninguém
	// está olhando e quebra na máquina de quem for mexer no workflow.
	const yaml = readFileSync(WORKFLOW, 'utf8').replace(/\r\n/g, '\n');
	// Ancorado no arquivo de SAÍDA, não no de entrada: o `daily-report.yml` tem dois filtros
	// `jq --arg limite` lendo o mesmo `prs.json` (o outro é a lista de parados do FU-13), então
	// casar pela entrada pegaria o filtro errado.
	const fim = yaml.indexOf('\' "${RUNNER_TEMP}/prs.json" > "${RUNNER_TEMP}/candidatos.tsv"');
	const abertura = 'jq -r --arg limite "$limite" \'\n';
	const inicio = fim === -1 ? -1 : yaml.lastIndexOf(abertura, fim);
	if (inicio === -1) {
		throw new Error(
			'Filtro de seleção não encontrado em daily-report.yml — o teste ficou órfão do workflow.'
		);
	}
	return yaml.slice(inicio + abertura.length, fim);
}

/** Roda o filtro contra uma lista de PRs e devolve as linhas `numero\tsessoes_gastas`. */
function selecionar(prs: unknown[], limite: string): string[] {
	const saida = execFileSync('jq', ['-r', '--arg', 'limite', limite, filtroDeSelecao()], {
		input: JSON.stringify(prs),
		encoding: 'utf8'
	});
	return saida.split('\n').filter((l) => l.trim() !== '');
}

const LIMITE = '2026-08-03T18:00:00Z';
const PARADO = '2026-08-01T10:00:00Z';
const RECENTE = '2026-08-03T23:50:00Z';

const rotulo = (...nomes: string[]) => nomes.map((name) => ({ name }));

describe.skipIf(!temJq)('seleção de PR parado para re-entrada (daily-report.yml)', () => {
	it('escolhe o PR incompleto e parado, e conta zero sessão quando não há label reentrada', () => {
		// O caso real que originou a FU-17: PR #87 da issue #86, parado desde 2026-08-02.
		const prs = [
			{
				number: 87,
				title: '[WIP] [F1-07a] Stripe modo teste',
				updatedAt: PARADO,
				labels: rotulo('entrega:incompleta')
			}
		];
		expect(selecionar(prs, LIMITE)).toEqual(['87\t0']);
	});

	it('ignora PR [BLOQUEADO]: Decision Gate espera humano de propósito (FU-06)', () => {
		const prs = [
			{
				number: 91,
				title: '[BLOQUEADO] [F2-01] motor de narrativa',
				updatedAt: PARADO,
				labels: rotulo('entrega:incompleta')
			}
		];
		expect(selecionar(prs, LIMITE)).toEqual([]);
	});

	it('ignora PR já marcado precisa-humano: o teto foi esgotado, não se tenta de novo', () => {
		const prs = [
			{
				number: 93,
				title: '[WIP] [F2-03] esgotado',
				updatedAt: PARADO,
				labels: rotulo('entrega:incompleta', 'precisa-humano', 'reentrada:3')
			}
		];
		expect(selecionar(prs, LIMITE)).toEqual([]);
	});

	it('ignora PR que empurrou commit há pouco: não está parado', () => {
		const prs = [
			{
				number: 94,
				title: '[WIP] [F2-04] andando',
				updatedAt: RECENTE,
				labels: rotulo('entrega:incompleta')
			}
		];
		expect(selecionar(prs, LIMITE)).toEqual([]);
	});

	it('ignora PR com entrega:completa: está esperando merge humano, não sessão nova', () => {
		const prs = [
			{
				number: 95,
				title: '[F2-05] pronto',
				updatedAt: PARADO,
				labels: rotulo('entrega:completa')
			}
		];
		expect(selecionar(prs, LIMITE)).toEqual([]);
	});

	it('reporta o MAIOR reentrada:N, para o shell aplicar o teto sobre a contagem certa', () => {
		// Labels antigas não são removidas: `reentrada:1` convive com `reentrada:3`. Ler a
		// primeira em vez da maior faria o teto nunca ser atingido — o looping que o teto
		// existe para impedir.
		const prs = [
			{
				number: 92,
				title: '[WIP] [F2-02] no teto',
				updatedAt: PARADO,
				labels: rotulo('entrega:incompleta', 'reentrada:1', 'reentrada:3')
			}
		];
		expect(selecionar(prs, LIMITE)).toEqual(['92\t3']);
	});

	it('sobrevive a label reentrada: malformada, sem derrubar a seleção do repo inteiro', () => {
		// `tonumber` sobre "" é erro de jq, e este filtro roda sobre TODOS os PRs de uma vez:
		// sem o `test("^reentrada:[0-9]+$")`, uma única label malformada — que o guard-rail
		// criava quando `TENTATIVA` chegava vazia — reprovaria o step inteiro e desligaria a
		// rede de retaguarda da fábrica em silêncio. Achado M2 da revisão do PR #91.
		const prs = [
			{
				number: 97,
				title: '[WIP] com label malformada',
				updatedAt: PARADO,
				labels: rotulo('entrega:incompleta', 'reentrada:', 'reentrada:2')
			},
			{ number: 87, title: '[WIP] sadio', updatedAt: PARADO, labels: rotulo('entrega:incompleta') }
		];
		expect(selecionar(prs, LIMITE)).toEqual(['97\t2', '87\t0']);
	});

	it('separa os elegíveis do resto numa lista mista, preservando a contagem de cada um', () => {
		const prs = [
			{ number: 87, title: '[WIP] a', updatedAt: PARADO, labels: rotulo('entrega:incompleta') },
			{
				number: 91,
				title: '[BLOQUEADO] b',
				updatedAt: PARADO,
				labels: rotulo('entrega:incompleta')
			},
			{ number: 94, title: '[WIP] c', updatedAt: RECENTE, labels: rotulo('entrega:incompleta') },
			{ number: 95, title: 'd', updatedAt: PARADO, labels: rotulo('entrega:completa') },
			{
				number: 96,
				title: '[WIP] e',
				updatedAt: PARADO,
				labels: rotulo('entrega:incompleta', 'reentrada:2')
			}
		];
		expect(selecionar(prs, LIMITE)).toEqual(['87\t0', '96\t2']);
	});
});

/**
 * Escolha de QUAL PR retomar (`implement.yml`). Isto é gate de segurança, não conveniência: o
 * repositório é público e o corpo do PR é escrito por quem o abre, então o resultado desta
 * seleção vira o `ref:` de um checkout num job com `contents: write` e o número que entra no
 * prompt de um agente com `Bash(git:*)`/`Bash(gh api:*)`. Achados A1 e M3 da revisão de
 * segurança do PR #91.
 */
function filtroDeRetomada(): string {
	const yaml = readFileSync(IMPLEMENT, 'utf8').replace(/\r\n/g, '\n');
	const abertura = 'jq -c --arg n "$ISSUE" --arg dono "$DONO" \'';
	const inicio = yaml.indexOf(abertura);
	const fim = inicio === -1 ? -1 : yaml.indexOf("| first // empty')", inicio);
	if (inicio === -1 || fim === -1) {
		throw new Error('Filtro de retomada não encontrado em implement.yml — o teste ficou órfão.');
	}
	return yaml.slice(inicio + abertura.length, fim) + '| first // empty';
}

function retomar(prs: unknown[], issue = '86', dono = 'Marcelo-Has'): string {
	return execFileSync(
		'jq',
		['-c', '--arg', 'n', issue, '--arg', 'dono', dono, filtroDeRetomada()],
		{ input: JSON.stringify(prs), encoding: 'utf8' }
	).trim();
}

const prBase = {
	number: 87,
	headRefName: 'feat/f1-07a',
	title: '[WIP] entrega em andamento',
	labels: rotulo('entrega:incompleta'),
	body: 'Closes #86',
	isCrossRepository: false,
	author: { login: 'app/claude' }
};

describe.skipIf(!temJq)('escolha do PR a retomar (implement.yml)', () => {
	it('retoma o PR da própria fábrica que fecha a issue', () => {
		expect(retomar([prBase])).toContain('"number":87');
	});

	it('aceita PR aberto pelo dono do repositório', () => {
		expect(retomar([{ ...prBase, author: { login: 'Marcelo-Has' } }])).toContain('"number":87');
	});

	it('RECUSA PR vindo de fork, ainda que diga Closes #86', () => {
		expect(retomar([{ ...prBase, isCrossRepository: true }])).toBe('');
	});

	it('RECUSA PR de terceiro: corpo é texto controlado por quem abre o PR', () => {
		expect(retomar([{ ...prBase, author: { login: 'pessoa-aleatoria' } }])).toBe('');
	});

	it('RECUSA PR [BLOQUEADO]: Decision Gate espera humano de propósito (FU-06)', () => {
		expect(retomar([{ ...prBase, title: '[BLOQUEADO] esperando decisão' }])).toBe('');
	});

	it('RECUSA PR precisa-humano: saiu da fila automática, não volta pela retomada', () => {
		const labels = rotulo('entrega:incompleta', 'precisa-humano');
		expect(retomar([{ ...prBase, labels }])).toBe('');
	});

	it('ignora menção solta a #86: só palavra de fechamento conta', () => {
		expect(retomar([{ ...prBase, body: 'Refs #86, contexto em #86' }])).toBe('');
	});

	it('não confunde #86 com #861', () => {
		expect(retomar([{ ...prBase, body: 'Closes #861' }])).toBe('');
	});

	it('escolhe o PR legítimo mesmo quando um de terceiro reivindica a mesma issue', () => {
		// O caso que motiva A1: o `first` sozinho pegaria o intruso.
		const intruso = {
			...prBase,
			number: 999,
			headRefName: 'malicioso',
			author: { login: 'pessoa-aleatoria' }
		};
		expect(retomar([intruso, prBase])).toContain('"number":87');
	});
});
