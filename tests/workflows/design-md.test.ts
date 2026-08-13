import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Teste do gate determinístico "DESIGN.md existe e está aprovado" (EV2.4, [D-078] §2/§7).
 *
 * O gate é o que separa "a fábrica pode escrever UI" de "a fábrica está inventando identidade
 * visual sozinha", e ele decide isso sem nenhum humano olhando. Dois modos de errar, e os dois
 * doem: reprovar de menos devolve o gap G1 do baseline (UI sem linguagem visual própria);
 * reprovar de mais trava todo PR do repositório.
 *
 * O script é EXECUTADO de verdade, como `tests/workflows/reentrada.test.ts` faz com o filtro do
 * `daily-report.yml`: o que importa aqui é o CÓDIGO DE SAÍDA, e reimplementar a regra no teste
 * provaria só que sei escrevê-la duas vezes.
 */

const GATE = join(process.cwd(), '.github', 'scripts', 'gate-design-md.mjs');

/** Um `DESIGN.md` mínimo com o cabeçalho da §0 no formato do `docs/design/DESIGN-TEMPLATE.md`. */
function design(status: string): string {
	return [
		'# DESIGN.md — projeto de teste',
		'',
		'| Campo | Valor |',
		'| --- | --- |',
		`| **Status** | ${status} |`,
		''
	].join('\n');
}

const APROVADO = design('`aprovado`');
const CANDIDATO = design('`candidato`');
// Cópia crua do template: o placeholder e o Status inválido chegam juntos, que é o estado em que
// um projeto novo encontra o arquivo.
const TEMPLATE = design('`[A PREENCHER]` — `candidato` \\| `aprovado`');

let dir: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'gate-design-'));
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

/**
 * Roda o gate num diretório temporário. `conteudo === null` = o `DESIGN.md` não existe.
 * `ARQUIVOS`/`BASE_SHA` são zerados antes de aplicar o caso para o ambiente do CI não vazar
 * para dentro do teste.
 */
function rodar(
	conteudo: string | null,
	env: Record<string, string> = {}
): { codigo: number | null; saida: string } {
	if (conteudo !== null) writeFileSync(join(dir, 'DESIGN.md'), conteudo);
	const r = spawnSync(process.execPath, [GATE], {
		cwd: dir,
		encoding: 'utf8',
		env: { ...process.env, ARQUIVOS: '', BASE_SHA: '', ...env }
	});
	return { codigo: r.status, saida: `${r.stdout}${r.stderr}` };
}

const UM_ARQUIVO_DE_UI = { ARQUIVOS: 'src/routes/+page.svelte' };

describe('gate DESIGN.md', () => {
	it('deve reprovar quando o PR toca UI e não existe DESIGN.md na raiz', () => {
		const { codigo, saida } = rodar(null, UM_ARQUIVO_DE_UI);
		expect(codigo).toBe(1);
		expect(saida).toContain('::error::');
		expect(saida).toContain('não existe `DESIGN.md`');
	});

	it('deve reprovar quando o DESIGN.md ainda é o template com [A PREENCHER]', () => {
		const { codigo, saida } = rodar(TEMPLATE, UM_ARQUIVO_DE_UI);
		expect(codigo).toBe(1);
		expect(saida).toContain('[A PREENCHER]');
	});

	it('deve reprovar quando o Status é candidato, e não aprovado', () => {
		const { codigo, saida } = rodar(CANDIDATO, UM_ARQUIVO_DE_UI);
		expect(codigo).toBe(1);
		expect(saida).toContain('Status: candidato');
	});

	it('deve reprovar quando o campo Status sumiu do cabeçalho', () => {
		const { codigo, saida } = rodar('# DESIGN.md\n\nsem cabeçalho nenhum\n', UM_ARQUIVO_DE_UI);
		expect(codigo).toBe(1);
		expect(saida).toContain('não tem o campo `Status`');
	});

	it('deve aprovar quando o PR toca UI e o DESIGN.md está aprovado', () => {
		const { codigo, saida } = rodar(APROVADO, UM_ARQUIVO_DE_UI);
		expect(codigo).toBe(0);
		expect(saida).not.toContain('::error::');
	});

	it('deve checar incondicionalmente quando não há lista de arquivos (fail-closed)', () => {
		const { codigo, saida } = rodar(null);
		expect(codigo).toBe(1);
		expect(saida).toContain('incondicionalmente');
	});

	it('deve checar incondicionalmente quando o git não consegue comparar (fail-closed)', () => {
		// Diretório temporário não é repositório git: o `git diff` falha e o gate NÃO pode se calar.
		const { codigo, saida } = rodar(null, { BASE_SHA: '0000000000000000000000000000000000000000' });
		expect(codigo).toBe(1);
		expect(saida).toContain('::warning::');
		expect(saida).toContain('::error::');
	});

	it('deve deixar passar um PR aprovado mesmo sem lista de arquivos', () => {
		expect(rodar(APROVADO).codigo).toBe(0);
	});

	// A lista sai da estrutura real do repositório (`src/routes/**/*.svelte`, `src/app.html`) mais
	// o `src/app.css` global, que é a primeira coisa que uma tarefa de UI cria.
	it.each([
		'src/routes/+page.svelte',
		'src/routes/questionario/[etapa]/+page.svelte',
		'src/lib/componentes/Botao.svelte',
		'src/app.css',
		'src/app.html',
		'DESIGN.md'
	])('deve tratar %s como código de interface', (caminho) => {
		expect(rodar(null, { ARQUIVOS: `docs/DECISIONS.md\n${caminho}` }).codigo).toBe(1);
	});

	// Saída de build entra aqui de propósito: `.svelte-kit/` e `build/` são cheios de `.css`
	// compilado, e sem a poda qualquer PR que reconstruísse o app casaria com o padrão de estilo.
	it.each([
		'src/lib/order.ts',
		'src/routes/api/pedidos/checkout/+server.ts',
		'docs/DECISIONS.md',
		'firestore.rules',
		'.github/workflows/ci.yml',
		'.svelte-kit/output/client/_app/immutable/assets/_page.css',
		'build/client/_app/immutable/assets/_layout.css',
		'artefatos-execucao/_bruto/estilo.css'
	])('não deve bloquear um PR que só toca %s', (caminho) => {
		expect(rodar(null, { ARQUIVOS: caminho }).codigo).toBe(0);
	});
});
