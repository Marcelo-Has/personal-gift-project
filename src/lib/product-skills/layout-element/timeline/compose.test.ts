import { describe, expect, it } from 'vitest';
import {
	composeTimeline,
	MAX_DESCRIPTION_LENGTH,
	MAX_ENTRIES_PER_SPREAD,
	MAX_TITLE_LENGTH,
	TimelineValidationError,
	type SkuLayoutParams,
	type TimelineMarkerInput
} from './compose';
import goldenSample01Input from './golden-samples/01-poucos-marcos/input.json';
import goldenSample01Output from './golden-samples/01-poucos-marcos/output.json';
import goldenSample02Input from './golden-samples/02-muitos-marcos/input.json';
import goldenSample02Output from './golden-samples/02-muitos-marcos/output.json';

interface GoldenSampleInput {
	entries: TimelineMarkerInput[];
	sku: SkuLayoutParams;
}

const GOLDEN_SAMPLES = [
	{ name: '01-poucos-marcos', input: goldenSample01Input, output: goldenSample01Output },
	{ name: '02-muitos-marcos', input: goldenSample02Input, output: goldenSample02Output }
];

describe('composeTimeline — golden samples (teste de estilo)', () => {
	for (const { name, input, output } of GOLDEN_SAMPLES) {
		it(`compõe ${name} igual à composição aprovada`, () => {
			const sample = input as GoldenSampleInput;
			const composition = composeTimeline(sample.entries, sample.sku);

			expect(composition).toEqual(output);
		});
	}
});

describe('composeTimeline — linha e marcadores', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};
	const baseEntries: TimelineMarkerInput[] = [
		{ title: 'Nos conhecemos', description: 'Num café perto da faculdade.' },
		{ title: 'Primeira viagem', description: 'Paraty, chuva o fim de semana todo.' },
		{ title: 'Casamento', description: 'Cerimônia pequena, só a família.' }
	];

	it('carimba id e versão da skill resolvida via resolveSkill', () => {
		const composition = composeTimeline(baseEntries, baseSku);

		expect(composition.skillId).toBe('timeline');
		expect(composition.skillVersion).toBe('1.0.0');
	});

	it('produz um marcador por entrada, na mesma ordem recebida', () => {
		const composition = composeTimeline(baseEntries, baseSku);

		expect(composition.markers).toHaveLength(baseEntries.length);
		expect(composition.markers.map((m) => m.title)).toEqual(baseEntries.map((e) => e.title));
	});

	it('alterna o lado do rótulo (above/below) marco a marco', () => {
		const composition = composeTimeline(baseEntries, baseSku);

		expect(composition.markers.map((m) => m.labelSide)).toEqual(['above', 'below', 'above']);
	});

	it('nunca invade a sangria nem a margem de segurança (linha e rótulos)', () => {
		const composition = composeTimeline(baseEntries, baseSku);
		const safeInset = baseSku.bleedMm + baseSku.safeMarginMm;
		const maxX = baseSku.pageWidthMm - safeInset;
		const maxY = baseSku.pageHeightMm - safeInset;

		expect(composition.line.xMm).toBeGreaterThanOrEqual(safeInset);
		expect(composition.line.xMm + composition.line.widthMm).toBeLessThanOrEqual(maxX + 1e-9);

		for (const marker of composition.markers) {
			const { xMm, yMm, widthMm, heightMm } = marker.labelArea;
			expect(xMm).toBeGreaterThanOrEqual(safeInset - 1e-9);
			expect(yMm).toBeGreaterThanOrEqual(safeInset - 1e-9);
			expect(xMm + widthMm).toBeLessThanOrEqual(maxX + 1e-9);
			expect(yMm + heightMm).toBeLessThanOrEqual(maxY + 1e-9);
		}
	});

	it('centraliza o único marcador quando há apenas uma entrada', () => {
		const composition = composeTimeline([baseEntries[0]], baseSku);
		const lineCenterX = composition.line.xMm + composition.line.widthMm / 2;

		expect(composition.markers[0].point.xMm).toBeCloseTo(lineCenterX, 9);
	});

	it('mesma entrada produz sempre a mesma composição (determinístico)', () => {
		const a = composeTimeline(baseEntries, baseSku);
		const b = composeTimeline(baseEntries, baseSku);

		expect(a).toEqual(b);
	});
});

