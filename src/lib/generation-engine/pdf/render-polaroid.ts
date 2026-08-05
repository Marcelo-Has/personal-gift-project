/**
 * Render de PDF de produção do spread `polaroid-com-texto` (F2-08b2, issue #128) —
 * segunda fatia de F2-08b sobre a infra decidida em [D-062] (F2-08a, #125/#126).
 *
 * Diferente de `render-dedicatoria.ts` (só texto vetorial), esta composição embute uma
 * FOTO BITMAP real (`StylizedPhoto.data`) e aplica a rotação da moldura
 * (`PolaroidComposition.frame.rotationDeg`) — as duas complexidades que justificam esta
 * issue ficar separada de F2-08b1 (texto puro). `docs/ARCHITECTURE.md` Parte 2 exige
 * 300 DPI para bitmap no PDF de produção; a decisão de comportamento quando a foto não
 * alcança isso na área de destino está registrada em [D-063].
 *
 * `PolaroidComposition.photo.path` guarda só um identificador (não os bytes) —
 * `sourcePhotoId` do `StylizedPhoto` correspondente resolvido é responsabilidade de quem
 * chama (motor F2-06/worker), no mesmo espírito de `render-dedicatoria` receber a
 * composição já pronta (não busca por rede/signed URL dentro do render,
 * `.claude/rules/right-sizing.md`: sem mecanismo genérico de resolução de path sem um
 * segundo uso concreto). Esta função só valida que o par recebido é consistente
 * (`assertPhotoMatchesComposition`).
 *
 * Fora de escopo (ver issue #128): `carta`/`timeline` (F2-08b1) e montar o PDF do livro
 * inteiro a partir de um `GeneratedBook` (F2-08c).
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { chromium } from 'playwright-core';
import type {
	PolaroidComposition,
	PositionedRect,
	SkuLayoutParams
} from '../../product-skills/layout-element/polaroid-com-texto/compose';
import type { StylizedPhoto, StylizedPhotoMetadata } from '../../product-skills/photo-style/provider';
import { PHOTO_STYLE_TARGET_DPI } from '../../product-skills/photo-style/resolution-config';

const require = createRequire(import.meta.url);

/** Família de fonte usada no render da legenda — Lora (Google Fonts, SIL OFL 1.1), mesma
 * fonte de `render-dedicatoria.ts`. */
const FONT_FAMILY = 'Lora';

/** Tamanho da legenda da polaroid (pt) — menor que a dedicatória (14pt): a faixa de
 * legenda (`CAPTION_BAND_RATIO` de `compose.ts`) é mais estreita que uma página inteira. */
const CAPTION_FONT_SIZE_PT = 10;

const MM_PER_INCH = 25.4;

/** Lê o arquivo woff2 do pacote `@fontsource/lora` e devolve o conteúdo em base64, para
 * incorporar como data URI no `@font-face` — sem depender de fonte instalada no SO. */
function loadFontBase64(): string {
	const fontPath = require.resolve('@fontsource/lora/files/lora-latin-400-normal.woff2');
	return readFileSync(fontPath).toString('base64');
}

/** Escapa o texto da legenda antes de embuti-lo no HTML — a legenda vem de uma skill de
 * narrativa (saída de LLM) e pode conter caracteres especiais de HTML. */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Erro lançado quando o par `(composition, stylizedPhoto)` recebido é inconsistente —
 * sinal de um bug de wiring em quem resolveu `photo.path` para o `StylizedPhoto` errado,
 * não uma condição esperada em operação normal. */
export class PolaroidRenderInputError extends Error {}

/**
 * Erro lançado quando a foto de entrada não alcança 300 DPI na área de destino
 * (`composition.photo.area`) do PDF de produção — decisão [D-063]: falha explícita, não
 * aceitar-com-log. O pipeline de estilização (F2-04, `resolution-config.ts`) já mira
 * exatamente `PHOTO_STYLE_TARGET_DPI`; cair abaixo disso aqui sinaliza um defeito a
 * montante (foto errada resolvida, redimensionamento incorreto), não uma limitação
 * esperada — e um PDF de produção com bitmap abaixo de 300 DPI é o tipo de defeito caro
 * de descobrir só depois de impresso. Nunca faz upscaling artificial para disfarçar.
 */
export class PolaroidRenderResolutionError extends Error {}

function assertPhotoMatchesComposition(
	composition: PolaroidComposition,
	stylizedPhoto: StylizedPhoto
): void {
	if (stylizedPhoto.sourcePhotoId !== composition.photo.path) {
		throw new PolaroidRenderInputError(
			`StylizedPhoto resolvido (sourcePhotoId="${stylizedPhoto.sourcePhotoId}") não ` +
				`corresponde a composition.photo.path="${composition.photo.path}" — a resolução de ` +
				`path para StylizedPhoto está incorreta`
		);
	}
}

/** DPI efetivo da imagem esticada/encaixada na área de destino (mm) — o menor entre
 * largura e altura, já que um encaixe desalinhado pode esticar mais numa dimensão que na
 * outra e o requisito de 300 DPI vale para a imagem inteira, não só um lado. */
function effectiveDpi(metadata: StylizedPhotoMetadata, areaMm: PositionedRect): number {
	const widthDpi = metadata.widthPx / (areaMm.widthMm / MM_PER_INCH);
	const heightDpi = metadata.heightPx / (areaMm.heightMm / MM_PER_INCH);
	return Math.min(widthDpi, heightDpi);
}

