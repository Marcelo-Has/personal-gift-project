/**
 * Render de PDF de produção do spread `dedicatoria` (F2-08a, issue #125) — primeira
 * fatia da infra de render headless HTML/CSS → PDF decidida em `docs/ARCHITECTURE.md`
 * Parte 2 (mecanismo escolhido em [D-062]).
 *
 * Usa o Chrome já instalado no runner via `playwright-core` (`channel: 'chrome'`), em vez
 * do Chromium empacotado que o `@playwright/test` baixa para os testes E2E — evita um
 * segundo download de browser (~115 MB) só para a geração de PDF ([D-062]).
 *
 * Monta uma página HTML do tamanho físico exato da página de produção do SKU
 * (`SkuLayoutParams`, em mm, sangria incluída) via `@page { size }`, com o texto de
 * `DedicatoriaComposition.text` posicionado na área já calculada por `composeDedicatoria`
 * (`text.area`, em mm, relativa à página) e a fonte Lora (Google Fonts, SIL OFL 1.1, via
 * `@fontsource/lora`) incorporada como data URI — nenhuma dependência de fonte instalada
 * no ambiente de execução. O texto é renderizado como conteúdo real da página (não
 * imagem), então sai como vetor no PDF: a exigência de 300 DPI de `docs/ARCHITECTURE.md`
 * não se aplica a texto vetorial (só a bitmap, fora do escopo desta issue — `dedicatoria`
 * não usa imagem).
 *
 * Fora de escopo (ver issue #125): renderizar `carta`/`polaroid-com-texto`/`timeline`
 * (F2-08b) e montar o PDF do livro inteiro a partir de um `GeneratedBook` (F2-08c).
 *
 * F2-08b1 (issue #127) reaproveitou o padrão de fonte/`@page`/launch-close do Chrome deste
 * módulo em `render-carta.ts`/`render-timeline.ts`, e extraiu a parte comum (segundo e
 * terceiro uso concreto) para `render-shared.ts`.
 */
import type { DedicatoriaComposition } from '../../product-skills/layout-element/dedicatoria/compose';
import type { SkuLayoutParams } from '../../product-skills/layout-element/polaroid-com-texto/compose';
import { escapeHtml, FONT_FAMILY, loadFontBase64, renderHtmlToPdf } from './render-shared';

/** Tamanho do texto de dedicatória (pt), para a tipografia de abertura do livro. */
const FONT_SIZE_PT = 14;

function buildHtml(
	composition: DedicatoriaComposition,
	sku: SkuLayoutParams,
	fontBase64: string
): string {
	const { xMm, yMm, widthMm, heightMm } = composition.text.area;

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
.dedicatoria-text {
	position: absolute;
	left: ${xMm}mm;
	top: ${yMm}mm;
	width: ${widthMm}mm;
	height: ${heightMm}mm;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	font-family: '${FONT_FAMILY}', serif;
	font-size: ${FONT_SIZE_PT}pt;
	line-height: 1.4;
	white-space: pre-wrap;
	color: #000;
}
</style>
</head>
<body>
<div class="dedicatoria-text">${escapeHtml(composition.text.content)}</div>
</body>
</html>`;
}

/**
 * Renderiza um `DedicatoriaComposition` (saída de `composeDedicatoria`) na página de
 * produção do `SkuLayoutParams` informado e devolve os bytes do PDF resultante.
 * Determinística do lado do conteúdo (mesma composição + mesmo SKU → mesmo texto, mesma
 * posição, mesma fonte incorporada), mas depende de lançar um processo do Chrome
 * instalado no ambiente (`playwright-core`, `channel: 'chrome'`) — não é livre de efeito
 * colateral.
 */
export async function renderDedicatoriaSpreadToPdf(
	composition: DedicatoriaComposition,
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	const html = buildHtml(composition, sku, loadFontBase64());
	return renderHtmlToPdf(html);
}
