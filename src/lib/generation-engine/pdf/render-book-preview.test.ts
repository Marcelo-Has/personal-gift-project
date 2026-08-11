// @vitest-environment node
/**
 * Testes de `renderBookPreviewPdf` (F2-09, issue #140) contra os critérios de aceite: a
 * ordem dos spreads no PDF de preview bate com `book.spreads`, o erro claro de
 * `RenderBookMissingStylizedPhotoError` quando falta a `StylizedPhoto` de um spread
 * `polaroid` (mesmo contrato de `renderBookToPdf`, F2-08c1), e a ausência de
 * `OutputIntents`/PDF/X-4 no resultado (exclusiva do PDF de produção, F2-08c2/#139).
 *
 * Fixture e técnica de verificação de ordem (texto extraído por página via `pdfjs-dist`)
 * copiadas de `render-book.test.ts` — mesma composição, módulo diferente sob teste.
 */
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Jimp, JimpMime } from 'jimp';
import { composeLayoutForOrder } from '../layout';
import { MINI_SKU_LAYOUT, mmToPx, PEDIDO_EXEMPLO } from '../../fixtures/pedido-exemplo';
import type { NarrativeBlocks } from '../../product-skills/narrative-style/romantico/generate';
import type { StylizedPhoto } from '../../product-skills/photo-style/provider';
import { renderBookPreviewPdf, RenderBookMissingStylizedPhotoError } from './render-book-preview';

/** Mesma narrativa de `render-book.test.ts`: os quatro tipos de spread (mais as variantes
 * abertura/capítulo/carta que reaproveitam a mesma composição — D-061). Só referencia
 * fotos de `PEDIDO_EXEMPLO`. */
const NARRATIVA_VALIDA: NarrativeBlocks = {
	opening: 'Helena e Tomás se conheceram numa festa e nunca mais se separaram.',
	chapters: [
		{
			title: 'A varanda',
			text: 'Ficaram na varanda a noite toda porque a música estava alta demais lá dentro.'
		},
		{
			title: 'A feira de domingo',
			text: 'Viraram fregueses do mesmo barraquinho de pastel por seis anos seguidos.'
		}
	],
	polaroidCaptions: [
		{ photoId: 'foto-01-varanda', caption: 'Onde tudo começou.' },
		{ photoId: 'foto-06-cachorro', caption: 'A chegada da Vitória.' }
	],
	timeline: [
		{ title: 'Primeiro encontro', description: 'A festa na varanda.' },
		{ title: 'Chegada da Vitória', description: 'A cachorra que ninguém queria.' }
	],
	finalLetter: 'Helena e Tomás, que a história continue sendo escrita.',
	dedication: 'Para Helena e Tomás.'
};

/** Gera uma `StylizedPhoto` de fixture (PNG sólido, via `jimp`) grande o bastante para
 * alcançar 300+ DPI em qualquer área de destino dentro da página do SKU mini (156×156mm),
 * mesmo racional de `render-polaroid.test.ts`. */
async function makeStylizedPhoto(photoId: string): Promise<StylizedPhoto> {
	const sidePx = mmToPx(MINI_SKU_LAYOUT.pageWidthMm);
	const image = new Jimp({ width: sidePx, height: sidePx, color: 0x336699ff });
	const data = await image.getBuffer(JimpMime.png);

	return {
		sourcePhotoId: photoId,
		data: new Uint8Array(data),
		metadata: { widthPx: sidePx, heightPx: sidePx, dpi: 300, format: 'png' }
	};
}

async function buildBookAndPhotos() {
	const placeholderPhotos: StylizedPhoto[] = NARRATIVA_VALIDA.polaroidCaptions.map((caption) => ({
		sourcePhotoId: caption.photoId,
		data: new Uint8Array(),
		metadata: { widthPx: 1843, heightPx: 1843, dpi: 300, format: 'png' as const }
	}));
	const book = composeLayoutForOrder(PEDIDO_EXEMPLO, NARRATIVA_VALIDA, placeholderPhotos);

	const renderablePhotos = await Promise.all(
		NARRATIVA_VALIDA.polaroidCaptions.map((caption) => makeStylizedPhoto(caption.photoId))
	);

	return { book, renderablePhotos };
}

