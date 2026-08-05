import { describe, expect, it } from 'vitest';
import {
	composeCarta,
	CartaValidationError,
	MAX_LETTER_LENGTH,
	MAX_PAGES,
	type CartaInput,
	type SkuLayoutParams
} from './compose';
import goldenSample01Input from './golden-samples/01-carta-curta/input.json';
import goldenSample01Output from './golden-samples/01-carta-curta/output.json';
import goldenSample02Input from './golden-samples/02-carta-proxima-do-limite/input.json';
import goldenSample02Output from './golden-samples/02-carta-proxima-do-limite/output.json';

interface GoldenSampleInput {
	text: string;
	sku: SkuLayoutParams;
}

const GOLDEN_SAMPLES = [
	{ name: '01-carta-curta', input: goldenSample01Input, output: goldenSample01Output },
	{
		name: '02-carta-proxima-do-limite',
		input: goldenSample02Input,
		output: goldenSample02Output
	}
];

describe('composeCarta — golden samples (teste de estilo)', () => {
	for (const { name, input, output } of GOLDEN_SAMPLES) {
		it(`compõe ${name} igual à composição aprovada`, () => {
			const sample = input as GoldenSampleInput;
			const composition = composeCarta({ text: sample.text }, sample.sku);

			expect(composition).toEqual(output);
		});
	}
});

describe('composeCarta — páginas e área de texto', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('carimba id e versão da skill resolvida via resolveSkill', () => {
		const composition = composeCarta({ text: 'Te amo.' }, baseSku);

		expect(composition.skillId).toBe('carta');
		expect(composition.skillVersion).toBe('1.0.0');
	});

	it('texto curto cabe numa única página', () => {
		const composition = composeCarta({ text: 'Te amo mais do que tudo.' }, baseSku);

		expect(composition.pageCount).toBe(1);
		expect(composition.pages).toHaveLength(1);
		expect(composition.pages[0].pageIndex).toBe(0);
	});

	it('a área de texto nunca invade a sangria nem a margem de segurança', () => {
		const composition = composeCarta({ text: 'Te amo.' }, baseSku);
		const safeInset = baseSku.bleedMm + baseSku.safeMarginMm;
		const { xMm, yMm, widthMm, heightMm } = composition.pages[0].area;

		expect(xMm).toBeGreaterThanOrEqual(safeInset);
		expect(yMm).toBeGreaterThanOrEqual(safeInset);
		expect(xMm + widthMm).toBeLessThanOrEqual(baseSku.pageWidthMm - safeInset + 1e-9);
		expect(yMm + heightMm).toBeLessThanOrEqual(baseSku.pageHeightMm - safeInset + 1e-9);
	});

	it('mesmo texto produz sempre a mesma composição (determinístico)', () => {
		const a = composeCarta({ text: 'Nós dois, para sempre.' }, baseSku);
		const b = composeCarta({ text: 'Nós dois, para sempre.' }, baseSku);

		expect(a).toEqual(b);
	});

	it('texto que ultrapassa uma página pagina em até MAX_PAGES, quebrando em limite de palavra', () => {
		const words = Array.from({ length: 150 }, (_, i) => `palavra${i}`);
		const text = words.join(' ');
		const composition = composeCarta({ text }, baseSku);

		expect(composition.pageCount).toBeGreaterThan(1);
		expect(composition.pageCount).toBeLessThanOrEqual(MAX_PAGES);

		const rejoined = composition.pages.map((page) => page.text).join(' ');
		expect(rejoined).toBe(text);
		for (const page of composition.pages) {
			expect(text).toContain(page.text);
		}
	});
});

describe('composeCarta — texto que não cabe nem em MAX_PAGES páginas', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('rejeita carta no limite de 3000 caracteres que não cabe no SKU mini', () => {
		const words = Array.from({ length: 20 }, (_, i) => `palavra-longa-numero-${i}`);
		let text = '';
		while (text.length < MAX_LETTER_LENGTH) {
			text += (text.length === 0 ? '' : ' ') + words[text.length % words.length];
		}
		text = text.slice(0, MAX_LETTER_LENGTH);
		const input: CartaInput = { text };

		expect(() => composeCarta(input, baseSku)).toThrow(CartaValidationError);
		expect(() => composeCarta(input, baseSku)).toThrow(/acima do máximo de/);
	});
});

describe('composeCarta — validação do texto', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('aceita texto exatamente no limite máximo, quando cabe em MAX_PAGES páginas de um SKU maior', () => {
		const mediumSku: SkuLayoutParams = {
			pageWidthMm: 206,
			pageHeightMm: 206,
			bleedMm: 3,
			safeMarginMm: 6
		};
		const words = Array.from({ length: 500 }, (_, i) => `pal${i}`);
		const text = words.join(' ').slice(0, MAX_LETTER_LENGTH);

		expect(() => composeCarta({ text }, mediumSku)).not.toThrow();
	});

	it('rejeita texto acima do limite máximo', () => {
		const text = 'a'.repeat(MAX_LETTER_LENGTH + 1);

		expect(() => composeCarta({ text }, baseSku)).toThrow(CartaValidationError);
		expect(() => composeCarta({ text }, baseSku)).toThrow(/excede o máximo/);
	});

	it('rejeita texto vazio', () => {
		expect(() => composeCarta({ text: '' }, baseSku)).toThrow(/texto vazio/);
	});
});

describe('composeCarta — validação do SKU', () => {
	it('rejeita SKU sem área útil para o respiro da carta', () => {
		const skuSemAreaUtil: SkuLayoutParams = {
			pageWidthMm: 20,
			pageHeightMm: 20,
			bleedMm: 3,
			safeMarginMm: 3
		};

		expect(() => composeCarta({ text: 'Te amo.' }, skuSemAreaUtil)).toThrow(/área útil/);
	});
});
