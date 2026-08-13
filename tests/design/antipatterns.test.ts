import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAO_DETECTADOS, varrer } from '../../.github/scripts/lint-antipatterns.mjs';

/**
 * O lint de anti-patterns contra VIOLAÇÕES PLANTADAS — e contra o envelhecimento da própria lista.
 *
 * Dois trabalhos, e o segundo é o que costuma faltar:
 *
 * 1. **Reprova o que deve, e só o que deve.** Cada fixture de `tests/design/fixtures/` planta um
 *    caso; o par violação/limpo prova a reprovação E a volta ao verde. Sem a segunda metade, um
 *    detector guloso demais passaria despercebido — e falso-positivo em gate determinístico é
 *    pior que gate ausente, porque ensina a fábrica a desligá-lo.
 *
 * 2. **A lista não envelhece calada.** `.claude/rules/design-antipatterns.md` marca itens como
 *    `[LINT]`. Todo item marcado assim ou vira detector, ou entra em `NAO_DETECTADOS` com o motivo
 *    escrito. Acrescentar um `[LINT]` novo à rule sem fazer nem uma coisa nem outra REPROVA aqui —
 *    é o que impede a rule e o gate de divergirem em silêncio, que é o modo de falha que a
 *    [D-084] §3 já registrou noutro acoplamento desta mesma família.
 */

const SCRIPT = join(process.cwd(), '.github', 'scripts', 'lint-antipatterns.mjs');
const FIXTURES = 'tests/design/fixtures';
const RULE = '.claude/rules/design-antipatterns.md';

function achadosDe(arquivo: string) {
	const caminho = `${FIXTURES}/${arquivo}`;
	return varrer(caminho, readFileSync(caminho, 'utf8')) as {
		item: number;
		id: string;
		linha: number;
	}[];
}

describe('violação plantada reprova', () => {
	const achados = achadosDe('antipatterns-violados.svelte');
	const itens = new Set(achados.map((a) => a.item));

	it.each([
		[60, 'lorem ipsum'],
		[26, 'gradiente roxo → ciano'],
		[6, '`100vh` onde o certo é `dvh`'],
		[36, 'fonte default do navegador como voz do produto'],
		[14, 'glassmorphism'],
		[15, 'sombra multicamada'],
		[18, 'raio gigante'],
		[27, 'texto com gradiente'],
		[28, 'preto puro'],
		[47, 'easing com overshoot'],
		[50, 'animar propriedade de layout'],
		[52, 'cursor customizado'],
		[55, '`outline: none` sem substituto'],
		[61, 'placeholder poético'],
		[62, 'CTA genérico'],
		[63, 'buzzword'],
		[64, 'dado de exemplo genérico'],
		[65, 'rótulo de etapa genérico'],
		[67, 'dica de rolagem'],
		[68, '`alt` genérico']
	])('pega o anti-pattern %i (%s)', (item) => {
		expect(itens).toContain(item);
	});
});

describe('volta ao verde, sem falso-positivo residual', () => {
	it('a versão corrigida da mesma tela passa limpa', () => {
		expect(achadosDe('antipatterns-limpo.svelte')).toEqual([]);
	});

	it('o produto no ar passa pelo próprio gate', () => {
		const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
		expect(r.status, `${r.stdout || ''}${r.stderr || ''}`).toBe(0);
	});
});

describe('a justificativa é o que abre a exceção — e ela tem de valer alguma coisa', () => {
	it('`antipattern-ok: N -- motivo` silencia o achado', () => {
		expect(achadosDe('antipatterns-justificado.svelte')).toEqual([]);
	});

	it('silenciamento sem motivo é ele próprio um achado', () => {
		const achados = achadosDe('antipatterns-justificativa-vazia.svelte');
		expect(achados.map((a) => a.id)).toContain('justificativa-vazia');
	});

	it('silenciamento que já não silencia nada é achado (o falso-positivo residual)', () => {
		const achados = achadosDe('antipatterns-justificativa-inutil.svelte');
		expect(achados.map((a) => a.id)).toContain('justificativa-inutil');
	});
});

describe('comentário não é interface', () => {
	it('não acha anti-pattern dentro de comentário que EXPLICA o anti-pattern', () => {
		const fonte = [
			'<script>',
			'	// A prévia usava 100vh e quebrava com a barra do navegador in-app.',
			'</script>',
			'<style>',
			'	.a {',
			'		height: 100dvh;',
			'	}',
			'</style>'
		].join('\n');
		expect(varrer('exemplo.svelte', fonte)).toEqual([]);
	});
});

describe('a lista de detectores acompanha a rule', () => {
	const rule = readFileSync(RULE, 'utf8');
	const marcados = [...rule.matchAll(/^(\d+)\.\s*\[LINT\]/gim)].map(([, n]) => Number(n));

	it('a rule tem itens [LINT] (o teste não está lendo o arquivo errado)', () => {
		expect(marcados.length).toBeGreaterThan(20);
	});

	it('todo item [LINT] da rule ou tem detector, ou está declarado sem detector com motivo', () => {
		const listar = spawnSync(process.execPath, [SCRIPT, '--listar'], { encoding: 'utf8' });
		const comDetector = new Set(
			listar.stdout
				.split('\n')
				.map((l) => Number(l.trim().split(/\s+/)[0]))
				.filter((n) => Number.isInteger(n) && n > 0)
		);
		const declarados = new Set(
			(NAO_DETECTADOS as { item: number; motivo: string }[]).map((d) => d.item)
		);

		const orfaos = marcados.filter((n) => !comDetector.has(n) && !declarados.has(n));
		expect(
			orfaos,
			`Itens [LINT] da rule sem detector e sem declaração: ${orfaos.join(', ')}. ` +
				'Ou vira detector em `.github/scripts/lint-antipatterns.mjs`, ou entra em ' +
				'`NAO_DETECTADOS` com o motivo — a terceira opção (ficar de fora em silêncio) é como ' +
				'um gate deixa de cobrir o que ele diz cobrir.'
		).toEqual([]);
	});

	it('toda declaração sem detector traz motivo escrito', () => {
		for (const d of NAO_DETECTADOS as { item: number; motivo: string }[]) {
			expect(d.motivo.trim().length, `item ${d.item} sem motivo`).toBeGreaterThan(40);
		}
	});
});
