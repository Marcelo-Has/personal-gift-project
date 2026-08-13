import stylelint from 'stylelint';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * O gate 1 (compliance de tokens) rodando contra VIOLAÇÕES PLANTADAS.
 *
 * Um gate que nunca foi visto reprovando é uma promessa, não um controle. Aqui o `stylelint` real
 * — a mesma config que `npm run lint:estilo` usa — roda contra `tests/design/fixtures/`, onde cada
 * arquivo planta um caso e declara o desfecho esperado no próprio comentário do topo.
 *
 * O par que importa é sempre o mesmo: a violação REPROVA **e** a versão corrigida VOLTA AO VERDE.
 * Só a primeira metade provaria que o gate reclama; as duas provam que ele reclama do que deve.
 */

const FIXTURES = 'tests/design/fixtures';

interface Resultado {
	reprovou: boolean;
	regras: string[];
	texto: string;
}

/**
 * Roda o stylelint de verdade, pela API de Node.
 *
 * Pela API e não pela CLI, de propósito: seis `npx stylelint` em série custavam mais de um minuto
 * nesta suíte e, rodando junto com o resto do `vitest`, saturavam a máquina a ponto de estourar o
 * timeout de testes VIZINHOS (render de PDF, hooks). Um gate que só passa quando roda sozinho não
 * é um gate. A config carregada é a MESMA que `npm run lint:estilo` usa — nada é reimplementado
 * aqui.
 */
async function rodar(arquivos: string[]): Promise<Resultado> {
	const r = await stylelint.lint({ files: arquivos, formatter: 'string' });
	const regras = r.results.flatMap((f) => f.warnings.map((w) => w.rule));
	return { reprovou: r.errored === true, regras: [...new Set(regras)], texto: r.report };
}

const fixture = (arquivo: string) => rodar([`${FIXTURES}/${arquivo}`]);

describe('gate de tokens — violação plantada reprova', () => {
	let resultado: Resultado;
	beforeAll(async () => {
		resultado = await fixture('tokens-violados.css');
	});

	it('reprova', () => {
		expect(resultado.reprovou, resultado.texto).toBe(true);
	});

	it('pega cor literal fora do sistema de tokens (anti-pattern 30)', () => {
		expect(resultado.regras).toContain('declaration-property-value-disallowed-list');
	});

	it('pega espaçamento, raio, sombra e tipografia fora da escala do DESIGN.md', () => {
		expect(resultado.regras).toContain('declaration-property-value-allowed-list');
	});
});

describe('gate de tokens — volta ao verde sem falso-positivo residual', () => {
	it('o mesmo bloco derivado dos tokens passa limpo', async () => {
		const resultado = await fixture('tokens-limpo.css');
		expect(resultado.reprovou, resultado.texto).toBe(false);
		expect(resultado.regras).toEqual([]);
	});
});

describe('a allowlist é explícita: exceção sem justificativa e exceção inútil são achados', () => {
	it('reprova `stylelint-disable` sem o `--` e o motivo', async () => {
		const resultado = await fixture('tokens-excecao-anonima.css');
		expect(resultado.reprovou, resultado.texto).toBe(true);
		expect(resultado.texto).toMatch(/descriptionless/i);
	});

	it('reprova exceção que já não silencia nada (o falso-positivo residual)', async () => {
		const resultado = await fixture('tokens-excecao-inutil.css');
		expect(resultado.reprovou, resultado.texto).toBe(true);
		expect(resultado.texto).toMatch(/needless/i);
	});

	it('aceita exceção que silencia um achado real E diz por quê', async () => {
		const resultado = await fixture('tokens-excecao-justificada.css');
		expect(resultado.reprovou, resultado.texto).toBe(false);
	});
});

describe('o produto no ar passa pelo próprio gate', () => {
	it('`src/**` não tem valor de design escrito à mão', async () => {
		const resultado = await rodar(['src/**/*.{css,svelte}']);
		expect(resultado.reprovou, resultado.texto).toBe(false);
	});
});
