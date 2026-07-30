import { describe, expect, it } from 'vitest';
import { getEtapaBySlug, getEtapaIndex, questionarioEtapas } from './questionario-etapas';
import type { CoupleQuestionnaire } from './order';

const CHAVES_ESPERADAS: (keyof CoupleQuestionnaire)[] = [
	'people',
	'photos',
	'howTheyMet',
	'milestones',
	'insideJokes',
	'trips',
	'challenges',
	'futurePlans',
	'specialMessage'
];

describe('questionarioEtapas', () => {
	it('deve cobrir todas as chaves de CoupleQuestionnaire, na ordem esperada', () => {
		expect(questionarioEtapas.map((etapa) => etapa.key)).toEqual(CHAVES_ESPERADAS);
	});

	it('deve ter slugs únicos, sem duplicata', () => {
		const slugs = questionarioEtapas.map((etapa) => etapa.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('deve ter título e slug não vazios em cada etapa', () => {
		for (const etapa of questionarioEtapas) {
			expect(etapa.slug.trim().length).toBeGreaterThan(0);
			expect(etapa.title.trim().length).toBeGreaterThan(0);
		}
	});
});

describe('getEtapaBySlug', () => {
	it('deve retornar a etapa quando o slug existe', () => {
		expect(getEtapaBySlug('pessoas')?.key).toBe('people');
	});

	it('deve retornar undefined quando o slug não existe', () => {
		expect(getEtapaBySlug('inexistente')).toBeUndefined();
	});
});

describe('getEtapaIndex', () => {
	it('deve retornar 0 para a primeira etapa', () => {
		expect(getEtapaIndex('pessoas')).toBe(0);
	});

	it('deve retornar -1 quando o slug não existe', () => {
		expect(getEtapaIndex('inexistente')).toBe(-1);
	});
});