function assertMinimumResolution(
	composition: PolaroidComposition,
	stylizedPhoto: StylizedPhoto
): void {
	const dpi = effectiveDpi(stylizedPhoto.metadata, composition.photo.area);
	if (dpi < PHOTO_STYLE_TARGET_DPI) {
		throw new PolaroidRenderResolutionError(
			`StylizedPhoto "${stylizedPhoto.sourcePhotoId}" (${stylizedPhoto.metadata.widthPx}x` +
				`${stylizedPhoto.metadata.heightPx}px) rende ${dpi.toFixed(0)} DPI na área de destino ` +
				`${composition.photo.area.widthMm.toFixed(1)}x${composition.photo.area.heightMm.toFixed(1)}mm — ` +
				`abaixo do mínimo de ${PHOTO_STYLE_TARGET_DPI} DPI exigido para bitmap no PDF de ` +
				`produção (docs/ARCHITECTURE.md Parte 2)`
		);
	}
}

function buildHtml(
	composition: PolaroidComposition,
	sku: SkuLayoutParams,
	fontBase64: string,
	photoDataUri: string
): string {
	const { frame, photo, caption } = composition;

	// `photo.area`/`caption.area` são absolutas à página, calculadas ANTES da rotação
	// (comentário de `compose.ts`) — dentro da moldura elas ficam posicionadas relativas
	// ao canto da própria moldura; a rotação é aplicada uma única vez, na `.frame`, e
	// arrasta foto + legenda juntas (a legenda continua "dentro da mesma moldura
	// rotacionada", como pede a issue).
	const photoLeftMm = photo.area.xMm - frame.area.xMm;
	const photoTopMm = photo.area.yMm - frame.area.yMm;
	const captionLeftMm = caption.area.xMm - frame.area.xMm;
	const captionTopMm = caption.area.yMm - frame.area.yMm;

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
.frame {
	position: absolute;
	left: ${frame.area.xMm}mm;
	top: ${frame.area.yMm}mm;
	width: ${frame.area.widthMm}mm;
	height: ${frame.area.heightMm}mm;
	background: #ffffff;
	transform: rotate(${frame.rotationDeg}deg);
	transform-origin: center center;
}
.photo {
	position: absolute;
	left: ${photoLeftMm}mm;
	top: ${photoTopMm}mm;
	width: ${photo.area.widthMm}mm;
	height: ${photo.area.heightMm}mm;
	object-fit: cover;
}
.caption {
	position: absolute;
	left: ${captionLeftMm}mm;
	top: ${captionTopMm}mm;
	width: ${caption.area.widthMm}mm;
	height: ${caption.area.heightMm}mm;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	font-family: '${FONT_FAMILY}', serif;
	font-size: ${CAPTION_FONT_SIZE_PT}pt;
	line-height: 1.2;
	white-space: pre-wrap;
	color: #000;
}
</style>
</head>
<body>
<div class="frame">
	<img class="photo" src="${photoDataUri}" />
	<div class="caption">${escapeHtml(caption.text)}</div>
</div>
</body>
</html>`;
}

/**
 * Renderiza um `PolaroidComposition` (saída de `composePolaroidComTexto`) + o
 * `StylizedPhoto` cujos bytes correspondem a `composition.photo.path` na página de
 * produção do `SkuLayoutParams` informado, e devolve os bytes do PDF resultante: moldura
 * rotacionada em `frame.rotationDeg`, foto embutida como bitmap e legenda como texto
 * vetorial.
 *
 * Lança `PolaroidRenderInputError` se `stylizedPhoto` não corresponder a
 * `composition.photo.path`, e `PolaroidRenderResolutionError` se a foto não alcançar
 * 300 DPI na área de destino ([D-063]). Determinística do lado do conteúdo, mas depende
 * de lançar um processo do Chrome instalado no ambiente (`playwright-core`,
 * `channel: 'chrome'`, [D-062]) — não é livre de efeito colateral.
 */
export async function renderPolaroidSpreadToPdf(
	composition: PolaroidComposition,
	stylizedPhoto: StylizedPhoto,
	sku: SkuLayoutParams
): Promise<Uint8Array> {
	assertPhotoMatchesComposition(composition, stylizedPhoto);
	assertMinimumResolution(composition, stylizedPhoto);

	const mimeType = stylizedPhoto.metadata.format === 'png' ? 'image/png' : 'image/jpeg';
	const photoDataUri = `data:${mimeType};base64,${Buffer.from(stylizedPhoto.data).toString('base64')}`;
	const html = buildHtml(composition, sku, loadFontBase64(), photoDataUri);

	// Mesmo racional de `render-dedicatoria.ts` ([D-062]): `--no-sandbox` só em CI
	// (AppArmor do `ubuntu-latest` quebra o sandbox do Chrome do sistema,
	// actions/runner-images#9491), e só porque o HTML é sempre gerado por este módulo
	// (texto escapado, imagem embutida como data URI, sem navegação para conteúdo de
	// terceiros) — em produção o sandbox continua ativo.
	const launchArgs = process.env.CI ? ['--no-sandbox'] : [];
	const browser = await chromium.launch({ channel: 'chrome', args: launchArgs });
	try {
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: 'load' });
		const pdfBuffer = await page.pdf({ printBackground: true, preferCSSPageSize: true });
		return new Uint8Array(pdfBuffer);
	} finally {
		await browser.close();
	}
}
