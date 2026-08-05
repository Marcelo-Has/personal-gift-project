import { describe, expect, it } from 'vitest';
import { resolveSkill } from '../product-skills/loader';
import { PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX } from '../product-skills/photo-style/resolution-config';
import {
	MINI_SKU_LAYOUT,
	MINI_SKU_PHOTO_PARAMS,
	PEDIDO_EXEMPLO,
	PEDIDO_EXEMPLO_PHOTO_IDS,
	QUESTIONARIO_EXEMPLO,
	mmToPx
} from './pedido-exemplo';

describe('mmToPx', () => {
	it('deve converter milímetros em pixels no DPI dado', () => {
		expect(mmToPx(25.4, 300)).toBe(300);
		expect(mmToPx(50.8, 150)).toBe(300);
	});

	it('deve arredondar para cima, para não faltar pixel na sangria', () => {
		// 10 mm a 300 DPI = 118,11 px
		expect(mmToPx(10, 300)).toBe(119);
	});
});

describe('PEDIDO_EXEMPLO', () => {
	it('deve escolher estilos e tamanho que existem no registry', () => {
		const { narrativeStyleId, photoStyleId, sizeId } = PEDIDO_EXEMPLO.choice;

		expect(() => resolveSkill('narrative-style', narrativeStyleId)).not.toThrow();
		expect(() => resolveSkill('photo-style', photoStyleId)).not.toThrow();
		expect(sizeId).toBe(MINI_SKU_PHOTO_PARAMS.sizeId);
	});

	it('deve trazer material suficiente para as 16 spreads do SKU mini', () => {
		expect(QUESTIONARIO_EXEMPLO.photos.length).toBeGreaterThanOrEqual(8);
		expect(QUESTIONARIO_EXEMPLO.milestones.length).toBeGreaterThanOrEqual(6);
		expect(QUESTIONARIO_EXEMPLO.trips.length).toBeGreaterThanOrEqual(3);
		expect(QUESTIONARIO_EXEMPLO.insideJokes.length).toBeGreaterThanOrEqual(3);
		expect(QUESTIONARIO_EXEMPLO.challenges.length).toBeGreaterThanOrEqual(1);
		expect(QUESTIONARIO_EXEMPLO.futurePlans.length).toBeGreaterThanOrEqual(1);
		expect(QUESTIONARIO_EXEMPLO.specialMessage.length).toBeGreaterThan(40);
		expect(QUESTIONARIO_EXEMPLO.howTheyMet.length).toBeGreaterThan(40);
	});

	it('deve dar um photoId único a cada foto — é a chave que junta foto, estilo e legenda', () => {
		expect(new Set(PEDIDO_EXEMPLO_PHOTO_IDS).size).toBe(PEDIDO_EXEMPLO_PHOTO_IDS.length);
		expect(PEDIDO_EXEMPLO_PHOTO_IDS).toEqual(
			QUESTIONARIO_EXEMPLO.photos.map((photo) => photo.photoId)
		);
	});

	it('não deve carregar URL assinada: ela expira em 10 min e o fixture é durável', () => {
		for (const photo of QUESTIONARIO_EXEMPLO.photos) {
			expect(photo.url).toBeUndefined();
		}
	});
});

describe('geometria e resolução do SKU mini', () => {
	it('deve descrever a página de produção: 150 mm finais + 3 mm de sangria por lado', () => {
		expect(MINI_SKU_LAYOUT.pageWidthMm - 2 * MINI_SKU_LAYOUT.bleedMm).toBe(150);
		expect(MINI_SKU_LAYOUT.pageHeightMm - 2 * MINI_SKU_LAYOUT.bleedMm).toBe(150);
	});

	it('deve derivar a resolução alvo da página com sangria, a 300 DPI', () => {
		expect(MINI_SKU_PHOTO_PARAMS.targetWidthPx).toBe(mmToPx(MINI_SKU_LAYOUT.pageWidthMm, 300));
		expect(MINI_SKU_PHOTO_PARAMS.targetWidthPx).toBe(1843);
		expect(MINI_SKU_PHOTO_PARAMS.targetHeightPx).toBe(MINI_SKU_PHOTO_PARAMS.targetWidthPx);
	});

	it('deve pedir menos que o teto de saída do pipeline', () => {
		expect(
			Math.max(MINI_SKU_PHOTO_PARAMS.targetWidthPx, MINI_SKU_PHOTO_PARAMS.targetHeightPx)
		).toBeLessThanOrEqual(PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX);
	});
});
