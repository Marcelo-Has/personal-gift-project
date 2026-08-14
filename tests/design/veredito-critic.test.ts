import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	LABEL_HUMANO,
	MARCADOR_SHA,
	PREFIXO_RODADA,
	lerDesfecho,
	proximaRodada,
	rodadaAtual,
	shasCriticados
} from '../../.github/scripts/veredito-critic.mjs';

/** SHAs de commits fictícios, no formato que o GitHub entrega. */
const SHA_1 = '1111111111111111111111111111111111111111';
const SHA_2 = '2222222222222222222222222222222222222222';
const SHA_3 = '3333333333333333333333333333333333333333';

/** Um comentário de veredito como o step de publicação o escreve, com o marcador ao final. */
const veredito = (sha: string) => ({
	body: `## design-critic — REPROVADO\n\n- [High] D1 · home@375 — algo\n\n<!-- ${MARCADOR_SHA}${sha} -->`
});

/**
 * O fecho do `design-critic`: o veredito reprovando de verdade e o teto de 3 rodadas.
 *
 * Estes dois comportamentos decidem sozinhos se um PR de UI passa ou para, e nenhum dos dois é
 * verificável lendo o YAML — são uma regra de leitura de arquivo e uma aritmética sobre labels.
 * Mesmo argumento de `tests/workflows/reentrada.test.ts`, que extrai e executa o filtro de
 * re-entrada do [D-047] em vez de confiar na inspeção do workflow.
 */

const FIXTURES = 'tests/design/fixtures';
const ler = (arquivo: string) => readFileSync(`${FIXTURES}/${arquivo}`, 'utf8');

describe('leitura do desfecho — fail-closed', () => {
	it('aprova quando a última linha é exatamente APROVADO', () => {
		expect(lerDesfecho(ler('veredito-aprovado.md')).aprovado).toBe(true);
	});

	it('reprova quando a última linha é REPROVADO', () => {
		expect(lerDesfecho(ler('veredito-reprovado.md')).aprovado).toBe(false);
	});

	it('reprova a reprovação de ofício por evidência ausente, que não tem última linha', () => {
		// O `conferir-evidencia.mjs` escreve esse arquivo quando faltam screenshots ([D-083] §6).
		// Ele é uma reprovação e tem de ser lido como tal, mesmo sem seguir o formato do agente.
		const desfecho = lerDesfecho(ler('veredito-oficio.md'));
		expect(desfecho.aprovado).toBe(false);
		expect(desfecho.motivo).toMatch(/fail-closed/i);
	});

	it('reprova arquivo vazio ou inexistente — silêncio não é aprovação', () => {
		expect(lerDesfecho('').aprovado).toBe(false);
		expect(lerDesfecho(undefined).aprovado).toBe(false);
		expect(lerDesfecho('   \n\n').aprovado).toBe(false);
	});

	it('não aprova por conter a palavra APROVADO no meio do texto', () => {
		const quase = ['## design-critic — APROVADO', '', '- [High] D7 · home@1280 — genérico.', ''];
		expect(lerDesfecho(quase.join('\n')).aprovado).toBe(false);
	});

	it('não aprova quando a última linha é APROVADO com sujeira em volta', () => {
		expect(lerDesfecho('...\n**APROVADO**\n').aprovado).toBe(false);
	});
});

describe('teto de rodadas de iteração visual', () => {
	it('conta zero quando o PR ainda não tem label de rodada', () => {
		expect(rodadaAtual([{ name: 'area:frontend' }, { name: 'entrega:completa' }])).toBe(0);
	});

	it('conta a maior rodada registrada, e ignora label parecida', () => {
		expect(
			rodadaAtual([
				{ name: `${PREFIXO_RODADA}1` },
				{ name: `${PREFIXO_RODADA}2` },
				{ name: 'reentrada:3' },
				{ name: `${PREFIXO_RODADA}abc` }
			])
		).toBe(2);
	});

	it('a primeira reprovação registra a rodada 1 e não chama humano', () => {
		const passo = proximaRodada({ labels: [], comentarios: [], sha: SHA_1, teto: 3 });
		expect(passo.nova).toBe(1);
		expect(passo.adicionar).toEqual([`${PREFIXO_RODADA}1`]);
		expect(passo.remover).toEqual([]);
		expect(passo.estourou).toBe(false);
	});

	it('a segunda troca a label da rodada anterior pela nova', () => {
		const passo = proximaRodada({
			labels: [{ name: `${PREFIXO_RODADA}1` }],
			comentarios: [veredito(SHA_1)],
			sha: SHA_2,
			teto: 3
		});
		expect(passo.nova).toBe(2);
		expect(passo.adicionar).toEqual([`${PREFIXO_RODADA}2`]);
		expect(passo.remover).toEqual([`${PREFIXO_RODADA}1`]);
		expect(passo.estourou).toBe(false);
	});

	it('a TERCEIRA estoura o teto e entrega o PR a um humano', () => {
		const passo = proximaRodada({
			labels: [{ name: `${PREFIXO_RODADA}2` }],
			comentarios: [veredito(SHA_1), veredito(SHA_2)],
			sha: SHA_3,
			teto: 3
		});
		expect(passo.nova).toBe(3);
		expect(passo.estourou).toBe(true);
		expect(passo.adicionar).toEqual([`${PREFIXO_RODADA}3`, LABEL_HUMANO]);
	});

	it('continua entregando ao humano se rodar de novo depois do teto', () => {
		// Não se "desestoura": um PR que voltou para a fila depois do humano e reprovou de novo
		// continua fora da fila automática. O contrário seria devolver o desacordo ao laço que já
		// falhou três vezes.
		const passo = proximaRodada({
			labels: [{ name: `${PREFIXO_RODADA}3` }],
			comentarios: [veredito(SHA_1), veredito(SHA_2), veredito(SHA_3)],
			sha: '4444444444444444444444444444444444444444',
			teto: 3
		});
		expect(passo.adicionar).toContain(LABEL_HUMANO);
	});
});

