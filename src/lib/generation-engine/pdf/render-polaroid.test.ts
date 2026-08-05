// @vitest-environment node
/**
 * Testes de `renderPolaroidSpreadToPdf` (F2-08b2, issue #128) contra os critérios de
 * aceite: PDF válido, imagem bitmap embutida a 300 DPI (ou erro explícito quando não
 * alcança, [D-064]), moldura rotacionada em `frame.rotationDeg`, legenda extraível dentro
 * da área rotacionada, e determinismo.
 *
 * `@vitest-environment node`, mesmo racional de `render-dedicatoria.test.ts`: o worker
 * falso do `pdfjs-dist` em `jsdom` quebra com `DataCloneError` na segunda chamada a
 * `getDocument` — mesma extração roda limpa em Node puro.
 *
 * Método de verificação da rotação (issue pede "documentar o método escolhido"): o Chrome
 * exporta o texto como operador vetorial cuja matriz de transformação (`item.transform`,
 * `[a, b, c, d, e, f]`) reflete o `rotate()` CSS aplicado ao ancestral `.frame` — medido
 * empiricamente (não só derivado) que o ângulo extraído via `atan2(b, a)` no referencial
 * nativo do PDF (y para cima) é o NEGATIVO do `rotationDeg` do CSS (y para baixo): a
 * exportação para PDF inverte o eixo Y, o que inverte também o sentido angular medido.
 * `measuredRotationDeg()` já aplica essa inversão, então o valor comparado bate direto
 * com `composition.frame.rotationDeg`. A posição da legenda é verificada contra o
 * bounding box de `caption.area` rotacionado ao redor do centro da moldura (mesma
 * fórmula de rotação do CSS, aplicada no referencial "mm a partir do topo" que
 * `compose.ts` já usa) — não pixel a pixel, no mesmo espírito do teste de F2-08a.
 *
 * Fixture de foto: gerada em memória via `jimp` (já dependência de produção), não
 * depende de chamada real ao provedor de imagem (`.claude/rules/testing.md`: mocar
 * dependência externa) nem de fixture binária versionada.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFStream } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Jimp, JimpMime } from 'jimp';
import {
	PolaroidRenderInputError,
	PolaroidRenderResolutionError,
	renderPolaroidSpreadToPdf
} from './render-polaroid';
import {
	composePolaroidComTexto,
	type PolaroidComposition
} from '../../product-skills/layout-element/polaroid-com-texto/compose';
import type { StylizedPhoto } from '../../product-skills/photo-style/provider';
import { PHOTO_STYLE_TARGET_DPI } from '../../product-skills/photo-style/resolution-config';
import { MINI_SKU_LAYOUT, mmToPx } from '../../fixtures/pedido-exemplo';

/** Legenda cuja inclinação determinística (`deterministicTiltDeg` de `compose.ts`) dá
 * 4.2°, uma rotação grande o bastante para não se confundir com ruído de arredondamento
 * da renderização — usada no teste específico de rotação e no de determinismo. */
const ROTATED_CAPTION = 'Café de domingo';

const SOURCE_PHOTO_ID = 'foto-1';
/** Aspecto 4:3 arbitrário para a imagem de origem — só define a proporção da área da
 * foto calculada por `composePolaroidComTexto`, não a resolução final da fixture. */
const SOURCE_IMAGE_DIMENSIONS = { widthPx: 800, heightPx: 600 };

const PAGE_SIZE_TOLERANCE_MM = 0.5;
/** Tolerância do bounding box da legenda (mm): cobre o espaço entre o início do glifo
 * (alinhado ao centro, `text-align: center`) e a borda da área, mais o deslocamento do
 * baseline dentro da altura da linha (`line-height`) — mesmo espírito do
 * `TEXT_POSITION_TOLERANCE_MM` de `render-dedicatoria.test.ts`. */
const CAPTION_POSITION_TOLERANCE_MM = 10;
const ROTATION_TOLERANCE_DEG = 0.5;

function pointsToMm(points: number): number {
	return (points / 72) * 25.4;
}

/** Gera uma foto "estilizada" de fixture (PNG sólido) com a resolução exata que produz o
 * DPI pedido na área de destino (mm) do `PolaroidComposition` — sem depender de um
 * provedor de imagem real. */
async function makeStylizedPhoto(
	composition: PolaroidComposition,
	dpi: number
): Promise<StylizedPhoto> {
	const widthPx = mmToPx(composition.photo.area.widthMm, dpi);
	const heightPx = mmToPx(composition.photo.area.heightMm, dpi);
	const image = new Jimp({ width: widthPx, height: heightPx, color: 0x336699ff });
	const data = await image.getBuffer(JimpMime.png);

	return {
		sourcePhotoId: SOURCE_PHOTO_ID,
		data: new Uint8Array(data),
		metadata: { widthPx, heightPx, dpi, format: 'png' }
	};
}

