import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * O `src/lib/styles/tokens.css` é uma TRANSCRIÇÃO do `DESIGN.md`, e este teste é o que faz dele
 * uma transcrição em vez de uma segunda opinião.
 *
 * O `DESIGN.md` foi aprovado num gate humano ([D-080]) e alterá-lo depois disso é um Decision Gate
 * novo ([D-078] §9). Mas quem a UI lê é o CSS, não o markdown: sem esta comparação, mudar
 * `--accent` de `#26397F` para outra coisa passaria por um PR comum, e o contrato aprovado viraria
 * documentação de algo que não está no ar. É o mesmo desenho do gate `design-md` do `ci.yml` — ou
 * os dois artefatos concordam, ou o job falha, sem julgamento de agente.
 *
 * A comparação é por LINHA DA TABELA: cada token do CSS tem de aparecer numa linha do `DESIGN.md`
 * que também contenha o valor dele, normalizado. Normalizar é o que permite comparar `0.25rem`
 * com `4px` e `cubic-bezier(0.2, 0.7, 0.2, 1)` com `cubic-bezier(.2, .7, .2, 1)` sem afrouxar a
 * comparação: são as MESMAS quantidades escritas nas convenções de cada arquivo.
 */

const CSS = readFileSync('src/lib/styles/tokens.css', 'utf8');
const DESIGN = readFileSync('DESIGN.md', 'utf8');

/** `--nome: valor;` do bloco `:root`, na ordem em que aparecem. */
function tokensDoCss(css: string): Map<string, string> {
	const tokens = new Map<string, string>();
	for (const [, nome, valor] of css.matchAll(/^\s*--([a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
		tokens.set(nome, valor.trim());
	}
	return tokens;
}

/**
 * Põe os dois arquivos na mesma convenção: sem espaço, minúsculo, `rem` em `px`, vírgula decimal
 * em ponto e zero à esquerda descartado. Nada aqui apaga informação — só notação.
 */
function normalizar(valor: string): string {
	return valor
		.toLowerCase()
		.replace(/(\d+(?:[.,]\d+)?)rem/g, (_, n) => `${Number(String(n).replace(',', '.')) * 16}px`)
		.replace(/(\d),(\d)/g, '$1.$2')
		.replace(/\b0\.(\d)/g, '.$1')
		.replace(/(\.\d*?)0+\b/g, '$1')
		.replace(/\s+/g, '')
		.replace(/['"]/g, '');
}

/**
 * Tokens cujo valor NÃO mora numa linha de tabela do `DESIGN.md`, com o lugar onde ele mora.
 * Declarados um a um de propósito: uma exceção genérica ("pule o que não achar") transformaria
 * este teste num que passa sempre.
 */
const FORA_DE_TABELA: Record<string, { secao: string; procurar: string }> = {
	'font-livro': {
		secao: '§4.5 — "Fallback declarado"',
		procurar: "Lora, Georgia, 'Times New Roman', serif"
	},
	'font-sistema': {
		secao: '§4.5 — "Fallback declarado"',
		procurar: "Archivo, 'Arial Narrow', system-ui, sans-serif"
	},
	'weight-normal': { secao: '§5 — pares de peso', procurar: '400' },
	'weight-forte': { secao: '§5 — pares de peso', procurar: '400 / 700' },
	'weight-sistema': { secao: '§5 — pares de peso', procurar: '400 / 800' },
	'medida-leitura': { secao: '§6 — medida de leitura', procurar: '62ch' }
};

/** A linha de tabela que declara o token — `| \`nome\` | … |`. */
function linhaDoToken(nome: string): string | undefined {
	const alvo = nome.replace(/^(leading)-/, 'text-');
	return DESIGN.split(/\r?\n/).find((linha) =>
		new RegExp(`^\\|\\s*\`${alvo}\`\\s*\\|`).test(linha.trim())
	);
}

describe('tokens.css é transcrição fiel do DESIGN.md', () => {
	const tokens = tokensDoCss(CSS);

	it('declara tokens (o arquivo não está vazio nem foi renomeado por engano)', () => {
		expect(tokens.size).toBeGreaterThan(30);
	});

	for (const [nome, valor] of tokensDoCss(CSS)) {
		it(`--${nome} tem o valor que o DESIGN.md declara`, () => {
			const fora = FORA_DE_TABELA[nome];
			if (fora) {
				expect(normalizar(DESIGN), `--${nome} deveria vir de ${fora.secao} do DESIGN.md`).toContain(
					normalizar(fora.procurar)
				);
				return;
			}

			const linha = linhaDoToken(nome);
			expect(
				linha,
				`--${nome} não tem linha correspondente no DESIGN.md. Token que não está no contrato ` +
					'aprovado é decisão de design tomada em silêncio ([D-078] §9): ou ele sai do CSS, ou ' +
					'o DESIGN.md muda por Decision Gate.'
			).toBeDefined();

			expect(
				normalizar(linha as string),
				`--${nome}: o CSS diz \`${valor}\` e a linha do DESIGN.md é \`${(linha as string).trim()}\`.`
			).toContain(normalizar(valor));
		});
	}

	it('não traz tema escuro — a §4.1 declara que ele não existe neste produto', () => {
		expect(CSS).not.toMatch(/prefers-color-scheme\s*:\s*dark/i);
	});

	it('não traz `radius-lg` — a §4.3 declara que ele não se aplica', () => {
		expect(tokens.has('radius-lg')).toBe(false);
	});
});
