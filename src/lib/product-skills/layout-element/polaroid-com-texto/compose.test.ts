import { describe, expect, it } from 'vitest';
import {
	composePolaroidComTexto,
	MAX_CAPTION_LENGTH,
	PolaroidComTextoValidationError,
	type PolaroidComTextoInput,
	type SkuLayoutParams
} from './compose';
import goldenSample01Input from './golden-samples/01-retrato-mini/input.json';
import goldenSample01Output from './golden-samples/01-retrato-mini/output.json';
import goldenSample02Input from './golden-samples/02-paisagem-medio/input.json';
import goldenSample02Output from './golden-samples/02-paisagem-medio/output.json';

interface GoldenSampleInput {
	image: { path: string; widthPx: number; heightPx: number };
	caption: string;
	sku: SkuLayoutParams;
}

const GOLDEN_SAMPLES = [
	{ name: '01-retrato-mini', input: goldenSample01Input, output: goldenSample01Output },
	{ name: '02-paisagem-medio', input: goldenSample02Input, output: goldenSample02Output }
];

describe('composePolaroidComTexto — golden samples (teste de estilo)', () => {
	for (const { name, input, output } of GOLDEN_SAMPLES) {
		it(`compõe ${name} igual à composição aprovada`, () => {
			const sample = input as GoldenSampleInput;
			const composition = composePolaroidComTexto(
				{ image: sample.image, caption: sample.caption },
				sample.sku
			);

			expect(composition).toEqual(output);
		});
	}
});

describe('composePolaroidComTexto — moldura e legenda', () => {
	const baseImage = { path: 'fixtures/foto.jpg', widthPx: 1200, heightPx: 1200 };
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('carimba id e versão da skill resolvida via resolveSkill', () => {
		const composition = composePolaroidComTexto({ image: baseImage, caption: 'Nós dois.' }, baseSku);

		expect(composition.skillId).toBe('polaroid-com-texto');
		expect(composition.skillVersion).toBe('1.0.0');
	});

	it('a moldura nunca invade a sangria nem a margem de segurança', () => {
		const composition = composePolaroidComTexto({ image: baseImage, caption: 'Nós dois.' }, baseSku);
		const safeInset = baseSku.bleedMm + baseSku.safeMarginMm;
		const { xMm, yMm, widthMm, heightMm } = composition.frame.area;

		expect(xMm).toBeGreaterThanOrEqual(safeInset);
		expect(yMm).toBeGreaterThanOrEqual(safeInset);
		expect(xMm + widthMm).toBeLessThanOrEqual(baseSku.pageWidthMm - safeInset + 1e-9);
		expect(yMm + heightMm).toBeLessThanOrEqual(baseSku.pageHeightMm - safeInset + 1e-9);
	});

	it('encolhe a moldura (ajuste "contain") para foto retrato caber num SKU quadrado', () => {
		const retrato = { path: 'fixtures/retrato.jpg', widthPx: 1200, heightPx: 1600 };
		const composition = composePolaroidComTexto({ image: retrato, caption: 'Retrato.' }, baseSku);
		const usableHeight = baseSku.pageHeightMm - 2 * (baseSku.bleedMm + baseSku.safeMarginMm);

		expect(composition.frame.area.heightMm).toBeLessThanOrEqual(usableHeight);
	});

	it('mesma legenda produz sempre a mesma inclinação (determinístico)', () => {
		const a = composePolaroidComTexto({ image: baseImage, caption: 'Nós dois.' }, baseSku);
		const b = composePolaroidComTexto({ image: baseImage, caption: 'Nós dois.' }, baseSku);

		expect(a.frame.rotationDeg).toBe(b.frame.rotationDeg);
	});

	it('legendas diferentes tendem a inclinações diferentes', () => {
		const a = composePolaroidComTexto({ image: baseImage, caption: 'Nós dois.' }, baseSku);
		const b = composePolaroidComTexto({ image: baseImage, caption: 'Para sempre juntos.' }, baseSku);

		expect(a.frame.rotationDeg).not.toBe(b.frame.rotationDeg);
	});
});

describe('composePolaroidComTexto — validação da legenda', () => {
	const baseImage = { path: 'fixtures/foto.jpg', widthPx: 1200, heightPx: 1200 };
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('aceita legenda exatamente no limite máximo', () => {
		const caption = 'a'.repeat(MAX_CAPTION_LENGTH);

		expect(() =>
			composePolaroidComTexto({ image: baseImage, caption }, baseSku)
		).not.toThrow();
	});

	it('rejeita legenda acima do limite máximo', () => {
		const caption = 'a'.repeat(MAX_CAPTION_LENGTH + 1);
		const input: PolaroidComTextoInput = { image: baseImage, caption };

		expect(() => composePolaroidComTexto(input, baseSku)).toThrow(PolaroidComTextoValidationError);
		expect(() => composePolaroidComTexto(input, baseSku)).toThrow(/excede o máximo/);
	});

	it('rejeita legenda vazia', () => {
		expect(() =>
			composePolaroidComTexto({ image: baseImage, caption: '' }, baseSku)
		).toThrow(/legenda vazia/);
	});
});

describe('composePolaroidComTexto — validação do SKU', () => {
	const baseImage = { path: 'fixtures/foto.jpg', widthPx: 1200, heightPx: 1200 };

	it('rejeita SKU sem área útil (sangria + margem consomem a página inteira)', () => {
		const skuSemAreaUtil: SkuLayoutParams = {
			pageWidthMm: 20,
			pageHeightMm: 20,
			bleedMm: 8,
			safeMarginMm: 8
		};

		expect(() =>
			composePolaroidComTexto({ image: baseImage, caption: 'Nós dois.' }, skuSemAreaUtil)
		).toThrow(/área útil/);
	});
});
