import { describe, expect, it } from 'vitest';
import {
	composeDedicatoria,
	DedicatoriaValidationError,
	MAX_DEDICATION_LENGTH,
	type DedicatoriaInput,
	type SkuLayoutParams
} from './compose';
import goldenSample01Input from './golden-samples/01-curta/input.json';
import goldenSample01Output from './golden-samples/01-curta/output.json';
import goldenSample02Input from './golden-samples/02-proxima-do-limite/input.json';
import goldenSample02Output from './golden-samples/02-proxima-do-limite/output.json';

interface GoldenSampleInput {
	dedication: string;
	sku: SkuLayoutParams;
}

const GOLDEN_SAMPLES = [
	{ name: '01-curta', input: goldenSample01Input, output: goldenSample01Output },
	{ name: '02-proxima-do-limite', input: goldenSample02Input, output: goldenSample02Output }
];

describe('composeDedicatoria — golden samples (teste de estilo)', () => {
	for (const { name, input, output } of GOLDEN_SAMPLES) {
		it(`compõe ${name} igual à composição aprovada`, () => {
			const sample = input as GoldenSampleInput;
			const composition = composeDedicatoria({ dedication: sample.dedication }, sample.sku);

			expect(composition).toEqual(output);
		});
	}
});

describe('composeDedicatoria — bloco de texto', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('carimba id e versão da skill resolvida via resolveSkill', () => {
		const composition = composeDedicatoria({ dedication: 'Para sempre, vocês dois.' }, baseSku);

		expect(composition.skillId).toBe('dedicatoria');
		expect(composition.skillVersion).toBe('1.0.0');
	});

	it('o bloco de texto nunca invade a sangria nem a margem de segurança', () => {
		const composition = composeDedicatoria({ dedication: 'Para sempre, vocês dois.' }, baseSku);
		const safeInset = baseSku.bleedMm + baseSku.safeMarginMm;
		const { xMm, yMm, widthMm, heightMm } = composition.text.area;

		expect(xMm).toBeGreaterThanOrEqual(safeInset);
		expect(yMm).toBeGreaterThanOrEqual(safeInset);
		expect(xMm + widthMm).toBeLessThanOrEqual(baseSku.pageWidthMm - safeInset + 1e-9);
		expect(yMm + heightMm).toBeLessThanOrEqual(baseSku.pageHeightMm - safeInset + 1e-9);
	});

	it('o bloco de texto é centralizado na área útil da página', () => {
		const composition = composeDedicatoria({ dedication: 'Para sempre, vocês dois.' }, baseSku);
		const { page, text } = composition;

		const pageCenterX = page.area.xMm + page.area.widthMm / 2;
		const pageCenterY = page.area.yMm + page.area.heightMm / 2;
		const textCenterX = text.area.xMm + text.area.widthMm / 2;
		const textCenterY = text.area.yMm + text.area.heightMm / 2;

		expect(textCenterX).toBeCloseTo(pageCenterX, 6);
		expect(textCenterY).toBeCloseTo(pageCenterY, 6);
	});

	it('texto mais longo produz um bloco mais alto que um texto curto', () => {
		const curto = composeDedicatoria({ dedication: 'Para sempre.' }, baseSku);
		const longo = composeDedicatoria(
			{ dedication: 'Para sempre, com todo o meu amor, hoje e em todos os dias que ainda vamos viver juntos, lado a lado, na alegria e na saudade, sempre.' },
			baseSku
		);

		expect(longo.text.area.heightMm).toBeGreaterThan(curto.text.area.heightMm);
	});
});

describe('composeDedicatoria — validação do texto', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('aceita texto exatamente no limite máximo de caracteres que cabe no SKU', () => {
		const dedication = 'a '.repeat(MAX_DEDICATION_LENGTH / 2).trim();

		expect(dedication.length).toBeLessThanOrEqual(MAX_DEDICATION_LENGTH);
		expect(() => composeDedicatoria({ dedication }, baseSku)).not.toThrow();
	});

	it('rejeita texto acima do limite máximo de caracteres', () => {
		const dedication = 'a'.repeat(MAX_DEDICATION_LENGTH + 1);
		const input: DedicatoriaInput = { dedication };

		expect(() => composeDedicatoria(input, baseSku)).toThrow(DedicatoriaValidationError);
		expect(() => composeDedicatoria(input, baseSku)).toThrow(/excede o máximo/);
	});

	it('rejeita texto vazio', () => {
		expect(() => composeDedicatoria({ dedication: '' }, baseSku)).toThrow(/texto vazio/);
	});

	it('rejeita texto dentro do limite de caracteres cujo bloco estimado não cabe no SKU', () => {
		const dedication = 'a '.repeat(MAX_DEDICATION_LENGTH / 2).trim();
		const skuMinusculo: SkuLayoutParams = {
			pageWidthMm: 40,
			pageHeightMm: 40,
			bleedMm: 3,
			safeMarginMm: 5
		};

		expect(() => composeDedicatoria({ dedication }, skuMinusculo)).toThrow(
			DedicatoriaValidationError
		);
		expect(() => composeDedicatoria({ dedication }, skuMinusculo)).toThrow(
			/não cabe no espaço disponível/
		);
	});
});

describe('composeDedicatoria — validação do SKU', () => {
	it('rejeita SKU sem área útil (sangria + margem consomem a página inteira)', () => {
		const skuSemAreaUtil: SkuLayoutParams = {
			pageWidthMm: 20,
			pageHeightMm: 20,
			bleedMm: 8,
			safeMarginMm: 8
		};

		expect(() => composeDedicatoria({ dedication: 'Para sempre.' }, skuSemAreaUtil)).toThrow(
			/área útil/
		);
	});
});
