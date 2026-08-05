/**
 * Render de PDF de produção do spread `carta` (F2-08b1, issue #127) — reaproveita 100% do
 * mecanismo de `render-dedicatoria.ts` (F2-08a, [D-062]): Chrome via `playwright-core`
 * (`channel: 'chrome'`), fonte Lora incorporada como data URI, `@page { size }` na
 * dimensão física do SKU.
 *
 * Diferença em relação a `dedicatoria`: uma `CartaComposition` pode ter mais de uma
 * página (`pages`, até `MAX_PAGES` de `carta/compose.ts`). Cada `CartaPage` vira uma
 * página de PDF de produção própria — um `<div>` do tamanho exato da página, separado do
 * seguinte por quebra de página CSS (`break-after: page`), todos compartilhando o mesmo
 * `@page { size }` (mesmo SKU). O texto de cada página é renderizado como conteúdo real
 * (não imagem), então sai como vetor: 300 DPI não se aplica (só a bitmap, fora de escopo).
 *
 * O tamanho de fonte usado aqui é menor do que `FONT_SIZE_MM`/`AVG_CHAR_WIDTH_RATIO` de
 * `carta/compose.ts` (que só estimam capacidade para decidir paginação, conforme
 * `definition.md` — "a tipografia/rasterização real fica para a geração de imagem/PDF"),
 * de propósito: garante folga para a página de fato caber o texto que a paginação por
 * estimativa decidiu que cabia, mesmo com a métrica real da fonte Lora divergindo um
 * pouco da largura média assumida na estimativa.
 */
import type { CartaComposition } from '../../product-skills/layout-element/carta/compose';
import type { SkuLayoutParams } from '../../product-skills/layout-element/polaroid-com-texto/compose';
import { escapeHtml, FONT_FAMILY, loadFontBase64, renderHtmlToPdf } from './render-shared';

/** Tamanho do texto da carta (pt) — menor que a estimativa de capacidade de `compose.ts`
 * (~12.8pt) de propósito, para dar folga e evitar que o texto de uma página estimada
 * transborde a área na renderização real (ver comentário de topo do arquivo). */
const FONT_SIZE_PT = 10;

function buildHtml(composition: CartaComposition, sku: SkuLayoutParams, fontBase64: string): string {
	const pagesHtml = composition.pages
		.map((page) => {
			const { xMm, yMm, widthMm, heightMm } = page.area;
			return `<div class="carta-page">
	<div class="carta-text" style="left: ${xMm}mm; top: ${yMm}mm; width: ${widthMm}mm; height: ${heightMm}mm;">${escapeHtml(page.text)}</div>
</div>`;
		})
		.join('\n');

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
@font-face {
	font-family: '${FONT_FAMILY}';
	src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
	font-weight: 400;
	font-style: normal;
}
@page {
	size: ${sku.pageWidthMm}mm ${sku.pageHeightMm}mm;
	margin: 0;
}
html, body {
	margin: 0;
	padding: 0;
}
.carta-page {
	position: relative;
	width: ${sku.pageWidthMm}mm;
	height: ${sku.pageHeightMm}mm;
	break-after: page;
	page-break-after: always;
}
.carta-page:last-child {
	break-after: auto;
	page-break-after: auto;
}
.carta-text {
	position: absolute;
	font-family: '${FONT_FAMILY}', serif;
	font-size: ${FONT_SIZE_PT}pt;
	line-height: 1.4;
	white-space: pre-wrap;
	color: #000;
}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

/**
 * Renderiza um `CartaComposition` (saída de `composeCarta`, possivelmente multi-página) na
 * página de produção do `SkuLayoutParams` informado e devolve os bytes do PDF resultante —
 * uma página de PDF por `CartaPage`. Determinística do lado do conteúdo (mesma composição +
 * mesmo SKU → mesmo texto, mesma posição, mesma fonte incorporada em cada página), mas
 * depende de lançar um processo do Chrome instalado no ambiente — não é livre de efeito
 * colateral.
 */
export async function renderCartaSpreadToPdf(
	composition: CartaComposition,
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	const html = buildHtml(composition, sku, loadFontBase64());
	return renderHtmlToPdf(html);
}
