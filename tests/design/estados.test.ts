import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROTAS } from '../../.github/scripts/rotas-de-ui.mjs';

/**
 * A COBERTURA do gate 4 (estados obrigatórios), que o próprio gate não consegue checar.
 *
 * `e2e/design/estados.spec.ts` prova que os estados existem e não quebram **nos componentes que
 * ele exercita**. O que ele não sabe dizer é se ficou faltando componente: um `describe` que
 * ninguém escreveu passa em silêncio, e o gate ficaria verde exatamente por não olhar. Este teste
 * fecha esse buraco lendo a tabela da §11 do `DESIGN.md` — o contrato — e exigindo que cada
 * componente-chave dela esteja coberto ou declarado como sem tela.
 *
 * É o mesmo desenho de `tests/design/antipatterns.test.ts` contra a rule: o gate acompanha o
 * contrato, em vez de os dois envelhecerem em direções diferentes.
 */

const DESIGN = readFileSync('DESIGN.md', 'utf8');
const SPEC = readFileSync('e2e/design/estados.spec.ts', 'utf8');

/**
 * Os quatro estados que este gate cobre, e a coluna de cada um na tabela da §11. `Offline /
 * degradado` fica de fora: exercitá-lo exige simular perda de conexão no meio de um upload, e o
 * que a §11 promete ali ("o que foi digitado nunca se perde") é comportamento de persistência,
 * já coberto por `e2e/questionario-rascunho.spec.ts`.
 */
const ESTADOS: Record<string, number> = { vazio: 2, carregando: 3, erro: 4, overflow: 5 };

interface ComponenteChave {
	nome: string;
	/** O texto da célula de cada estado, para saber quando o próprio contrato dispensa o estado. */
	celulas: string[];
}

/**
 * Os componentes-chave da §11: a primeira coluna da tabela, em negrito. A âncora é o cabeçalho da
 * tabela (`| Componente-chave | Vazio | …`), e não o número da seção — renumerar o `DESIGN.md`
 * não pode quebrar este teste em falso.
 */
function componentesChave(): ComponenteChave[] {
	const linhas = DESIGN.split(/\r?\n/);
	const cabecalho = linhas.findIndex((l) => /^\|\s*Componente-chave\s*\|/.test(l.trim()));
	if (cabecalho === -1) throw new Error('Tabela de estados obrigatórios não achada no DESIGN.md.');
	const encontrados: ComponenteChave[] = [];
	for (let i = cabecalho + 2; i < linhas.length; i += 1) {
		const linha = linhas[i].trim();
		if (!linha.startsWith('|')) break;
		const celulas = linha.split('|').map((c) => c.trim());
		const nome = (celulas[1] ?? '').replace(/\*\*/g, '').trim();
		if (nome !== '') encontrados.push({ nome, celulas });
	}
	return encontrados;
}

/** A §11 dispensa um estado quando a própria célula diz que ele não se aplica. */
const dispensado = (celula: string) => /não se aplica/i.test(celula ?? '');

/** O que o spec declara como ainda sem tela. Lido do arquivo, não copiado. */
function pendentesDoSpec(): string[] {
	const bloco = SPEC.match(/export const PENDENTES\s*=\s*\[([\s\S]*?)\]/);
	if (!bloco) throw new Error('`PENDENTES` não achado em `e2e/design/estados.spec.ts`.');
	return [...bloco[1].matchAll(/'([^']+)'/g)].map(([, nome]) => nome);
}

describe('cobertura dos estados obrigatórios da §11', () => {
	const componentes = componentesChave();
	const pendentes = pendentesDoSpec();

	it('lê a tabela do DESIGN.md (o teste não está ancorado no lugar errado)', () => {
		expect(componentes.length).toBeGreaterThanOrEqual(4);
		expect(componentes.map((c) => c.nome)).toContain('Campo de escrita do questionário');
	});

	it('todo componente-chave está coberto pelo gate ou declarado como ainda sem tela', () => {
		const descobertos = componentes
			.map((c) => c.nome)
			.filter((nome) => !SPEC.includes(`test.describe('${nome}`) && !pendentes.includes(nome));
		expect(
			descobertos,
			`Componentes-chave da §11 sem cobertura e sem declaração: ${descobertos.join(', ')}. ` +
				'Ou ganham um `test.describe` em `e2e/design/estados.spec.ts`, ou entram em ' +
				'`PENDENTES` — o anti-pattern 58 é exatamente "só o estado feliz implementado".'
		).toEqual([]);
	});

	it('todo componente declarado como pendente é mesmo pendente — não há rota para ele', () => {
		// A prova de que `PENDENTES` não virou esconderijo: se o componente ganhou tela, ele
		// aparece na lista de rotas de UI, e aí a declaração deixou de ser verdadeira.
		const rotas = ROTAS.join(' ');
		for (const nome of pendentes) {
			const pista = nome.toLowerCase().includes('prévia') ? 'previa' : 'pedidos';
			expect(
				rotas.includes(pista),
				`"${nome}" está declarado como sem tela, mas há rota de UI que sugere o contrário ` +
					`(${rotas}). Atualize \`PENDENTES\` e escreva a cobertura.`
			).toBe(false);
		}
	});

	it('cada componente coberto exercita todo estado que a §11 não dispensa', () => {
		for (const { nome, celulas } of componentes) {
			if (pendentes.includes(nome)) continue;
			const inicio = SPEC.indexOf(`test.describe('${nome}`);
			const proximo = SPEC.indexOf('test.describe(', inicio + 1);
			const bloco = SPEC.slice(inicio, proximo === -1 ? undefined : proximo);
			for (const [estado, coluna] of Object.entries(ESTADOS)) {
				if (dispensado(celulas[coluna])) continue;
				expect(
					bloco.includes(`test('${estado}:`),
					`"${nome}" não exercita o estado \`${estado}\` — a §11 o exige (a célula dele não diz ` +
						'"não se aplica"), e o anti-pattern 58 é justamente a lista incompleta.'
				).toBe(true);
			}
		}
	});
});