function composeFixture(caption: string): PolaroidComposition {
	return composePolaroidComTexto(
		{ image: { path: SOURCE_PHOTO_ID, ...SOURCE_IMAGE_DIMENSIONS }, caption },
		MINI_SKU_LAYOUT
	);
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

/** Varre os objetos indiretos do PDF por um XObject de imagem (`/Subtype /Image`) — sinal
 * de que a foto foi embutida como bitmap, não como vetor. Um XObject de imagem é sempre
 * um stream (`PDFStream`/`PDFRawStream`, com o dicionário em `.dict`), não um `PDFDict`
 * puro — `pdf-lib` não faz `PDFStream` estender `PDFDict` (só `PDFObject`), então checa
 * as duas formas. */
function hasEmbeddedImage(pdfDoc: PDFDocument): boolean {
	for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
		const dict = obj instanceof PDFStream ? obj.dict : obj instanceof PDFDict ? obj : undefined;
		if (dict?.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
			return true;
		}
	}
	return false;
}

async function extractTextItems(pdfBytes: Uint8Array) {
	const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
	const pdf = await loadingTask.promise;
	try {
		const page = await pdf.getPage(1);
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

/** Ângulo de rotação medido a partir da matriz `[a, b, c, d, e, f]` de um item de texto —
 * ver nota do cabeçalho do arquivo sobre a inversão de sinal na exportação para PDF. */
function measuredRotationDeg(transform: number[]): number {
	const [a, b] = transform;
	return -(Math.atan2(b, a) * 180) / Math.PI;
}

/** Rotaciona um ponto (mm, referencial "a partir do topo") ao redor de `(cx, cy)` pelo
 * mesmo ângulo e sentido que `transform: rotate(angleDeg)` do CSS aplica no elemento. */
function rotatePoint(
	point: { x: number; y: number },
	center: { x: number; y: number },
	angleDeg: number
): { x: number; y: number } {
	const angleRad = (angleDeg * Math.PI) / 180;
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	return {
		x: center.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
		y: center.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
	};
}

/** Bounding box (mm, "a partir do topo") da área da legenda depois de rotacionada ao
 * redor do centro da moldura — os quatro cantos de `caption.area`, rotacionados. */
function rotatedCaptionBoundingBox(composition: PolaroidComposition) {
	const { frame, caption } = composition;
	const center = {
		x: frame.area.xMm + frame.area.widthMm / 2,
		y: frame.area.yMm + frame.area.heightMm / 2
	};
	const corners = [
		{ x: caption.area.xMm, y: caption.area.yMm },
		{ x: caption.area.xMm + caption.area.widthMm, y: caption.area.yMm },
		{ x: caption.area.xMm, y: caption.area.yMm + caption.area.heightMm },
		{ x: caption.area.xMm + caption.area.widthMm, y: caption.area.yMm + caption.area.heightMm }
	].map((corner) => rotatePoint(corner, center, frame.rotationDeg));

	return {
		minX: Math.min(...corners.map((c) => c.x)),
		maxX: Math.max(...corners.map((c) => c.x)),
		minY: Math.min(...corners.map((c) => c.y)),
		maxY: Math.max(...corners.map((c) => c.y))
	};
}

describe('renderPolaroidSpreadToPdf', () => {
	describe('spread válido (foto a 300 DPI exatos na área de destino)', () => {
		const composition = composeFixture(ROTATED_CAPTION);
		let stylizedPhoto: StylizedPhoto;
		let pdfBytes: Uint8Array;

		beforeAll(async () => {
			stylizedPhoto = await makeStylizedPhoto(composition, PHOTO_STYLE_TARGET_DPI);
			pdfBytes = await renderPolaroidSpreadToPdf(composition, stylizedPhoto, MINI_SKU_LAYOUT);
		}, 30_000);

		it('gera um PDF de uma página que abre num leitor de PDF (pdf-lib carrega sem erro)', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);

			expect(pdfDoc.getPageCount()).toBe(1);
		});

		it('o MediaBox da página corresponde a 156x156mm (SKU mini, sangria incluída)', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);
			const { width, height } = pdfDoc.getPage(0).getSize();

			expect(pointsToMm(width)).toBeGreaterThan(
				MINI_SKU_LAYOUT.pageWidthMm - PAGE_SIZE_TOLERANCE_MM
			);
			expect(pointsToMm(width)).toBeLessThan(MINI_SKU_LAYOUT.pageWidthMm + PAGE_SIZE_TOLERANCE_MM);
			expect(pointsToMm(height)).toBeGreaterThan(
				MINI_SKU_LAYOUT.pageHeightMm - PAGE_SIZE_TOLERANCE_MM
			);
			expect(pointsToMm(height)).toBeLessThan(
				MINI_SKU_LAYOUT.pageHeightMm + PAGE_SIZE_TOLERANCE_MM
			);
		});

		it('a fonte da legenda está incorporada no PDF (programa de fonte embutido)', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);

			expect(hasEmbeddedFontProgram(pdfDoc)).toBe(true);
		});

		it('a foto aparece no PDF como imagem bitmap embutida (não vetor)', async () => {
			const pdfDoc = await PDFDocument.load(pdfBytes);

			expect(hasEmbeddedImage(pdfDoc)).toBe(true);
		});

		it('a legenda aparece no PDF como texto extraível (não só visual)', async () => {
			const items = await extractTextItems(pdfBytes);
			const extractedText = joinTextItems(items);

			expect(extractedText).toBe(ROTATED_CAPTION);
		});

		it('a moldura está rotacionada em frame.rotationDeg (ângulo medido na matriz de transformação do texto da legenda)', async () => {
			expect(Math.abs(composition.frame.rotationDeg)).toBeGreaterThan(1);

			const items = await extractTextItems(pdfBytes);
			expect(items.length).toBeGreaterThan(0);

			for (const item of items) {
				const deviationDeg = Math.abs(
					measuredRotationDeg(item.transform) - composition.frame.rotationDeg
				);
				expect(deviationDeg).toBeLessThan(ROTATION_TOLERANCE_DEG);
			}
		});

		it('a legenda aparece dentro da área de caption.area (mm) considerando a rotação da moldura', async () => {
			const items = await extractTextItems(pdfBytes);
			expect(items.length).toBeGreaterThan(0);

			const box = rotatedCaptionBoundingBox(composition);
			for (const item of items) {
				const xMm = pointsToMm(item.transform[4]);
				const yMmFromTop = MINI_SKU_LAYOUT.pageHeightMm - pointsToMm(item.transform[5]);

				expect(xMm).toBeGreaterThanOrEqual(box.minX - CAPTION_POSITION_TOLERANCE_MM);
				expect(xMm).toBeLessThanOrEqual(box.maxX + CAPTION_POSITION_TOLERANCE_MM);
				expect(yMmFromTop).toBeGreaterThanOrEqual(box.minY - CAPTION_POSITION_TOLERANCE_MM);
				expect(yMmFromTop).toBeLessThanOrEqual(box.maxY + CAPTION_POSITION_TOLERANCE_MM);
			}
		});

		it('é determinística: a mesma composição e foto renderizadas de novo produzem o mesmo texto e as mesmas dimensões', async () => {
			const secondRenderBytes = await renderPolaroidSpreadToPdf(
				composition,
				stylizedPhoto,
				MINI_SKU_LAYOUT
			);

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

	it('aceita uma foto acima de 300 DPI na área de destino (resolução maior que o mínimo, sem erro)', async () => {
		const composition = composeFixture('Tarde de verão');
		const stylizedPhoto = await makeStylizedPhoto(composition, PHOTO_STYLE_TARGET_DPI + 50);

		const pdfBytes = await renderPolaroidSpreadToPdf(composition, stylizedPhoto, MINI_SKU_LAYOUT);
		const pdfDoc = await PDFDocument.load(pdfBytes);

		expect(pdfDoc.getPageCount()).toBe(1);
	}, 30_000);

	it('rejeita com PolaroidRenderResolutionError uma foto abaixo de 300 DPI na área de destino, sem tentar renderizar ([D-064])', async () => {
		const composition = composeFixture('Manhã de inverno');
		const stylizedPhoto = await makeStylizedPhoto(composition, PHOTO_STYLE_TARGET_DPI - 100);

		await expect(
			renderPolaroidSpreadToPdf(composition, stylizedPhoto, MINI_SKU_LAYOUT)
		).rejects.toThrow(PolaroidRenderResolutionError);
	});

	it('rejeita com PolaroidRenderInputError quando o StylizedPhoto não corresponde a composition.photo.path', async () => {
		const composition = composeFixture('Noite de verão');
		const stylizedPhoto = await makeStylizedPhoto(composition, PHOTO_STYLE_TARGET_DPI);
		const mismatchedPhoto: StylizedPhoto = { ...stylizedPhoto, sourcePhotoId: 'foto-errada' };

		await expect(
			renderPolaroidSpreadToPdf(composition, mismatchedPhoto, MINI_SKU_LAYOUT)
		).rejects.toThrow(PolaroidRenderInputError);
	});
});
