import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { separarPartes, unir } from '../../.github/scripts/unir-passadas-critic.mjs';

/**
 * As duas passadas do `design-critic` (EV2.5 — [D-086] item 5, issue #184).
 *
 * Dois comportamentos decidem sozinhos se um PR de UI passa, e nenhum é verificável lendo o YAML:
 *
 * 1. **Os dois prompts têm de ser IDÊNTICOS.** A cobertura extra que a [D-086] mediu vem da
 *    amostragem — duas execuções independentes do mesmo critério. Se os prompts divergirem, a
 *    união deixa de medir cobertura e passa a medir a diferença entre os textos, e o gate vira
 *    outra coisa sem ninguém perceber. Duas cópias de um contrato divergem em silêncio ([D-081]);
 *    este teste é o que torna a divergência impossível.
 *
 * 2. **Uma reprovação basta.** Não é votação. Um defeito visto por uma passada e não pela outra é,
 *    pela evidência da Q5, defeito real que a outra não amostrou. Exigir consenso jogaria fora
 *    exatamente o achado que a segunda passada existe para pegar.
 *
 * Os prompts são EXTRAÍDOS do workflow, como `tests/workflows/reentrada.test.ts` faz com o filtro
 * de re-entrada: reimplementar a regra no teste provaria só que sei escrevê-la duas vezes.
 */

const WORKFLOW = `${process.cwd()}/.github/workflows/design-critic.yml`;

/**
 * Extrai o bloco `prompt: |` de uma das passadas.
 *
 * `\r\n` normalizado antes de procurar: com `core.autocrlf=true` (o caso no Windows) o arquivo em
 * disco tem CRLF e as âncoras abaixo terminam em `\n` — sem isto a extração falharia só fora do
 * CI, que é o pior tipo de fragilidade.
 */
function promptDaPassada(rotulo: 'A' | 'B'): string {
	const yaml = readFileSync(WORKFLOW, 'utf8').replace(/\r\n/g, '\n');
	const inicioStep = yaml.indexOf(`- name: Passada ${rotulo}`);
	if (inicioStep === -1) {
		throw new Error(`Step "Passada ${rotulo}" não encontrado — o teste ficou órfão do workflow.`);
	}
	const abertura = yaml.indexOf('prompt: |\n', inicioStep);
	const fim = yaml.indexOf('claude_args:', abertura);
	if (abertura === -1 || fim === -1) {
		throw new Error(
			`Prompt da passada ${rotulo} não delimitado — o teste ficou órfão do workflow.`
		);
	}
	return yaml.slice(abertura + 'prompt: |\n'.length, fim).trimEnd();
}

describe('as duas passadas recebem o MESMO critério', () => {
	it('os prompts são idênticos, tirando o arquivo de veredito de cada uma', () => {
		const a = promptDaPassada('A').replace(/design-critic-veredito-a\.md/g, '__VEREDITO__');
		const b = promptDaPassada('B').replace(/design-critic-veredito-b\.md/g, '__VEREDITO__');
		expect(b).toBe(a);
	});

	it('cada passada escreve no seu próprio arquivo', () => {
		expect(promptDaPassada('A')).toContain('design-critic-veredito-a.md');
		expect(promptDaPassada('B')).toContain('design-critic-veredito-b.md');
		// Uma escrevendo por cima da outra apagaria a primeira amostra em silêncio.
		expect(promptDaPassada('A')).not.toContain('design-critic-veredito-b.md');
		expect(promptDaPassada('B')).not.toContain('design-critic-veredito-a.md');
	});
});

const APROVA = (achados = '') =>
	`## design-critic — APROVADO\n\n${achados}\n### Teste anti-default\n\nNão, é específico.\n\nAPROVADO`;
const REPROVA = (achados: string) =>
	`## design-critic — REPROVADO\n\n${achados}\n### Teste anti-default\n\nSim, é genérico.\n\nREPROVADO`;

