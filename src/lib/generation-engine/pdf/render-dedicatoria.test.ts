// @vitest-environment node
/**
 * Testes de `renderDedicatoriaSpreadToPdf` (F2-08a, issue #125) contra os critérios de
 * aceite: PDF válido, `MediaBox` na dimensão física do SKU mini, texto extraível na
 * posição esperada e fonte incorporada.
 *
 * `@vitest-environment node` (em vez do `jsdom` padrão do projeto): o "worker falso" que
 * `pdfjs-dist` usa em ambiente sem `Worker` de verdade quebra com `DataCloneError` na
 * segunda chamada a `getDocument` dentro do `jsdom` deste projeto — mesma extração roda
 * limpa em Node puro. Não afeta os outros arquivos de teste, só este.
 *
 * Não é golden sample no sentido de `.claude/rules/product-skills.md` (que trava a SAÍDA
 * de uma skill de `product-skills/` contra regressão de estilo, byte a byte via JSON) —
 * este módulo não é uma skill, e o PDF gerado por um browser real não é estável byte a
 * byte entre execuções (metadados/timestamp/subset de fonte do Chrome variam). O
 * "fixture determinístico" exigido pela issue é verificado de outra forma: a mesma
 * composição de entrada produz, em duas renderizações, o mesmo texto extraído e as
 * mesmas dimensões — a garantia que importa (conteúdo e geometria), sem comparar bytes.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderDedicatoriaSpreadToPdf } from './render-dedicatoria';
import { composeDedicatoria } from '../../product-skills/layout-element/dedicatoria/compose';
import { MINI_SKU_LAYOUT } from '../../fixtures/pedido-exemplo';

/** Texto fixo de entrada — mesma composição em todo o arquivo, para o teste de
 * determinismo do fim do arquivo (mesma entrada → mesmo resultado verificável). */
const DEDICATION_FIXTURE = 'Para sempre, vocês dois — obrigado por ficar na varanda comigo.';

/** Tolerância de posição (mm) para o teste de área do texto: cobre a diferença entre a
 * estimativa de largura de caractere que `composeDedicatoria` usa para calcular
 * `text.area` (`AVG_CHAR_WIDTH_MM`, uma constante fixa) e a métrica real da fonte Lora no
 * Chrome — a issue pede "aproximadamente", não pixel a pixel. */
const TEXT_POSITION_TOLERANCE_MM = 8;

/** Tolerância de dimensão de página (mm): a conversão de `156mm` para pontos (72 dpi) e
 * de volta para mm no `MediaBox` perde uma fração de mm de arredondamento. */
const PAGE_SIZE_TOLERANCE_MM = 0.5;

function pointsToMm(points: number): number {
	return (points / 72) * 25.4;
}

/** Verifica se o PDF carregado tem pelo menos um `FontDescriptor` com programa de fonte
 * embutido (`FontFile`/`FontFile2`/`FontFile3`) — sinal de que a fonte foi incorporada,
 * não apenas referenciada pelo nome (que dependeria de fonte instalada no leitor). */
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

async function extractTextItems(pdfBytes: Uint8Array) {
	// `getDocument` transfere (detach) o `ArrayBuffer` de `data` para o worker interno do
	// pdfjs-dist — reusar o mesmo `Uint8Array` numa segunda chamada (ex.: o teste de
	// determinismo comparando duas extrações) falha com `DataCloneError` porque o buffer
	// original já foi neutralizado. `.slice()` copia para um buffer novo antes de cada uso.
	const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
	const pdf = await loadingTask.promise;
	try {
		const page = await pdf.getPage(1);
		const content = await page.getTextContent();
		return content.items as Array<{ str: string; hasEOL: boolean; transform: number[] }>;
	} finally {
		// Sem isso, a próxima chamada a `getDocument` no mesmo processo falha com
		// `DataCloneError` — o worker falso do pdfjs-dist em Node precisa liberar o
		// documento anterior antes de aceitar outro.
		await loadingTask.destroy();
	}
}

