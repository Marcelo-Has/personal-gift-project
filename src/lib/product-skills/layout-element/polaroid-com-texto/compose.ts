/**
 * Composição da skill `layout-element/polaroid-com-texto` (F2-05a).
 *
 * Recebe uma imagem (foto ou saída de photo-style) + uma legenda curta (saída de
 * narrative-style) + os parâmetros de layout do SKU (página, sangria, margem) e devolve
 * a estrutura de composição posicionada descrita em `definition.md`: moldura polaroid com
 * leve inclinação + legenda, sempre dentro da área segura (fora da sangria).
 *
 * Convenção que as próximas skills de layout-element (F2-05b/c/d) devem seguir: função
 * pura, determinística (mesma entrada → mesma saída, sem `Math.random`/relógio), que valida
 * a entrada e usa `resolveSkill` para carimbar id/versão da skill no resultado.
 */
import { resolveSkill } from '../../loader';

/** Comprimento máximo da legenda (caracteres), conforme `definition.md`. Acima disso, rejeitada. */
export const MAX_CAPTION_LENGTH = 80;

/** Proporção da largura útil da página ocupada pela moldura da polaroid. */
const FRAME_WIDTH_RATIO = 0.72;
/** Espessura da borda da moldura (mm) — separa foto/legenda da borda externa. */
const BORDER_MM = 6;
/** Altura da faixa de legenda, como proporção da largura da moldura (padrão polaroid). */
const CAPTION_BAND_RATIO = 0.24;
/** Faixa de inclinação da moldura (graus), para variar sem descaracterizar o estilo. */
const TILT_RANGE_DEG = 6;

export interface SkuLayoutParams {
	/** Largura da página de produção (mm), já incluindo sangria. */
	pageWidthMm: number;
	/** Altura da página de produção (mm), já incluindo sangria. */
	pageHeightMm: number;
	/** Sangria por lado (mm) — área que sai da página física; nunca pode conter texto. */
	bleedMm: number;
	/** Margem de segurança adicional (mm), medida a partir do fim da sangria. */
	safeMarginMm: number;
}

export interface PolaroidComTextoInput {
	image: {
		/** Caminho/URL da imagem de entrada (foto ou saída de photo-style). */
		path: string;
		widthPx: number;
		heightPx: number;
	};
	/** Legenda curta (saída de narrative-style), até `MAX_CAPTION_LENGTH` caracteres. */
	caption: string;
}

export interface PositionedRect {
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
}

export interface PolaroidComposition {
	skillId: 'polaroid-com-texto';
	skillVersion: string;
	/** Moldura da polaroid: retângulo externo + inclinação (graus, sentido anti-horário). */
	frame: {
		area: PositionedRect;
		rotationDeg: number;
	};
	/** Área da foto dentro da moldura (antes da inclinação ser aplicada). */
	photo: {
		path: string;
		area: PositionedRect;
	};
	/** Área da legenda dentro da moldura (antes da inclinação ser aplicada). */
	caption: {
		text: string;
		area: PositionedRect;
	};
}

/** Erro de validação da composição (ex.: legenda além do limite). Nunca lançado por bug de cálculo. */
export class PolaroidComTextoValidationError extends Error {}

function assertCaptionLength(caption: string): void {
	if (caption.length === 0) {
		throw new PolaroidComTextoValidationError('legenda vazia: polaroid-com-texto exige legenda');
	}
	if (caption.length > MAX_CAPTION_LENGTH) {
		throw new PolaroidComTextoValidationError(
			`legenda com ${caption.length} caracteres excede o máximo de ${MAX_CAPTION_LENGTH} ` +
				`definido em polaroid-com-texto/definition.md: "${caption}"`
		);
	}
}

function assertSkuParams(sku: SkuLayoutParams): void {
	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	if (usableWidth <= 0 || usableHeight <= 0) {
		throw new PolaroidComTextoValidationError(
			`parâmetros de SKU inválidos: página ${sku.pageWidthMm}x${sku.pageHeightMm}mm com ` +
				`sangria ${sku.bleedMm}mm + margem ${sku.safeMarginMm}mm não sobra área útil`
		);
	}
}

