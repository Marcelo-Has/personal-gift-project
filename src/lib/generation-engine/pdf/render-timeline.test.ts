// @vitest-environment node
/**
 * Testes de `renderTimelineSpreadToPdf` (F2-08b1, issue #127) contra os critérios de
 * aceite: PDF válido de uma página com a linha visível e cada marcador (título +
 * descrição) extraível na posição de `labelArea`, `markers` vazio sem erro, fonte
 * incorporada, determinismo. Mesmo motivo de `@vitest-environment node` de
 * `render-dedicatoria.test.ts`.
 *
 * "Linha visível" não é verificado por comparação de pixel (mesma decisão de não usar
 * golden sample byte-a-byte de `render-dedicatoria.test.ts`): usa a lista de operadores do
 * `pdfjs-dist` (`page.getOperatorList()`, API pública, já usada internamente por
 * `getTextContent`) para confirmar que a página tem pelo menos um preenchimento vetorial
 * (`OPS.fill`/`OPS.eoFill`) além do texto dos rótulos — sinal de que a linha (e os pontos
 * de marcador) foram de fato desenhados, não só declarados na composição de entrada.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderTimelineSpreadToPdf } from './render-timeline';
import { composeTimeline } from '../../product-skills/layout-element/timeline/compose';
import { MINI_SKU_LAYOUT } from '../../fixtures/pedido-exemplo';

const MARKERS_FIXTURE = [
	{ title: 'Primeiro encontro', description: 'No café perto da faculdade, em uma tarde de chuva.' },
	{ title: 'Primeira viagem', description: 'Fim de semana na praia, só nós dois e o som do mar.' },
	{ title: 'Pedido de namoro', description: 'No topo da colina, ao pôr do sol de domingo.' }
];

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

async function loadPdfPage(pdfBytes: Uint8Array) {
	const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
	const pdf = await loadingTask.promise;
	const page = await pdf.getPage(1);
	return { pdf, page, loadingTask };
}

async function extractTextItems(pdfBytes: Uint8Array) {
	const { page, loadingTask } = await loadPdfPage(pdfBytes);
	try {
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

/** `pdfjs-dist` não expõe `fill`/`eoFill` como entradas soltas de `fnArray` — o Chrome
 * emite um único `constructPath` por retângulo preenchido, cujo primeiro argumento é o
 * código do próprio operador de pintura (`fill`/`eoFill`/`fillStroke`/`eoFillStroke`).
 * Confirmado inspecionando `getOperatorList()` de um PDF mínimo com um `<div>` de
 * `background` sólido gerado pelo mesmo mecanismo (`page.pdf()` do `playwright-core`). */
async function hasVectorFill(pdfBytes: Uint8Array): Promise<boolean> {
	const fillOps = new Set([
		pdfjsLib.OPS.fill,
		pdfjsLib.OPS.eoFill,
		pdfjsLib.OPS.fillStroke,
		pdfjsLib.OPS.eoFillStroke
	]);
	const { page, loadingTask } = await loadPdfPage(pdfBytes);
	try {
		const operatorList = await page.getOperatorList();
		return operatorList.fnArray.some(
			(fn, i) => fn === pdfjsLib.OPS.constructPath && fillOps.has(operatorList.argsArray[i][0])
		);
	} finally {
		await loadingTask.destroy();
	}
}

describe('renderTimelineSpreadToPdf', () => {
	describe('com marcadores', () => {
		const composition = composeTimeline(MARKERS_FIXTURE, MINI_SKU_LAYOUT);
		let pdfBytes: Uint8Array;

		beforeAll(async () => {
			pdfBytes = await renderTimelineSpreadToPdf(composition, MINI_SKU_LAYOUT);
		}, 30_000);

		it('gera um PDF de uma página que abre num leitor de PDF', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);
			expect(pdfDoc.getPageCount()).toBe(1);
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

		it('a linha do tempo é desenhada como conteúdo vetorial (preenchimento), não só declarada na composição', async () => {
			expect(await hasVectorFill(pdfBytes)).toBe(true);
		});

		it('título e descrição de cada marcador aparecem como texto extraível', async () => {
			const items = await extractTextItems(pdfBytes);
			const extractedText = joinTextItems(items);

			for (const marker of MARKERS_FIXTURE) {
				expect(extractedText).toContain(marker.title);
				expect(extractedText).toContain(marker.description);
			}
		});

		it('o rótulo de cada marcador ocupa aproximadamente a área de `labelArea` (mm)', async () => {
			const items = await extractTextItems(pdfBytes);
			expect(items.length).toBeGreaterThan(0);

			for (const item of items) {
				const xMm = pointsToMm(item.transform[4]);
				const yMmFromTop = MINI_SKU_LAYOUT.pageHeightMm - pointsToMm(item.transform[5]);

				const withinSomeLabel = composition.markers.some(({ labelArea }) => {
					return (
						xMm >= labelArea.xMm - TEXT_POSITION_TOLERANCE_MM &&
						xMm <= labelArea.xMm + labelArea.widthMm + TEXT_POSITION_TOLERANCE_MM &&
						yMmFromTop >= labelArea.yMm - TEXT_POSITION_TOLERANCE_MM &&
						yMmFromTop <= labelArea.yMm + labelArea.heightMm + TEXT_POSITION_TOLERANCE_MM
					);
				});
				expect(withinSomeLabel).toBe(true);
			}
		});

		it('é determinística: a mesma composição renderizada de novo produz o mesmo texto e as mesmas dimensões', async () => {
			const secondRenderBytes = await renderTimelineSpreadToPdf(composition, MINI_SKU_LAYOUT);

			const [firstItems, secondItems] = await Promise.all([
				extractTextItems(pdfBytes),
				extractTextItems(secondRenderBytes)
			]);
			expect(joinTextItems(secondItems)).toBe(joinTextItems(firstItems));

			const [firstDoc, secondDoc] = await Promise.all([
				PDFDocument.load(pdfBytes),
				PDFDocument.load(secondRenderBytes)
			]);
			expect(secondDoc.getPage(0).getSize()).toEqual(firstDoc.getPage(0).getSize());
		}, 30_000);
	});

	describe('sem marcadores (markers vazio)', () => {
		const composition = composeTimeline([], MINI_SKU_LAYOUT);
		let pdfBytes: Uint8Array;

		beforeAll(async () => {
			expect(composition.markers).toEqual([]);
			pdfBytes = await renderTimelineSpreadToPdf(composition, MINI_SKU_LAYOUT);
		}, 30_000);

		it('gera um PDF válido de uma página, sem lançar erro', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);
			expect(pdfDoc.getPageCount()).toBe(1);
		});

		it('a linha continua desenhada mesmo sem marcadores', async () => {
			expect(await hasVectorFill(pdfBytes)).toBe(true);
		});

		it('não há texto de rótulo (nenhum marcador)', async () => {
			const items = await extractTextItems(pdfBytes);
			expect(joinTextItems(items)).toBe('');
		});
	});
});