/** Junta os itens de texto extraídos do PDF, inserindo espaço onde o navegador quebrou
 * linha (`hasEOL`) — o texto de dedicatória pode ocupar mais de uma linha, e o Chrome não
 * grava um espaço explícito no fim de uma linha quebrada por largura. */
function joinTextItems(items: Array<{ str: string; hasEOL: boolean }>): string {
	return items
		.map((item) => item.str + (item.hasEOL ? ' ' : ''))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
}

describe('renderDedicatoriaSpreadToPdf', () => {
	const composition = composeDedicatoria({ dedication: DEDICATION_FIXTURE }, MINI_SKU_LAYOUT);
	let pdfBytes: Uint8Array;

	beforeAll(async () => {
		pdfBytes = await renderDedicatoriaSpreadToPdf(composition, MINI_SKU_LAYOUT);
	}, 30_000);

	it('gera um PDF de uma página que abre num leitor de PDF (pdf-lib carrega sem erro)', async () => {
		const pdfDoc = await PDFDocument.load(pdfBytes);

		expect(pdfDoc.getPageCount()).toBe(1);
	});

	it('o MediaBox da página corresponde a 156x156mm (SKU mini, sangria incluída)', async () => {
		const pdfDoc = await PDFDocument.load(pdfBytes);
		const { width, height } = pdfDoc.getPage(0).getSize();

		expect(pointsToMm(width)).toBeGreaterThan(MINI_SKU_LAYOUT.pageWidthMm - PAGE_SIZE_TOLERANCE_MM);
		expect(pointsToMm(width)).toBeLessThan(MINI_SKU_LAYOUT.pageWidthMm + PAGE_SIZE_TOLERANCE_MM);
		expect(pointsToMm(height)).toBeGreaterThan(
			MINI_SKU_LAYOUT.pageHeightMm - PAGE_SIZE_TOLERANCE_MM
		);
		expect(pointsToMm(height)).toBeLessThan(MINI_SKU_LAYOUT.pageHeightMm + PAGE_SIZE_TOLERANCE_MM);
	});

	it('a fonte usada está incorporada no PDF (programa de fonte embutido, não só referenciado)', async () => {
		const pdfDoc = await PDFDocument.load(pdfBytes);

		expect(hasEmbeddedFontProgram(pdfDoc)).toBe(true);
	});

	it('o texto da dedicatória aparece no PDF como texto extraível (não só visual)', async () => {
		const items = await extractTextItems(pdfBytes);
		const extractedText = joinTextItems(items);

		expect(extractedText).toBe(DEDICATION_FIXTURE.replace(/\s+/g, ' ').trim());
	});

	it('o texto extraído ocupa aproximadamente a área de `text.area` (mm) da composição', async () => {
		const items = await extractTextItems(pdfBytes);
		expect(items.length).toBeGreaterThan(0);

		const { area } = composition.text;
		for (const item of items) {
			const xMm = pointsToMm(item.transform[4]);
			// pdf-lib/pdfjs usam origem no canto inferior esquerdo (y cresce para cima);
			// `text.area` usa origem no canto superior (y cresce para baixo, como o resto
			// do motor de layout) — converte para o mesmo referencial antes de comparar.
			const yMmFromTop = MINI_SKU_LAYOUT.pageHeightMm - pointsToMm(item.transform[5]);

			expect(xMm).toBeGreaterThanOrEqual(area.xMm - TEXT_POSITION_TOLERANCE_MM);
			expect(xMm).toBeLessThanOrEqual(area.xMm + area.widthMm + TEXT_POSITION_TOLERANCE_MM);
			expect(yMmFromTop).toBeGreaterThanOrEqual(area.yMm - TEXT_POSITION_TOLERANCE_MM);
			expect(yMmFromTop).toBeLessThanOrEqual(area.yMm + area.heightMm + TEXT_POSITION_TOLERANCE_MM);
		}
	});

	it('é determinística no conteúdo e na geometria: a mesma composição renderizada de novo produz o mesmo texto e as mesmas dimensões', async () => {
		const secondRenderBytes = await renderDedicatoriaSpreadToPdf(composition, MINI_SKU_LAYOUT);

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