/**
 * Deriva uma inclinação determinística (mesma legenda → mesmo ângulo) na faixa
 * `[-TILT_RANGE_DEG, TILT_RANGE_DEG]`, para variar a moldura sem usar `Math.random`
 * (composição precisa ser reproduzível para golden samples/testes de estilo).
 */
function deterministicTiltDeg(caption: string): number {
	let hash = 0;
	for (let i = 0; i < caption.length; i++) {
		hash = (hash * 31 + caption.charCodeAt(i)) % 10000;
	}
	const normalized = (hash % (2 * TILT_RANGE_DEG * 100)) / 100 - TILT_RANGE_DEG;
	return Math.round(normalized * 10) / 10;
}

/**
 * Compõe a polaroid+legenda dentro da área útil da página do SKU (fora da sangria).
 * Lança `PolaroidComTextoValidationError` se a legenda ultrapassar `MAX_CAPTION_LENGTH`
 * (ou vier vazia) ou se os parâmetros de SKU não sobrarem área útil.
 */
export function composePolaroidComTexto(
	input: PolaroidComTextoInput,
	sku: SkuLayoutParams
): PolaroidComposition {
	assertCaptionLength(input.caption);
	assertSkuParams(sku);

	const skill = resolveSkill('layout-element', 'polaroid-com-texto');

	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const photoAspect = input.image.widthPx / input.image.heightPx;

	// Ajuste "contain": a moldura nunca deve passar de FRAME_WIDTH_RATIO da largura ÚTIL
	// nem da altura útil. Para fotos retrato (aspect < 1) em SKUs quadrados, o limite de
	// largura sozinho pode gerar uma moldura mais alta que a página — por isso o candidato
	// por largura é testado contra o teto de altura, e a largura é reduzida (resolvendo a
	// mesma equação de frameHeight para a altura-teto) quando ele não cabe.
	const maxFrameWidth = usableWidth * FRAME_WIDTH_RATIO;
	const maxFrameHeight = usableHeight * FRAME_WIDTH_RATIO;
	const frameHeightForWidth = (fw: number) =>
		BORDER_MM + (fw - 2 * BORDER_MM) / photoAspect + fw * CAPTION_BAND_RATIO;

	let frameWidth = maxFrameWidth;
	if (frameHeightForWidth(maxFrameWidth) > maxFrameHeight) {
		frameWidth =
			(maxFrameHeight - BORDER_MM + (2 * BORDER_MM) / photoAspect) /
			(1 / photoAspect + CAPTION_BAND_RATIO);
	}

	const innerPhotoWidth = frameWidth - 2 * BORDER_MM;
	const innerPhotoHeight = innerPhotoWidth / photoAspect;
	const captionBandHeight = frameWidth * CAPTION_BAND_RATIO;
	const frameHeight = BORDER_MM + innerPhotoHeight + captionBandHeight;

	if (innerPhotoWidth <= 0 || frameHeight > usableHeight) {
		throw new PolaroidComTextoValidationError(
			`moldura calculada (${frameWidth.toFixed(1)}x${frameHeight.toFixed(1)}mm) não cabe na ` +
				`área útil (${usableWidth.toFixed(1)}x${usableHeight.toFixed(1)}mm) do SKU informado`
		);
	}

	const frameX = sku.bleedMm + sku.safeMarginMm + (usableWidth - frameWidth) / 2;
	const frameY = sku.bleedMm + sku.safeMarginMm + (usableHeight - frameHeight) / 2;

	const photoArea: PositionedRect = {
		xMm: frameX + BORDER_MM,
		yMm: frameY + BORDER_MM,
		widthMm: innerPhotoWidth,
		heightMm: innerPhotoHeight
	};

	const captionArea: PositionedRect = {
		xMm: frameX + BORDER_MM,
		yMm: frameY + BORDER_MM + innerPhotoHeight,
		widthMm: frameWidth - 2 * BORDER_MM,
		heightMm: captionBandHeight - BORDER_MM
	};

	return {
		skillId: 'polaroid-com-texto',
		skillVersion: skill.version,
		frame: {
			area: { xMm: frameX, yMm: frameY, widthMm: frameWidth, heightMm: frameHeight },
			rotationDeg: deterministicTiltDeg(input.caption)
		},
		photo: { path: input.image.path, area: photoArea },
		caption: { text: input.caption, area: captionArea }
	};
}
