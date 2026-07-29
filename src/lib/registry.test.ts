import { describe, expect, it } from 'vitest';
import {
	getPublishedLayoutElements,
	getPublishedNarrativeStyles,
	getPublishedPhotoStyles,
	getPublishedSizes,
	parseRegistry,
	type ProductRegistry
} from './registry';

describe('registry.json do repositório', () => {
	it('deve retornar lista vazia de tamanhos quando todas as entradas são draft', () => {
		expect(getPublishedSizes()).toEqual([]);
	});

	it('deve retornar lista vazia de estilos de narrativa quando todas as entradas são draft', () => {
		expect(getPublishedNarrativeStyles()).toEqual([]);
	});

	it('deve retornar lista vazia de estilos de foto quando todas as entradas são draft', () => {
		expect(getPublishedPhotoStyles()).toEqual([]);
	});

	it('deve retornar lista vazia de elementos de layout quando todas as entradas são draft', () => {
		expect(getPublishedLayoutElements()).toEqual([]);
	});
});

describe('registry com itens published (fixture)', () => {
	const fixture: ProductRegistry = {
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
				status: 'draft'
			}
		],
		'layout-element': [
			{
				id: 'polaroid-com-texto',
				version: '1.0.0',
				label: 'Polaroid com texto',
				path: 'layout-element/polaroid-com-texto',
				status: 'published'
			}
		]
	};

	it('deve retornar apenas os tamanhos published quando o registry tem entradas mistas', () => {
		expect(getPublishedSizes(fixture)).toEqual([
			{ id: 'medio-20x20', label: 'Médio', sku: 'S200', pages: 32, status: 'published' }
		]);
	});

	it('deve retornar os estilos de narrativa published quando o registry tem entradas mistas', () => {
		expect(getPublishedNarrativeStyles(fixture)).toEqual([
			{
				id: 'romantico',
				version: '1.0.0',
				label: 'Romântico',
				path: 'narrative-style/romantico',
				status: 'published'
			}
		]);
	});

	it('deve retornar lista vazia de estilos de foto quando nenhuma entrada é published', () => {
		expect(getPublishedPhotoStyles(fixture)).toEqual([]);
	});

	it('deve retornar os elementos de layout published quando o registry tem entradas mistas', () => {
		expect(getPublishedLayoutElements(fixture)).toEqual([
			{
				id: 'polaroid-com-texto',
				version: '1.0.0',
				label: 'Polaroid com texto',
				path: 'layout-element/polaroid-com-texto',
				status: 'published'
			}
		]);
	});
});

describe('parseRegistry', () => {
	it('deve retornar o registry quando todas as categorias têm entradas válidas', () => {
		const valido = {
			sizes: [{ id: 'a', label: 'A', sku: 'S', pages: 1, status: 'draft' }],
			'narrative-style': [],
			'photo-style': [],
			'layout-element': []
		};

		expect(parseRegistry(valido)).toEqual(valido);
	});

	it('deve lançar erro quando a raiz não é um objeto', () => {
		expect(() => parseRegistry(null)).toThrow(/inválido/);
		expect(() => parseRegistry('registry')).toThrow(/inválido/);
	});

	it('deve lançar erro quando uma categoria não é uma lista', () => {
		expect(() =>
			parseRegistry({
				sizes: 'não é lista',
				'narrative-style': [],
				'photo-style': [],
				'layout-element': []
			})
		).toThrow(/sizes/);
	});

	it('deve lançar erro quando uma entrada não tem id/label/status', () => {
		expect(() =>
			parseRegistry({
				sizes: [{ label: 'Sem id', status: 'draft' }],
				'narrative-style': [],
				'photo-style': [],
				'layout-element': []
			})
		).toThrow(/sizes/);
	});
});