/** Junta os itens de texto extraídos de uma página, inserindo espaço onde o navegador
 * quebrou linha (`hasEOL`) — mesma técnica de `render-book.test.ts`. */
function joinTextItems(items: Array<{ str: string; hasEOL: boolean }>): string {
	return items
		.map((item) => item.str + (item.hasEOL ? ' ' : ''))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
}

async function extractTextPerPage(pdfBytes: Uint8Array): Promise<string[]> {
	const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
	const pdf = await loadingTask.promise;
	try {
		const pages: string[] = [];
		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
			const page = await pdf.getPage(pageNumber);
			const textContent = await page.getTextContent();
			pages.push(joinTextItems(textContent.items as Array<{ str: string; hasEOL: boolean }>));
		}
		return pages;
	} finally {
		await loadingTask.destroy();
	}
}

describe('renderBookPreviewPdf — caminho feliz', () => {
	it('mantém a ordem das páginas igual à ordem dos spreads do livro', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();

		const pdfBytes = await renderBookPreviewPdf(book, renderablePhotos, MINI_SKU_LAYOUT);
		const pageTexts = await extractTextPerPage(pdfBytes);

		expect(pageTexts).toHaveLength(book.totalPages);
		// abertura
		expect(pageTexts[0]).toContain(NARRATIVA_VALIDA.opening);
		// capítulos (cada um 1 página nesta fixture)
		expect(pageTexts[1]).toContain(NARRATIVA_VALIDA.chapters[0].title);
		expect(pageTexts[1]).toContain(NARRATIVA_VALIDA.chapters[0].text);
		expect(pageTexts[2]).toContain(NARRATIVA_VALIDA.chapters[1].title);
		expect(pageTexts[2]).toContain(NARRATIVA_VALIDA.chapters[1].text);
		// polaroids, na ordem das legendas
		expect(pageTexts[3]).toContain(NARRATIVA_VALIDA.polaroidCaptions[0].caption);
		expect(pageTexts[4]).toContain(NARRATIVA_VALIDA.polaroidCaptions[1].caption);
		// timeline
		expect(pageTexts[5]).toContain(NARRATIVA_VALIDA.timeline[0].title);
		expect(pageTexts[5]).toContain(NARRATIVA_VALIDA.timeline[1].title);
		// carta final
		expect(pageTexts[6]).toContain(NARRATIVA_VALIDA.finalLetter);
		// dedicatória final
		expect(pageTexts[7]).toContain(NARRATIVA_VALIDA.dedication);
	}, 30_000);

	it('não contém OutputIntents/PDF-X4 (exclusivo do PDF de produção, F2-08c2/#139)', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();

		const pdfBytes = await renderBookPreviewPdf(book, renderablePhotos, MINI_SKU_LAYOUT);
		const pdfDoc = await PDFDocument.load(pdfBytes);

		expect(pdfDoc.catalog.has(PDFName.of('OutputIntents'))).toBe(false);
	}, 30_000);
});

describe('renderBookPreviewPdf — erros descritivos', () => {
	it('lança RenderBookMissingStylizedPhotoError quando falta a StylizedPhoto de um spread polaroid', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();
		const semAPrimeiraFoto = renderablePhotos.filter(
			(photo) => photo.sourcePhotoId !== 'foto-01-varanda'
		);

		await expect(renderBookPreviewPdf(book, semAPrimeiraFoto, MINI_SKU_LAYOUT)).rejects.toThrow(
			RenderBookMissingStylizedPhotoError
		);
		await expect(renderBookPreviewPdf(book, semAPrimeiraFoto, MINI_SKU_LAYOUT)).rejects.toThrow(
			/foto-01-varanda/
		);
	}, 30_000);
});
