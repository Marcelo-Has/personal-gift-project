// @vitest-environment node
/**
 * Testes de `renderBookToPdf` (F2-08c1, issue #133) contra os critérios de aceite: a
 * partir de um `GeneratedBook` com os quatro tipos de spread (`dedicatoria`/`carta`/
 * `polaroid`/`timeline`, incluindo as variantes `abertura`/`capitulo` que reaproveitam as
 * mesmas composições — D-061 em `layout.ts`), o PDF final tem o número de páginas esperado
 * (soma de `pageCount` dos spreads) e a ORDEM das páginas bate com a ordem de
 * `book.spreads` — verificado via texto extraído por página com `pdfjs-dist`, mesma
 * técnica de `render-timeline.test.ts`/[D-063] (`page.getTextContent()`, sem golden sample
 * byte-a-byte). `@vitest-environment node`, mesmo racional de `render-dedicatoria.test.ts`.
 *
 * Fixture de foto: gerada em memória via `jimp` a 300+ DPI para a área de destino do SKU
 * mini (156×156mm, `MINI_SKU_LAYOUT`), mesmo padrão de `render-polaroid.test.ts` — sem
 * fixture binária versionada nem chamada real ao provedor de imagem.
 *
 * Também cobre a conformidade PDF/X-4 (F2-08c2, issue #139, `pdfx4.ts`): presença de
 * `OutputIntent`/perfil ICC (`icc-srgb.ts`) e dos metadados XMP mínimos, verificada
 * programaticamente via os objetos de baixo nível de `pdf-lib` (`PDFContext.lookup`,
 * `decodePDFRawStream`) — sem validação humana/gráfica externa, conforme exigido pela
 * issue.
 */
import { describe, expect, it } from 'vitest';
import {
	decodePDFRawStream,
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFName,
	PDFRawStream
} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Jimp, JimpMime } from 'jimp';
import { composeLayoutForOrder } from '../layout';
import { MINI_SKU_LAYOUT, mmToPx, PEDIDO_EXEMPLO } from '../../fixtures/pedido-exemplo';
import type { NarrativeBlocks } from '../../product-skills/narrative-style/romantico/generate';
import type { StylizedPhoto } from '../../product-skills/photo-style/provider';
import { renderBookToPdf, RenderBookMissingStylizedPhotoError } from './render-book';

/** Narrativa com os quatro tipos de spread (mais as variantes abertura/capítulo/carta que
 * reaproveitam a mesma composição — D-061): abertura, dois capítulos, dois polaroids, uma
 * linha do tempo, carta final e dedicatória. Só referencia fotos de `PEDIDO_EXEMPLO`. */
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
 * alcançar 300+ DPI em qualquer área de destino dentro da página de produção do SKU mini
 * (156×156mm) — mesmo racional de `render-polaroid.test.ts`, sem depender da área exata
 * calculada pela composição. */
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
 * quebrou linha (`hasEOL`) — mesma técnica de `render-dedicatoria.test.ts`: o Chrome não
 * grava espaço explícito no fim de uma linha quebrada por largura. */
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

describe('renderBookToPdf — caminho feliz', () => {
	it('devolve um PDF com o número de páginas esperado (soma de pageCount dos spreads)', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();

		const pdfBytes = await renderBookToPdf(book, renderablePhotos, MINI_SKU_LAYOUT);
		const pdfDoc = await PDFDocument.load(pdfBytes);

		const expectedPageCount = book.spreads.reduce((sum, spread) => sum + spread.pageCount, 0);
		expect(expectedPageCount).toBe(book.totalPages);
		expect(pdfDoc.getPageCount()).toBe(expectedPageCount);
	}, 30_000);

	it('mantém a ordem das páginas igual à ordem dos spreads do livro', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();

		const pdfBytes = await renderBookToPdf(book, renderablePhotos, MINI_SKU_LAYOUT);
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
});

describe('renderBookToPdf — conformidade PDF/X-4 (F2-08c2, issue #139)', () => {
	it('inclui OutputIntent GTS_PDFX com perfil ICC embutido', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();

		const pdfBytes = await renderBookToPdf(book, renderablePhotos, MINI_SKU_LAYOUT);
		const pdfDoc = await PDFDocument.load(pdfBytes);
		const context = pdfDoc.context;

		const outputIntents = pdfDoc.catalog.lookup(PDFName.of('OutputIntents'), PDFArray);
		expect(outputIntents.size()).toBe(1);

		const outputIntent = context.lookup(outputIntents.get(0), PDFDict);
		expect(outputIntent.get(PDFName.of('Type'))?.toString()).toBe('/OutputIntent');
		expect(outputIntent.get(PDFName.of('S'))?.toString()).toBe('/GTS_PDFX');

		const profileRef = outputIntent.get(PDFName.of('DestOutputProfile'));
		const profileStream = context.lookup(profileRef, PDFRawStream);
		const profileBytes = decodePDFRawStream(profileStream).decode();
		// assinatura de arquivo ICC ('acsp'), ICC.1:2001-04 §6.1.3 — perfil embutido em icc-srgb.ts
		expect(Buffer.from(profileBytes.slice(36, 40)).toString('ascii')).toBe('acsp');
	}, 30_000);

	it('inclui metadados XMP mínimos de conformidade PDF/X-4', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();

		const pdfBytes = await renderBookToPdf(book, renderablePhotos, MINI_SKU_LAYOUT);
		const pdfDoc = await PDFDocument.load(pdfBytes);
		const context = pdfDoc.context;

		const metadataRef = pdfDoc.catalog.get(PDFName.of('Metadata'));
		expect(metadataRef).toBeDefined();
		const metadataStream = context.lookup(metadataRef, PDFRawStream);
		const xmp = Buffer.from(decodePDFRawStream(metadataStream).decode()).toString('utf8');

		expect(xmp).toContain('<pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>');
		expect(xmp).toContain('<xmpMM:DocumentID>');
		expect(xmp).toContain('<xmpMM:InstanceID>');
		expect(xmp).toContain('<dc:title>');
	}, 30_000);
});

describe('renderBookToPdf — erros descritivos', () => {
	it('lança RenderBookMissingStylizedPhotoError quando falta a StylizedPhoto de um spread polaroid', async () => {
		const { book, renderablePhotos } = await buildBookAndPhotos();
		const semAPrimeiraFoto = renderablePhotos.filter(
			(photo) => photo.sourcePhotoId !== 'foto-01-varanda'
		);

		await expect(renderBookToPdf(book, semAPrimeiraFoto, MINI_SKU_LAYOUT)).rejects.toThrow(
			RenderBookMissingStylizedPhotoError
		);
		await expect(renderBookToPdf(book, semAPrimeiraFoto, MINI_SKU_LAYOUT)).rejects.toThrow(
			/foto-01-varanda/
		);
	}, 30_000);
});
