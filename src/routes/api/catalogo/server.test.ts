import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A rota chama os leitores de `$lib/registry` — mocka-los aqui evita depender do
 * `registry.json` real e deixa cada teste controlar exatamente o que é `published`.
 */
const getPublishedNarrativeStylesMock = vi.fn();
const getPublishedPhotoStylesMock = vi.fn();
const getPublishedSizesMock = vi.fn();

vi.mock('$lib/registry', () => ({
	getPublishedNarrativeStyles: (...args: unknown[]) => getPublishedNarrativeStylesMock(...args),
	getPublishedPhotoStyles: (...args: unknown[]) => getPublishedPhotoStylesMock(...args),
	getPublishedSizes: (...args: unknown[]) => getPublishedSizesMock(...args)
}));

const { GET } = await import('./+server');

beforeEach(() => {
	getPublishedNarrativeStylesMock.mockReset().mockReturnValue([]);
	getPublishedPhotoStylesMock.mockReset().mockReturnValue([]);
	getPublishedSizesMock.mockReset().mockReturnValue([]);
});

describe('GET /api/catalogo', () => {
	it('deve responder 200 com listas vazias quando o registry não tem nada published', async () => {
		const resposta = await GET({} as never);

		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ styles: [], sizes: [] });
	});

	it('deve responder com o header Cache-Control: public, max-age=300', async () => {
		const resposta = await GET({} as never);

		expect(resposta.headers.get('Cache-Control')).toBe('public, max-age=300');
	});

	it('deve trazer estilos de narrativa e de foto identificados por categoria, e tamanhos', async () => {
		getPublishedNarrativeStylesMock.mockReturnValue([
			{
				id: 'romantico',
				version: '1',
				label: 'Romântico',
				path: 'narrative/romantico/v1',
				status: 'published'
			}
		]);
		getPublishedPhotoStylesMock.mockReturnValue([
			{
				id: 'aquarela',
				version: '2',
				label: 'Aquarela',
				path: 'photo/aquarela/v2',
				status: 'published'
			}
		]);
		getPublishedSizesMock.mockReturnValue([
			{ id: 'pequeno', label: 'Pequeno', sku: 'BOOK-P', pages: 20, status: 'published' }
		]);

		const resposta = await GET({} as never);
		const corpo = await resposta.json();

		expect(corpo).toEqual({
			styles: [
				{ id: 'romantico', version: '1', label: 'Romântico', category: 'narrative-style' },
				{ id: 'aquarela', version: '2', label: 'Aquarela', category: 'photo-style' }
			],
			sizes: [{ id: 'pequeno', label: 'Pequeno', sku: 'BOOK-P', pages: 20 }]
		});
	});

	// Nenhum campo interno do registry (ex.: `path`, usado para carregar a skill em disco)
	// nem `status` vaza na resposta pública.
	it('não deve expor o campo interno "path" nem "status" na resposta', async () => {
		getPublishedNarrativeStylesMock.mockReturnValue([
			{
				id: 'romantico',
				version: '1',
				label: 'Romântico',
				path: 'narrative/romantico/v1',
				status: 'published'
			}
		]);

		const resposta = await GET({} as never);
		const corpo = await resposta.json();

		expect(corpo.styles[0]).not.toHaveProperty('path');
		expect(corpo.styles[0]).not.toHaveProperty('status');
	});
});
