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

	it('deve ter exemplo real na margem em toda etapa de campo de escrita (DESIGN.md §11) — nunca "João Silva"', () => {
		for (const etapa of questionarioEtapas) {
			if (etapa.key === 'photos') continue;
			expect(etapa.example, `etapa "${etapa.slug}" sem exemplo`).toBeTruthy();
			expect(etapa.example).not.toMatch(/jo[aã]o silva/i);
		}
	});

	it('deve nomear o destino no rótulo de "Continuar" (DESIGN.md §9) em toda etapa com próximo passo', () => {
		for (let i = 0; i < questionarioEtapas.length - 1; i++) {
			const etapa = questionarioEtapas[i];
			expect(etapa.continuarPara, `etapa "${etapa.slug}" sem continuarPara`).toMatch(
				/^Continuar para /
			);
		}
	});

	it('não deve ter continuarPara na última etapa — não há próximo passo', () => {
		const ultima = questionarioEtapas[questionarioEtapas.length - 1];
		expect(ultima.continuarPara).toBeUndefined();
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
