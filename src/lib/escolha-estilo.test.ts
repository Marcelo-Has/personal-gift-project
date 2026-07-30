import { describe, expect, it } from 'vitest';
import { catalogoIncompleto, montarOpcoes, validarEscolha } from './escolha-estilo';
import type { ProductRegistry } from './registry';

describe('registry.json do repositório', () => {
	it('deve montar as três listas vazias quando todas as entradas são draft', () => {
		const opcoes = montarOpcoes();

		expect(opcoes).toEqual({ narrativeStyles: [], photoStyles: [], sizes: [] });
	});

	it('deve considerar o catálogo incompleto quando o registry real é usado', () => {
		expect(catalogoIncompleto(montarOpcoes())).toBe(true);
	});
});

describe('registry com itens published (fixture)', () => {
	const publicado: ProductRegistry = {
		sizes: [{ id: 'mini-15x15', label: 'Mini', sku: 'S150', pages: 32, status: 'published' }],
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
	};

	it('deve montar os três grupos de opções quando o registry tem itens published', () => {
		expect(montarOpcoes(publicado)).toEqual({
			narrativeStyles: [{ id: 'romantico', label: 'Romântico' }],
			photoStyles: [{ id: 'aquarela', label: 'Aquarela' }],
			sizes: [{ id: 'mini-15x15', label: 'Mini' }]
		});
	});

	it('deve considerar o catálogo completo quando as três listas têm itens published', () => {
		expect(catalogoIncompleto(montarOpcoes(publicado))).toBe(false);
	});

	it('deve aceitar uma escolha cujos três ids são published', () => {
		expect(
			validarEscolha(
				{ narrativeStyleId: 'romantico', photoStyleId: 'aquarela', sizeId: 'mini-15x15' },
				publicado
			)
		).toBe(true);
	});

	it('deve recusar uma escolha com id de tamanho draft', () => {
		const comTamanhoDraft: ProductRegistry = {
			...publicado,
			sizes: [{ id: 'mini-15x15', label: 'Mini', sku: 'S150', pages: 32, status: 'draft' }]
		};

		expect(
			validarEscolha(
				{ narrativeStyleId: 'romantico', photoStyleId: 'aquarela', sizeId: 'mini-15x15' },
				comTamanhoDraft
			)
		).toBe(false);
	});

	it('deve recusar uma escolha com id inexistente no registry', () => {
		expect(
			validarEscolha(
				{ narrativeStyleId: 'inexistente', photoStyleId: 'aquarela', sizeId: 'mini-15x15' },
				publicado
			)
		).toBe(false);
	});
});

describe('catalogoIncompleto — combinações parciais', () => {
	const opcao = { id: 'x', label: 'X' };

	it('deve ser incompleto quando só faltam estilos de narrativa', () => {
		expect(catalogoIncompleto({ narrativeStyles: [], photoStyles: [opcao], sizes: [opcao] })).toBe(
			true
		);
	});

	it('deve ser incompleto quando só faltam estilos de foto', () => {
		expect(catalogoIncompleto({ narrativeStyles: [opcao], photoStyles: [], sizes: [opcao] })).toBe(
			true
		);
	});

	it('deve ser incompleto quando só faltam tamanhos', () => {
		expect(catalogoIncompleto({ narrativeStyles: [opcao], photoStyles: [opcao], sizes: [] })).toBe(
			true
		);
	});

	it('deve ser completo quando as três listas têm ao menos um item', () => {
		expect(
			catalogoIncompleto({ narrativeStyles: [opcao], photoStyles: [opcao], sizes: [opcao] })
		).toBe(false);
	});
});
