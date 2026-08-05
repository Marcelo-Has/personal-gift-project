/**
 * Composição da skill `layout-element/dedicatoria` (F2-05d).
 *
 * Recebe o texto de `dedication` (saída de narrative-style, até `MAX_DEDICATION_LENGTH`
 * caracteres) + os parâmetros de layout do SKU (página, sangria, margem) e devolve a
 * estrutura de composição posicionada descrita em `definition.md`: bloco de texto
 * centralizado na área útil da página de abertura/dedicatória.
 *
 * Segue a convenção de `polaroid-com-texto` (F2-05a): função pura, determinística (mesma
 * entrada → mesma saída), que valida a entrada e usa `resolveSkill` para carimbar
 * id/versão da skill no resultado.
 */
import { resolveSkill } from '../../loader';
import type { SkuLayoutParams, PositionedRect } from '../polaroid-com-texto/compose';

export type { SkuLayoutParams, PositionedRect };

/** Comprimento máximo do texto (caracteres), conforme `definition.md`. Acima disso, rejeitado. */
export const MAX_DEDICATION_LENGTH = 500;

/** Proporção da largura útil da página ocupada pelo bloco de texto. */
const TEXT_BLOCK_WIDTH_RATIO = 0.6;
/** Largura média estimada de um caractere (mm), para estimar quantas linhas o texto ocupa. */
const AVG_CHAR_WIDTH_MM = 2.2;
/** Altura de linha estimada (mm), para a tipografia de abertura descrita em `definition.md`. */
const LINE_HEIGHT_MM = 6;
/** Teto do bloco de texto como proporção da altura útil — mesmo dentro do limite de caracteres. */
const MAX_TEXT_HEIGHT_RATIO = 0.7;

export interface DedicatoriaInput {
	/** Texto da dedicatória (saída de narrative-style), até `MAX_DEDICATION_LENGTH` caracteres. */
	dedication: string;
}

export interface DedicatoriaComposition {
	skillId: 'dedicatoria';
	skillVersion: string;
	/** Área útil da página (fora de sangria + margem de segurança), para referência de contexto. */
	page: {
		area: PositionedRect;
	};
	/** Bloco de texto centralizado dentro da área útil. */
	text: {
		content: string;
		area: PositionedRect;
	};
}

/** Erro de validação da composição (ex.: texto além do limite ou sem espaço na página). */
export class DedicatoriaValidationError extends Error {}

function assertDedicationLength(dedication: string): void {
	if (dedication.length === 0) {
		throw new DedicatoriaValidationError('texto vazio: dedicatoria exige um texto de dedicatória');
	}
	if (dedication.length > MAX_DEDICATION_LENGTH) {
		throw new DedicatoriaValidationError(
			`texto com ${dedication.length} caracteres excede o máximo de ${MAX_DEDICATION_LENGTH} ` +
				`definido em dedicatoria/definition.md`
		);
	}
}

function assertSkuParams(sku: SkuLayoutParams): void {
	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	if (usableWidth <= 0 || usableHeight <= 0) {
		throw new DedicatoriaValidationError(
			`parâmetros de SKU inválidos: página ${sku.pageWidthMm}x${sku.pageHeightMm}mm com ` +
				`sangria ${sku.bleedMm}mm + margem ${sku.safeMarginMm}mm não sobra área útil`
		);
	}
}

/**
 * Compõe o texto de dedicatória centralizado na área útil da página do SKU (fora da
 * sangria). Lança `DedicatoriaValidationError` se o texto ultrapassar
 * `MAX_DEDICATION_LENGTH` (ou vier vazio), se os parâmetros de SKU não sobrarem área útil,
 * ou se o bloco de texto estimado não couber dentro de `MAX_TEXT_HEIGHT_RATIO` da altura
 * útil do SKU informado.
 */
export function composeDedicatoria(
	input: DedicatoriaInput,
	sku: SkuLayoutParams
): DedicatoriaComposition {
	assertDedicationLength(input.dedication);
	assertSkuParams(sku);

	const skill = resolveSkill('layout-element', 'dedicatoria');

	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);

	const textBlockWidth = usableWidth * TEXT_BLOCK_WIDTH_RATIO;
	const charsPerLine = Math.max(1, Math.floor(textBlockWidth / AVG_CHAR_WIDTH_MM));
	const lines = Math.ceil(input.dedication.length / charsPerLine);
	const textBlockHeight = lines * LINE_HEIGHT_MM;

	const maxTextBlockHeight = usableHeight * MAX_TEXT_HEIGHT_RATIO;
	if (textBlockHeight > maxTextBlockHeight) {
		throw new DedicatoriaValidationError(
			`bloco de texto estimado (${lines} linhas, ${textBlockHeight.toFixed(1)}mm) não cabe no ` +
				`espaço disponível (máximo ${maxTextBlockHeight.toFixed(1)}mm) do SKU informado`
		);
	}

	const pageX = sku.bleedMm + sku.safeMarginMm;
	const pageY = sku.bleedMm + sku.safeMarginMm;

	const textArea: PositionedRect = {
		xMm: pageX + (usableWidth - textBlockWidth) / 2,
		yMm: pageY + (usableHeight - textBlockHeight) / 2,
		widthMm: textBlockWidth,
		heightMm: textBlockHeight
	};

	return {
		skillId: 'dedicatoria',
		skillVersion: skill.version,
		page: {
			area: { xMm: pageX, yMm: pageY, widthMm: usableWidth, heightMm: usableHeight }
		},
		text: { content: input.dedication, area: textArea }
	};
}
