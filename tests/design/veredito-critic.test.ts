import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	LABEL_HUMANO,
	PREFIXO_RODADA,
	lerDesfecho,
	proximaRodada,
	rodadaAtual
} from '../../.github/scripts/veredito-critic.mjs';

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
		const passo = proximaRodada([], 3);
		expect(passo.nova).toBe(1);
		expect(passo.adicionar).toEqual([`${PREFIXO_RODADA}1`]);
		expect(passo.remover).toEqual([]);
		expect(passo.estourou).toBe(false);
	});

	it('a segunda troca a label da rodada anterior pela nova', () => {
		const passo = proximaRodada([{ name: `${PREFIXO_RODADA}1` }], 3);
		expect(passo.nova).toBe(2);
		expect(passo.adicionar).toEqual([`${PREFIXO_RODADA}2`]);
		expect(passo.remover).toEqual([`${PREFIXO_RODADA}1`]);
		expect(passo.estourou).toBe(false);
	});

	it('a TERCEIRA estoura o teto e entrega o PR a um humano', () => {
		const passo = proximaRodada([{ name: `${PREFIXO_RODADA}2` }], 3);
		expect(passo.nova).toBe(3);
		expect(passo.estourou).toBe(true);
		expect(passo.adicionar).toEqual([`${PREFIXO_RODADA}3`, LABEL_HUMANO]);
	});

	it('continua entregando ao humano se rodar de novo depois do teto', () => {
		// Não se "desestoura": um PR que voltou para a fila depois do humano e reprovou de novo
		// continua fora da fila automática. O contrário seria devolver o desacordo ao laço que já
		// falhou três vezes.
		expect(proximaRodada([{ name: `${PREFIXO_RODADA}3` }], 3).adicionar).toContain(LABEL_HUMANO);
	});
});