describe('composeTimeline — lista vazia', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('aceita lista vazia e devolve markers: [] (composição válida, não é erro)', () => {
		const composition = composeTimeline([], baseSku);

		expect(composition.markers).toEqual([]);
		expect(composition.skillId).toBe('timeline');
		expect(composition.line).toBeDefined();
	});
});

describe('composeTimeline — excesso de marcos', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('aceita exatamente MAX_ENTRIES_PER_SPREAD marcos', () => {
		const entries: TimelineMarkerInput[] = Array.from({ length: MAX_ENTRIES_PER_SPREAD }, (_, i) => ({
			title: `Marco ${i}`,
			description: `Descrição do marco ${i}.`
		}));

		expect(() => composeTimeline(entries, baseSku)).not.toThrow();
	});

	it('rejeita mais que MAX_ENTRIES_PER_SPREAD marcos', () => {
		const entries: TimelineMarkerInput[] = Array.from(
			{ length: MAX_ENTRIES_PER_SPREAD + 1 },
			(_, i) => ({ title: `Marco ${i}`, description: `Descrição do marco ${i}.` })
		);

		expect(() => composeTimeline(entries, baseSku)).toThrow(TimelineValidationError);
		expect(() => composeTimeline(entries, baseSku)).toThrow(/excedem o máximo/);
	});
});

describe('composeTimeline — validação de título e descrição', () => {
	const baseSku: SkuLayoutParams = {
		pageWidthMm: 156,
		pageHeightMm: 156,
		bleedMm: 3,
		safeMarginMm: 5
	};

	it('aceita título e descrição exatamente no limite máximo', () => {
		const entries: TimelineMarkerInput[] = [
			{ title: 'a'.repeat(MAX_TITLE_LENGTH), description: 'b'.repeat(MAX_DESCRIPTION_LENGTH) }
		];

		expect(() => composeTimeline(entries, baseSku)).not.toThrow();
	});

	it('rejeita título acima do limite máximo', () => {
		const entries: TimelineMarkerInput[] = [
			{ title: 'a'.repeat(MAX_TITLE_LENGTH + 1), description: 'descrição válida' }
		];

		expect(() => composeTimeline(entries, baseSku)).toThrow(/título com \d+ caracteres excede/);
	});

	it('rejeita título vazio', () => {
		const entries: TimelineMarkerInput[] = [{ title: '', description: 'descrição válida' }];

		expect(() => composeTimeline(entries, baseSku)).toThrow(/título vazio/);
	});

	it('rejeita descrição acima do limite máximo', () => {
		const entries: TimelineMarkerInput[] = [
			{ title: 'título válido', description: 'b'.repeat(MAX_DESCRIPTION_LENGTH + 1) }
		];

		expect(() => composeTimeline(entries, baseSku)).toThrow(/descrição com \d+ caracteres excede/);
	});

	it('rejeita descrição vazia', () => {
		const entries: TimelineMarkerInput[] = [{ title: 'título válido', description: '' }];

		expect(() => composeTimeline(entries, baseSku)).toThrow(/descrição vazia/);
	});
});

describe('composeTimeline — validação do SKU', () => {
	it('rejeita SKU sem área útil (sangria + margem consomem a página inteira)', () => {
		const skuSemAreaUtil: SkuLayoutParams = {
			pageWidthMm: 20,
			pageHeightMm: 20,
			bleedMm: 8,
			safeMarginMm: 8
		};

		expect(() => composeTimeline([], skuSemAreaUtil)).toThrow(/área útil/);
	});
});
