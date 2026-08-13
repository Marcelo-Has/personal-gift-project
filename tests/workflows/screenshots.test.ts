import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Teste da infra de evidência visual (EV2.4 · Q2, [D-078] §7).
 *
 * O que está sendo protegido aqui não é a captura em si (essa depende de browser e de uma URL
 * servida, e o CI a exercita de verdade contra o deploy preview) — é a **convenção de caminho**:
 * `artifacts/screenshots/<rota>-<viewport>.png`. O `design-critic` da Q3 procura a evidência
 * exatamente nesse caminho e reprova o PR quando ela falta; se a convenção mudar em silêncio, o
 * critic passa a reprovar PRs corretos por não achar arquivo que existe com outro nome.
 *
 * O script é EXECUTADO, como `tests/workflows/design-md.test.ts` faz com o gate do `DESIGN.md`:
 * reimplementar a regra dentro do teste provaria só que sei escrevê-la duas vezes. O modo
 * `--listar` existe para isso (e para a Q3 poder perguntar ao próprio script quais arquivos uma
 * rodada completa deve produzir).
 */

const SCRIPT = join(process.cwd(), '.github', 'scripts', 'screenshots.mjs');
const VIEWPORTS = [375, 768, 1280];

function rodar(args: string[], env: Record<string, string> = {}) {
	const r = spawnSync(process.execPath, [SCRIPT, ...args], {
		encoding: 'utf8',
		env: { ...process.env, PREVIEW_URL: '', ...env }
	});
	return { codigo: r.status, saida: `${r.stdout}${r.stderr}` };
}

describe('convenção de caminho dos screenshots', () => {
	const { codigo, saida } = rodar(['--listar']);
	const arquivos = saida.trim().split('\n');

	it('lista sem subir browser e sai 0', () => {
		expect(codigo).toBe(0);
		expect(arquivos.length).toBeGreaterThan(0);
	});

	it('grava tudo em `artifacts/screenshots/`, com `<rota>-<viewport>.png` e sem barra no nome', () => {
		for (const arquivo of arquivos) {
			expect(arquivo).toMatch(/^artifacts\/screenshots\/[a-z0-9-]+-(375|768|1280)\.png$/);
		}
	});

	it('cobre as três larguras da §10 do DESIGN.md, com as mesmas rotas em cada uma', () => {
		const porViewport = VIEWPORTS.map((v) =>
			arquivos.filter((a) => a.endsWith(`-${v}.png`)).map((a) => a.replace(`-${v}.png`, ''))
		);
		expect(porViewport.map((r) => r.length)).toEqual([
			porViewport[0].length,
			porViewport[0].length,
			porViewport[0].length
		]);
		expect(porViewport[0].length).toBeGreaterThan(0);
		expect(porViewport[1]).toEqual(porViewport[0]);
		expect(porViewport[2]).toEqual(porViewport[0]);
	});

	it('chama a raiz de `home` e achata rota aninhada com hífen', () => {
		expect(arquivos).toContain('artifacts/screenshots/home-375.png');
		expect(arquivos).toContain('artifacts/screenshots/pedido-cancelado-1280.png');
	});

	it('não repete arquivo — duas rotas nunca colidem no mesmo PNG', () => {
		expect(new Set(arquivos).size).toBe(arquivos.length);
	});
});

describe('fail-closed', () => {
	it('sai 1 e diz o motivo quando não recebe URL nenhuma', () => {
		const { codigo, saida } = rodar([]);
		expect(codigo).toBe(1);
		expect(saida).toContain('::error::');
		expect(saida).toContain('evidência');
	});
});
