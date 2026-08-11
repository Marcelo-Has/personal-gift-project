/**
 * Gera o PDF de **preview** do livro (F2-09, issue #140) a partir de um `GeneratedBook` +
 * `StylizedPhoto[]` + `SkuLayoutParams`: mesma composição/ordem de spreads já validada em
 * `renderBookToPdf` (F2-08c1, issue #133, `render-book.ts`), reaproveitada via
 * `composeBookPdf` — mas em módulo/função própria, para que a conformidade PDF/X-4
 * (`OutputIntent`/ICC/XMP, F2-08c2/#139), exclusiva do PDF de **produção**, nunca seja
 * aplicada por engano ao preview (D-077). `renderBookPreviewPdf` não chama
 * `renderBookToPdf` nem depende dele — os dois chamam `composeBookPdf` de forma
 * independente, então uma mudança futura em `renderBookToPdf` (ex. adicionar PDF/X-4 por
 * cima do resultado de `composeBookPdf`) não afeta este módulo.
 *
 * Quando/como esse PDF é exibido ao comprador é F2-11 (fora de escopo aqui, [gate D-103]).
 */
import type { SkuLayoutParams } from '../../product-skills/layout-element/polaroid-com-texto/compose';
import type { StylizedPhoto } from '../../product-skills/photo-style/provider';
import type { GeneratedBook } from '../layout';
import { composeBookPdf } from './render-book';

export { RenderBookMissingStylizedPhotoError } from './render-book';

/**
 * Renderiza um `GeneratedBook` inteiro para o PDF de **preview**: mesma ordem de spreads e
 * mesmo casamento de `StylizedPhoto` por `sourcePhotoId`/`composition.photo.path` de
 * `renderBookToPdf` (lança `RenderBookMissingStylizedPhotoError` se faltar alguma foto de
 * spread `polaroid`), mas sem `OutputIntent`/PDF/X-4 — essa conformidade fica exclusiva do
 * PDF de produção (F2-08c2/#139).
 */
export async function renderBookPreviewPdf(
	book: GeneratedBook,
	photos: StylizedPhoto[],
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	return composeBookPdf(book, photos, sku);
}
