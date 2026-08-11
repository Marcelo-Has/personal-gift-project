/**
 * Junta o PDF de produção do livro inteiro (F2-08c1, issue #133) a partir de um
 * `GeneratedBook` (SKU mini, `composeLayoutForOrder`, F2-06c): renderiza cada `LayoutSpread`
 * com o `render*SpreadToPdf` correspondente ao seu `type` (F2-08a/b1/b2, [D-062]/[D-063]/
 * [D-064]) e copia as páginas resultantes, na ordem de `book.spreads`, para um único
 * `PDFDocument` via `pdf-lib` (`copyPages`, já dependência do projeto).
 *
 * `abertura`/`dedicatoria` compartilham `DedicatoriaComposition` e `renderDedicatoriaSpreadToPdf`
 * (mesmo bloco de texto centralizado, D-061 em `layout.ts`); `capitulo`/`carta` compartilham
 * `CartaComposition` e `renderCartaSpreadToPdf` pelo mesmo motivo.
 *
 * Reuso de Chrome entre spreads: cada `render*SpreadToPdf` mantém seu próprio launch/close
 * (não reaproveitado entre chamadas) — decisão registrada em `docs/DECISIONS.md` (nova
 * entrada desta issue), por simplicidade e para não alterar a assinatura dos quatro módulos
 * de render já mergeados sem um ganho medido (`.claude/rules/right-sizing.md`).
 */
import { PDFDocument } from 'pdf-lib';
import type { CartaComposition } from '../../product-skills/layout-element/carta/compose';
import type { DedicatoriaComposition } from '../../product-skills/layout-element/dedicatoria/compose';
import type {
	PolaroidComposition,
	SkuLayoutParams
} from '../../product-skills/layout-element/polaroid-com-texto/compose';
import type { TimelineComposition } from '../../product-skills/layout-element/timeline/compose';
import type { StylizedPhoto } from '../../product-skills/photo-style/provider';
import type { GeneratedBook, LayoutSpread } from '../layout';
import { renderCartaSpreadToPdf } from './render-carta';
import { renderDedicatoriaSpreadToPdf } from './render-dedicatoria';
import { renderPolaroidSpreadToPdf } from './render-polaroid';
import { renderTimelineSpreadToPdf } from './render-timeline';

/** Lançado quando um spread `polaroid` referencia, via `composition.photo.path`, uma foto
 * sem `StylizedPhoto` correspondente entre as fotos informadas a `renderBookToPdf` — mesmo
 * tipo de defeito de wiring que `LayoutMissingStylizedPhotoError` cobre em `layout.ts`, mas
 * detectado aqui porque `GeneratedBook` não carrega os bytes das fotos (só a composição). */
export class RenderBookMissingStylizedPhotoError extends Error {}

async function renderSpreadToPdf(
	spread: LayoutSpread,
	photos: StylizedPhoto[],
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	switch (spread.type) {
		case 'abertura':
		case 'dedicatoria':
			return renderDedicatoriaSpreadToPdf(spread.composition as DedicatoriaComposition, sku);
		case 'capitulo':
		case 'carta':
			return renderCartaSpreadToPdf(spread.composition as CartaComposition, sku);
		case 'timeline':
			return renderTimelineSpreadToPdf(spread.composition as TimelineComposition, sku);
		case 'polaroid': {
			const composition = spread.composition as PolaroidComposition;
			const photo = photos.find((candidate) => candidate.sourcePhotoId === composition.photo.path);
			if (!photo) {
				throw new RenderBookMissingStylizedPhotoError(
					'generation-engine/pdf/render-book: spread polaroid referencia ' +
						`composition.photo.path="${composition.photo.path}" sem StylizedPhoto ` +
						'correspondente entre as fotos informadas a renderBookToPdf'
				);
			}
			return renderPolaroidSpreadToPdf(composition, photo, sku);
		}
	}
}

/**
 * Composição compartilhada entre o PDF de produção (`renderBookToPdf`) e o PDF de preview
 * (`renderBookPreviewPdf`, F2-09, `render-book-preview.ts`): para cada `LayoutSpread` de
 * `book.spreads`, na ordem em que aparecem, chama o `render*SpreadToPdf` correspondente e
 * copia suas páginas para o documento final via `pdf-lib` (`PDFDocument.copyPages`). Os
 * spreads são renderizados em sequência (não em paralelo) — evita lançar vários processos
 * de Chrome ao mesmo tempo para um único pedido.
 *
 * `photos` precisa conter o `StylizedPhoto` de toda foto referenciada por um spread
 * `polaroid` do livro (mesmo casamento por `sourcePhotoId`/`composition.photo.path` de
 * `layout.ts`); lança `RenderBookMissingStylizedPhotoError` se faltar alguma. Não inclui
 * PDF/X-4 (`OutputIntent`/ICC/XMP) — quem quiser essa conformidade aplica por cima do
 * resultado (fica isolado em `renderBookToPdf`/F2-08c2, nunca neste módulo compartilhado,
 * para que `renderBookPreviewPdf` nunca a herde por engano — D-077).
 */
export async function composeBookPdf(
	book: GeneratedBook,
	photos: StylizedPhoto[],
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	const mergedDoc = await PDFDocument.create();

	for (const spread of book.spreads) {
		const spreadPdfBytes = await renderSpreadToPdf(spread, photos, sku);
		const spreadDoc = await PDFDocument.load(spreadPdfBytes);
		const copiedPages = await mergedDoc.copyPages(spreadDoc, spreadDoc.getPageIndices());
		copiedPages.forEach((page) => mergedDoc.addPage(page));
	}

	return mergedDoc.save();
}

/**
 * Renderiza um `GeneratedBook` (SKU mini, `composeLayoutForOrder`) inteiro para o PDF de
 * **produção**: hoje é só `composeBookPdf` (ver acima) — a etapa de conformidade PDF/X-4
 * (`OutputIntent`/ICC/XMP, F2-08c2/#139) ainda não foi implementada e, quando for, entra
 * *depois* desta chamada, só aqui, nunca em `composeBookPdf`. Para o PDF de preview (sem
 * essa exigência), use `renderBookPreviewPdf` de `render-book-preview.ts` — não este.
 */
export async function renderBookToPdf(
	book: GeneratedBook,
	photos: StylizedPhoto[],
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	return composeBookPdf(book, photos, sku);
}
