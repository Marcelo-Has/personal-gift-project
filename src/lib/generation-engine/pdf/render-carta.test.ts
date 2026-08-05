// @vitest-environment node
/**
 * Testes de `renderCartaSpreadToPdf` (F2-08b1, issue #127) contra os critérios de aceite:
 * PDF válido com uma página por `CartaPage`, dimensão física do SKU, texto extraível na
 * posição de `area`, fonte incorporada, determinismo. Mesmo estilo/motivo de
 * `@vitest-environment node` de `render-dedicatoria.test.ts` (worker falso do pdfjs-dist
 * quebra em `jsdom` na segunda chamada a `getDocument`).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderCartaSpreadToPdf } from './render-carta';
import { composeCarta } from '../../product-skills/layout-element/carta/compose';
import { MINI_SKU_LAYOUT } from '../../fixtures/pedido-exemplo';

/** Texto curto (uma página) — mesmo padrão de fixture fixa de `render-dedicatoria.test.ts`. */
const SHORT_LETTER_FIXTURE =
	'Escrevo essa carta para lembrar de tudo que vivemos juntos: a viagem à praia, as noites de jogos, e o dia em que você me pediu em casamento na varanda.';

/** Texto longo o bastante para o SKU mini precisar de duas páginas, sem ultrapassar
 * `MAX_PAGES` nem `MAX_LETTER_LENGTH` (~1500 caracteres, bem abaixo do teto de 3000). */
const LONG_LETTER_FIXTURE = Array.from(
	{ length: 18 },
	(_, i) => `Parágrafo número ${i + 1} da nossa história, cheio de memórias boas para lembrar sempre.`
).join(' ');

const TEXT_POSITION_TOLERANCE_MM = 8;
const PAGE_SIZE_TOLERANCE_MM = 0.5;

function pointsToMm(points: number): number {
	return (points / 72) * 25.4;
}

function hasEmbeddedFontProgram(pdfDoc: PDFDocument): boolean {
	for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
		if (
			obj instanceof PDFDict &&
			obj.get(PDFName.of('Type')) === PDFName.of('FontDescriptor') &&
			(obj.get(PDFName.of('FontFile')) ||
				obj.get(PDFName.of('FontFile2')) ||
				obj.get(PDFName.of('FontFile3')))
		) {
			return true;
		}
	}
	return false;
}

async function extractPageTextItems(pdfBytes: Uint8Array, pageNumber: number) {
	const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
	const pdf = await loadingTask.promise;
	try {
		const page = await pdf.getPage(pageNumber);
		const content = await page.getTextContent();
		return content.items as Array<{ str: string; hasEOL: boolean; transform: number[] }>;
	} finally {
		await loadingTask.destroy();
	}
}

function joinTextItems(items: Array<{ str: string; hasEOL: boolean }>): string {
	return items
		.map((item) => item.str + (item.hasEOL ? ' ' : ''))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
}

describe('renderCartaSpreadToPdf', () => {
	describe('carta de uma página', () => {
		const composition = composeCarta({ text: SHORT_LETTER_FIXTURE }, MINI_SKU_LAYOUT);
		let pdfBytes: Uint8Array;

		beforeAll(async () => {
			expect(composition.pageCount).toBe(1);
			pdfBytes = await renderCartaSpreadToPdf(composition, MINI_SKU_LAYOUT);
		}, 30_000);

		it('gera um PDF com uma página por CartaPage', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);
			expect(pdfDoc.getPageCount()).toBe(composition.pageCount);
		});

		it('o MediaBox da página corresponde à dimensão física do SKU mini', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);
			const { width, height } = pdfDoc.getPage(0).getSize();

			expect(pointsToMm(width)).toBeGreaterThan(MINI_SKU_LAYOUT.pageWidthMm - PAGE_SIZE_TOLERANCE_MM);
			expect(pointsToMm(width)).toBeLessThan(MINI_SKU_LAYOUT.pageWidthMm + PAGE_SIZE_TOLERANCE_MM);
			expect(pointsToMm(height)).toBeGreaterThan(
				MINI_SKU_LAYOUT.pageHeightMm - PAGE_SIZE_TOLERANCE_MM
			);
			expect(pointsToMm(height)).toBeLessThan(MINI_SKU_LAYOUT.pageHeightMm + PAGE_SIZE_TOLERANCE_MM);
		});

		it('a fonte usada está incorporada no PDF', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);
			expect(hasEmbeddedFontProgram(pdfDoc)).toBe(true);
		});

		it('o texto da carta aparece extraível na página correspondente', async () => {
			const items = await extractPageTextItems(pdfBytes, 1);
			expect(joinTextItems(items)).toBe(composition.pages[0].text);
		});

		it('o texto extraído ocupa aproximadamente a área de `area` (mm) da página', async () => {
			const items = await extractPageTextItems(pdfBytes, 1);
			expect(items.length).toBeGreaterThan(0);

			const { area } = composition.pages[0];
			for (const item of items) {
				const xMm = pointsToMm(item.transform[4]);
				const yMmFromTop = MINI_SKU_LAYOUT.pageHeightMm - pointsToMm(item.transform[5]);

				expect(xMm).toBeGreaterThanOrEqual(area.xMm - TEXT_POSITION_TOLERANCE_MM);
				expect(xMm).toBeLessThanOrEqual(area.xMm + area.widthMm + TEXT_POSITION_TOLERANCE_MM);
				expect(yMmFromTop).toBeGreaterThanOrEqual(area.yMm - TEXT_POSITION_TOLERANCE_MM);
				expect(yMmFromTop).toBeLessThanOrEqual(area.yMm + area.heightMm + TEXT_POSITION_TOLERANCE_MM);
			}
		});

		it('é determinística: a mesma composição renderizada de novo produz o mesmo texto e as mesmas dimensões', async () => {
			const secondRenderBytes = await renderCartaSpreadToPdf(composition, MINI_SKU_LAYOUT);

			const [firstItems, secondItems] = await Promise.all([
				extractPageTextItems(pdfBytes, 1),
				extractPageTextItems(secondRenderBytes, 1)
			]);
			expect(joinTextItems(secondItems)).toBe(joinTextItems(firstItems));

			const [firstDoc, secondDoc] = await Promise.all([
				PDFDocument.load(pdfBytes),
				PDFDocument.load(secondRenderBytes)
			]);
			expect(secondDoc.getPageCount()).toBe(firstDoc.getPageCount());
			expect(secondDoc.getPage(0).getSize()).toEqual(firstDoc.getPage(0).getSize());
		}, 30_000);
	});

	describe('carta multi-página', () => {
		const composition = composeCarta({ text: LONG_LETTER_FIXTURE }, MINI_SKU_LAYOUT);
		let pdfBytes: Uint8Array;

		beforeAll(async () => {
			expect(composition.pageCount).toBeGreaterThan(1);
			pdfBytes = await renderCartaSpreadToPdf(composition, MINI_SKU_LAYOUT);
		}, 30_000);

		it('gera uma página de PDF por CartaPage', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);
			expect(pdfDoc.getPageCount()).toBe(composition.pageCount);
		});

		it('cada página de PDF traz o texto correspondente à CartaPage de mesmo índice', async () => {
			for (const page of composition.pages) {
				const items = await extractPageTextItems(pdfBytes, page.pageIndex + 1);
				expect(joinTextItems(items)).toBe(page.text);
			}
		});
	});
});