describe('união das passadas — fail-closed, não votação', () => {
	it('as duas aprovando, o veredito aprova', () => {
		const saida = unir([
			{ rotulo: 'A', conteudo: APROVA() },
			{ rotulo: 'B', conteudo: APROVA() }
		]);
		expect(saida.split('\n').at(-1)).toBe('APROVADO');
	});

	it('UMA reprovando basta para reprovar, e o achado dela sobrevive', () => {
		// É o caso medido no sha `9cea4eb3`: um run viu a escada de texto, o outro não. O defeito
		// era real. Diluir isso por maioria descartaria o achado.
		const saida = unir([
			{ rotulo: 'A', conteudo: APROVA() },
			{
				rotulo: 'B',
				conteudo: REPROVA('- [High] D1 · home@768 — escada de uma palavra por linha\n')
			}
		]);
		expect(saida.split('\n').at(-1)).toBe('REPROVADO');
		expect(saida).toContain('escada de uma palavra por linha');
	});

	it('a união preserva os achados das DUAS passadas', () => {
		const saida = unir([
			{ rotulo: 'A', conteudo: REPROVA('- [High] D1 · home@375 — achado só do A\n') },
			{ rotulo: 'B', conteudo: REPROVA('- [Med] D3 · home@768 — achado só do B\n') }
		]);
		expect(saida).toContain('achado só do A');
		expect(saida).toContain('achado só do B');
	});

	it('com uma passada só, avisa que a cobertura caiu para uma amostra', () => {
		const saida = unir([{ rotulo: 'A', conteudo: APROVA() }]);
		expect(saida).toMatch(/UMA amostra/i);
		expect(saida.split('\n').at(-1)).toBe('APROVADO');
	});

	it('veredito malformado é REPROVADO — o fail-closed do lerDesfecho vale na união', () => {
		const saida = unir([
			{ rotulo: 'A', conteudo: APROVA() },
			{ rotulo: 'B', conteudo: 'texto sem a última linha de desfecho' }
		]);
		expect(saida.split('\n').at(-1)).toBe('REPROVADO');
	});
});

describe('separação das partes de um veredito', () => {
	it('separa achados da seção anti-default e não engole o desfecho', () => {
		const { achados, antidefault } = separarPartes(
			REPROVA('- [High] D1 · home@375 — um\n- [Low] D2 · home@768 — dois\n')
		);
		expect(achados).toHaveLength(2);
		expect(antidefault).toBe('Sim, é genérico.');
		expect(antidefault).not.toContain('REPROVADO');
	});

	it('aguenta veredito sem achado nenhum', () => {
		expect(separarPartes(APROVA()).achados).toEqual([]);
	});
});

describe('nenhuma passada escreveu — o PR não pode ficar vermelho E MUDO', () => {
	it('escreve uma reprovação EXPLICADA quando não há veredito nenhum', async () => {
		// Regressão do que aconteceu no PR #186: as duas passadas foram puladas pelo impasse
		// [D-014] (a action recusa rodar em PR que altera o workflow que a invoca), o arquivo
		// final ficou vazio e o job reprovou sem uma linha no fio do PR explicando por quê — que
		// é exatamente o defeito que a [D-086] item 1 registrou.
		const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
		const { tmpdir } = await import('node:os');
		const { join } = await import('node:path');
		const { execFileSync } = await import('node:child_process');

		const dir = mkdtempSync(join(tmpdir(), 'critic-'));
		const saida = join(dir, 'veredito.md');
		try {
			execFileSync(
				process.execPath,
				[`${process.cwd()}/.github/scripts/unir-passadas-critic.mjs`],
				{
					env: {
						...process.env,
						PASSADA_A: join(dir, 'nao-existe-a.md'),
						PASSADA_B: join(dir, 'nao-existe-b.md'),
						VEREDITO_ARQUIVO: saida
					},
					encoding: 'utf8'
				}
			);
			const conteudo = readFileSync(saida, 'utf8');
			expect(conteudo.split('\n').at(-1)).toBe('REPROVADO');
			expect(conteudo).toMatch(/D-014/);
			expect(conteudo).toMatch(/merge manual/i);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('NÃO sobrescreve a reprovação de ofício por evidência ausente', async () => {
		const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
		const { tmpdir } = await import('node:os');
		const { join } = await import('node:path');
		const { execFileSync } = await import('node:child_process');

		const dir = mkdtempSync(join(tmpdir(), 'critic-'));
		const saida = join(dir, 'veredito.md');
		const oficio = 'Faltam screenshots: reprovação de ofício ([D-083] §6).';
		writeFileSync(saida, oficio, 'utf8');
		try {
			execFileSync(
				process.execPath,
				[`${process.cwd()}/.github/scripts/unir-passadas-critic.mjs`],
				{
					env: {
						...process.env,
						PASSADA_A: join(dir, 'nao-existe-a.md'),
						PASSADA_B: join(dir, 'nao-existe-b.md'),
						VEREDITO_ARQUIVO: saida
					},
					encoding: 'utf8'
				}
			);
			// Apagar o motivo da reprovação seria trocar um vermelho explicado por um vermelho mudo.
			expect(readFileSync(saida, 'utf8')).toBe(oficio);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
