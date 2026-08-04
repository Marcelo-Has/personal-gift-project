import { describe, expect, it } from 'vitest';
import type { ProductRegistry } from '../registry';
import { resolveSkill } from './loader';

describe('resolveSkill — skills placeholder reais do registry.json', () => {
	it('resolve narrative-style/romantico sem versão informada', () => {
		const skill = resolveSkill('narrative-style', 'romantico');

		expect(skill).toMatchObject({
			category: 'narrative-style',
			id: 'romantico',
			version: '1.0.0',
			path: 'narrative-style/romantico'
		});
		expect(skill.absolutePath).toContain('narrative-style/romantico');
	});

	it('resolve photo-style/aquarela sem versão informada', () => {
		const skill = resolveSkill('photo-style', 'aquarela');

		expect(skill).toMatchObject({ category: 'photo-style', id: 'aquarela', version: '1.0.0' });
	});

	it('resolve layout-element/polaroid-com-texto sem versão informada', () => {
		const skill = resolveSkill('layout-element', 'polaroid-com-texto');

		expect(skill).toMatchObject({
			category: 'layout-element',
			id: 'polaroid-com-texto',
			version: '1.0.0'
		});
	});

	it('resolve com versão explícita quando ela existe', () => {
		const skill = resolveSkill('narrative-style', 'romantico', '1.0.0');

		expect(skill.version).toBe('1.0.0');
	});
});

describe('resolveSkill — erros', () => {
	it('lança erro descritivo para categoria inexistente', () => {
		expect(() => resolveSkill('estilo-inexistente', 'romantico')).toThrow(/categoria/);
	});

	it('lança erro descritivo para id inexistente', () => {
		expect(() => resolveSkill('narrative-style', 'nao-existe')).toThrow(/não encontrada/);
	});

	it('lança erro descritivo para versão inexistente', () => {
		expect(() => resolveSkill('narrative-style', 'romantico', '9.9.9')).toThrow(/9\.9\.9/);
	});
});

describe('resolveSkill — múltiplas versões do mesmo id (fixture)', () => {
	const registryComDuasVersoes: ProductRegistry = {
		sizes: [],
		'narrative-style': [
			{
				id: 'romantico',
				version: '1.0.0',
				label: 'Romântico',
				path: 'narrative-style/romantico',
				status: 'draft'
			},
			{
				id: 'romantico',
				version: '1.10.0',
				label: 'Romântico',
				path: 'narrative-style/romantico',
				status: 'draft'
			},
			{
				id: 'romantico',
				version: '1.2.0',
				label: 'Romântico',
				path: 'narrative-style/romantico',
				status: 'published'
			}
		],
		'photo-style': [],
		'layout-element': []
	};

	it('resolve a maior versão semver (não a maior string) quando nenhuma versão é pedida', () => {
		const skill = resolveSkill('narrative-style', 'romantico', undefined, registryComDuasVersoes);

		expect(skill.version).toBe('1.10.0');
	});

	it('resolve a versão exata quando ela é pedida, mesmo não sendo a maior', () => {
		const skill = resolveSkill('narrative-style', 'romantico', '1.0.0', registryComDuasVersoes);

		expect(skill.version).toBe('1.0.0');
	});

	it('resolve a maior versão independente do status published/draft', () => {
		const skill = resolveSkill('narrative-style', 'romantico', undefined, registryComDuasVersoes);

		expect(skill.status).toBe('draft');
	});
});

describe('resolveSkill — entradas inválidas', () => {
	it('lança erro descritivo quando a versão da entrada não é semver válido', () => {
		const registryComVersaoInvalida: ProductRegistry = {
			sizes: [],
			'narrative-style': [
				{
					id: 'romantico',
					version: 'v1',
					label: 'Romântico',
					path: 'narrative-style/romantico',
					status: 'draft'
				}
			],
			'photo-style': [],
			'layout-element': []
		};

		expect(() =>
			resolveSkill('narrative-style', 'romantico', undefined, registryComVersaoInvalida)
		).toThrow(/semver/);
	});

	it('lança erro descritivo quando a pasta da skill não existe no disco', () => {
		const registryComPastaInexistente: ProductRegistry = {
			sizes: [],
			'narrative-style': [
				{
					id: 'fantasma',
					version: '1.0.0',
					label: 'Fantasma',
					path: 'narrative-style/fantasma',
					status: 'draft'
				}
			],
			'photo-style': [],
			'layout-element': []
		};

		expect(() =>
			resolveSkill('narrative-style', 'fantasma', undefined, registryComPastaInexistente)
		).toThrow(/pasta não encontrada/);
	});

	it('lança erro descritivo quando definition.md não existe no disco', () => {
		const registrySemDefinition: ProductRegistry = {
			sizes: [],
			'narrative-style': [
				{
					id: 'sem-definicao',
					version: '1.0.0',
					// pasta existe (é o diretório de golden-samples, sem definition.md nela)
					path: 'narrative-style/romantico/golden-samples',
					label: 'Sem definição',
					status: 'draft'
				}
			],
			'photo-style': [],
			'layout-element': []
		};

		expect(() =>
			resolveSkill('narrative-style', 'sem-definicao', undefined, registrySemDefinition)
		).toThrow(/definition\.md/);
	});
});