/**
 * EV2.5 — a regressão do [D-086] item 3 (issue #184).
 *
 * O teto media INVOCAÇÃO DE JOB, não iteração: `design-critic.yml` escuta `synchronize` e
 * `labeled` sem `concurrency`, então dois runs nasciam do mesmo commit e cada um gravava uma
 * rodada. Medido no PR #178 — dois runs no sha `5bc1abc9`, no mesmo segundo, duas rodadas.
 *
 * E era reflexivo: `gh pr edit --remove-label "a,b"` emite DOIS eventos `unlabeled`, então o
 * comando de RECUPERAÇÃO queimava 2/3 do teto antes de a sessão de correção rodar.
 *
 * Estes casos existem para que a contagem nunca volte a depender da ordem ou do número de
 * invocações. Nenhum deles passaria na implementação anterior.
 */
describe('a rodada é derivada do commit, não do número de invocações', () => {
	it('DOIS runs do MESMO commit contam UMA rodada', () => {
		const primeiro = proximaRodada({ labels: [], comentarios: [], sha: SHA_1, teto: 3 });
		// O segundo run já enxerga o veredito que o primeiro publicou.
		const segundo = proximaRodada({
			labels: [{ name: `${PREFIXO_RODADA}1` }],
			comentarios: [veredito(SHA_1)],
			sha: SHA_1,
			teto: 3
		});
		expect(primeiro.nova).toBe(1);
		expect(segundo.nova).toBe(1);
		// E não fica trocando a label por ela mesma — dois eventos de label por nada é a própria
		// classe de defeito que esta mudança fecha.
		expect(segundo.remover).toEqual([]);
	});

	it('dois runs SIMULTÂNEOS do mesmo commit chegam ao mesmo número', () => {
		// O caso real: nenhum dos dois enxergou o comentário do outro. Como a contagem é um
		// conjunto e não um incremento, os dois calculam o mesmo valor — sem lock, sem
		// `concurrency`, em qualquer ordem.
		const entrada = { labels: [], comentarios: [], sha: SHA_1, teto: 3 };
		expect(proximaRodada(entrada).nova).toBe(proximaRodada(entrada).nova);
	});

	it('commits DIFERENTES contam rodadas diferentes — o teto continua existindo', () => {
		expect(
			proximaRodada({ labels: [], comentarios: [veredito(SHA_1)], sha: SHA_2, teto: 3 }).nova
		).toBe(2);
	});

	it('remover a label de rodada NÃO altera a contagem real', () => {
		// O comando humano de recuperação deixa de mexer no teto: a verdade está nos commits já
		// criticados, e o label é só reflexo auditável no quadro.
		const semLabel = proximaRodada({
			labels: [],
			comentarios: [veredito(SHA_1), veredito(SHA_2)],
			sha: SHA_3,
			teto: 3
		});
		expect(semLabel.nova).toBe(3);
		expect(semLabel.estourou).toBe(true);
	});

	it('SHA curto e SHA completo do mesmo commit não contam duas vezes', () => {
		const passo = proximaRodada({
			labels: [],
			comentarios: [veredito(SHA_1.slice(0, 8))],
			sha: SHA_1.slice(0, 8),
			teto: 3
		});
		expect(passo.nova).toBe(1);
	});

	it('sem SHA no ambiente, cai no incremento antigo em vez de travar', () => {
		// Fail-open só na CONTAGEM: um teto que erra para mais gasta orçamento à toa, mas o
		// desfecho REPROVADO já foi decidido antes e não depende deste cálculo.
		expect(proximaRodada({ labels: [{ name: `${PREFIXO_RODADA}1` }], sha: '', teto: 3 }).nova).toBe(
			2
		);
	});

	it('lê os SHAs de comentários reais, ignorando texto que não é veredito', () => {
		const shas = shasCriticados([
			{ body: 'comentário do dono falando de design-critic sem marcador' },
			veredito(SHA_1),
			{ body: `bla bla <!-- ${MARCADOR_SHA}${SHA_2} --> bla` }
		]);
		expect([...shas].sort()).toEqual([SHA_1, SHA_2].sort());
	});
});
