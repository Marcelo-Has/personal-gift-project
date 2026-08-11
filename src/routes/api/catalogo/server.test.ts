import { describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from './$types';

/**
 * A rota só encadeia os leitores `getPublished*` de `$lib/registry` (issue #173: "não
 * reimplementar a leitura nem o filtro"). Por isso o teste NÃO mocka `$lib/registry`
 * (módulo interno com a lógica de filtro que queremos exercitar de verdade —
 * `.claude/rules/testing.md`: mocke dependência externa, não módulo interno) — mocka
 * só o dado de entrada, `product-skills/registry.json`, do mesmo jeito que
 * `registry.test.ts`/`escolha-estilo.test.ts` usam uma fixture de `ProductRegistry`.
 */
vi.mock('$lib/product-skills/registry.json', () => ({
	default: {
		sizes: [
			{ id: 'mini-15x15', label: 'Mini', sku: 'S150', pages: 32, status: 'draft' },
			{ id: 'medio-20x20', label: 'Médio', sku: 'S200', pages: 32, status: 'published' }
		],
		'narrative-style': [
			{
				id: 'romantico',
				version: '1.0.0',
				label: 'Romântico',
				path: 'narrative-style/romantico',
				status: 'published'
			}
		],
		'photo-style': [
			{
				id: 'aquarela',
				version: '1.0.0',
				label: 'Aquarela',
				path: 'photo-style/aquarela',
				status: 'published'
			}
		],
		'layout-element': []
	}
}));

const { GET } = await import('./+server');

type Handler = RequestHandler;
type Evento = Parameters<Handler>[0];

function evento(): Evento {
	return {} as unknown as Evento;
}

describe('GET /api/catalogo', () => {
	it('responde 200 com styles (narrativa + foto) e sizes, só entradas published', async () => {
		const resposta = await GET(evento());
		expect(resposta.status).toBe(200);

		const corpo = await resposta.json();
		expect(corpo).toEqual({
			styles: [
				{ category: 'narrative-style', id: 'romantico', version: '1.0.0', label: 'Romântico' },
				{ category: 'photo-style', id: 'aquarela', version: '1.0.0', label: 'Aquarela' }
			],
			sizes: [{ id: 'medio-20x20', label: 'Médio', sku: 'S200', pages: 32 }]
		});

		// O tamanho `draft` (mini-15x15) não aparece — só published.
		expect(JSON.stringify(corpo)).not.toContain('mini-15x15');
		// Nenhum caminho interno (`path`) nem `status` do registry vaza na resposta pública.
		expect(JSON.stringify(corpo)).not.toContain('narrative-style/romantico');
		expect(JSON.stringify(corpo)).not.toContain('"status"');
	});

	it('traz o header Cache-Control: public, max-age=300', async () => {
		const resposta = await GET(evento());
		expect(resposta.headers.get('Cache-Control')).toBe('public, max-age=300');
	});
});

describe('GET /api/catalogo com o registry.json real do repositório', () => {
	it('responde 200 com listas vazias quando nada está published (estado atual: tudo draft)', async () => {
		vi.doUnmock('$lib/product-skills/registry.json');
		vi.resetModules();
		const { GET: GetReal } = await import('./+server');

		const resposta = await GetReal(evento());
		expect(resposta.status).toBe(200);

		const corpo = await resposta.json();
		expect(corpo).toEqual({ styles: [], sizes: [] });
	});
});
