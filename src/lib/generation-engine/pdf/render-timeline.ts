/**
 * Render de PDF de produção do spread `timeline` (F2-08b1, issue #127) — reaproveita 100%
 * do mecanismo de `render-dedicatoria.ts` (F2-08a, [D-062]): Chrome via `playwright-core`
 * (`channel: 'chrome'`), fonte Lora incorporada como data URI, `@page { size }` na
 * dimensão física do SKU.
 *
 * `TimelineComposition.line` (um `PositionedRect`) vira um retângulo posicionado (`<div>`
 * com cor de preenchimento) — não precisa ser um SVG vetorial complexo, conforme a issue.
 * Cada `TimelineMarkerPosition` vira um ponto (pequeno círculo sobre a linha, em
 * `point`) e um rótulo com título + descrição na área calculada (`labelArea`). Todo o
 * conteúdo é vetorial (retângulo/círculo/texto real, não imagem): 300 DPI não se aplica.
 *
 * `markers: []` (lista vazia) é uma composição válida (`timeline/definition.md`) — o PDF
 * sai com uma única página contendo só a linha, sem lançar erro.
 */
import type { TimelineComposition } from '../../product-skills/layout-element/timeline/compose';
import type { SkuLayoutParams } from '../../product-skills/layout-element/polaroid-com-texto/compose';
import { escapeHtml, FONT_FAMILY, loadFontBase64, renderHtmlToPdf } from './render-shared';

/** Tamanho do título do marco (pt). */
const TITLE_FONT_SIZE_PT = 9;

/** Tamanho da descrição do marco (pt) — menor que o título, para diferenciar hierarquia. */
const DESCRIPTION_FONT_SIZE_PT = 7.5;

/** Diâmetro do ponto do marcador sobre a linha (mm). */
const MARKER_POINT_DIAMETER_MM = 2.5;

function buildMarkerHtml(marker: TimelineComposition['markers'][number]): string {
	const { xMm, yMm, widthMm, heightMm } = marker.labelArea;
	const pointLeftMm = marker.point.xMm - MARKER_POINT_DIAMETER_MM / 2;
	const pointTopMm = marker.point.yMm - MARKER_POINT_DIAMETER_MM / 2;

	return `<div class="timeline-marker-point" style="left: ${pointLeftMm}mm; top: ${pointTopMm}mm;"></div>
<div class="timeline-label" style="left: ${xMm}mm; top: ${yMm}mm; width: ${widthMm}mm; height: ${heightMm}mm;">
	<div class="timeline-label-title">${escapeHtml(marker.title)}</div>
	<div class="timeline-label-description">${escapeHtml(marker.description)}</div>
</div>`;
}

function buildHtml(
	composition: TimelineComposition,
	sku: SkuLayoutParams,
	fontBase64: string
): string {
	const { xMm, yMm, widthMm, heightMm } = composition.line;
	const markersHtml = composition.markers.map(buildMarkerHtml).join('\n');

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
.timeline-line {
	position: absolute;
	left: ${xMm}mm;
	top: ${yMm}mm;
	width: ${widthMm}mm;
	height: ${heightMm}mm;
	background: #000;
}
.timeline-marker-point {
	position: absolute;
	width: ${MARKER_POINT_DIAMETER_MM}mm;
	height: ${MARKER_POINT_DIAMETER_MM}mm;
	border-radius: 50%;
	background: #000;
}
.timeline-label {
	position: absolute;
	font-family: '${FONT_FAMILY}', serif;
	color: #000;
}
.timeline-label-title {
	font-size: ${TITLE_FONT_SIZE_PT}pt;
	font-weight: 700;
	line-height: 1.3;
	white-space: pre-wrap;
}
.timeline-label-description {
	font-size: ${DESCRIPTION_FONT_SIZE_PT}pt;
	font-weight: 400;
	line-height: 1.3;
	white-space: pre-wrap;
}
</style>
</head>
<body>
<div class="timeline-line"></div>
${markersHtml}
</body>
</html>`;
}

/**
 * Renderiza um `TimelineComposition` (saída de `composeTimeline`) na página de produção do
 * `SkuLayoutParams` informado e devolve os bytes do PDF resultante — uma única página com a
 * linha e um marcador (ponto + rótulo) por entrada. `markers` vazio produz um PDF válido só
 * com a linha. Determinística do lado do conteúdo, mas depende de lançar um processo do
 * Chrome instalado no ambiente — não é livre de efeito colateral.
 */
export async function renderTimelineSpreadToPdf(
	composition: TimelineComposition,
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	const html = buildHtml(composition, sku, loadFontBase64());
	return renderHtmlToPdf(html);
}
