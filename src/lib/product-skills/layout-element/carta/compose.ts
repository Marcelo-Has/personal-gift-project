/**
 * Composição da skill `layout-element/carta` (F2-05c).
 *
 * Recebe o texto de `finalLetter` (saída de `narrative-style/romantico`, até 3000
 * caracteres) + os parâmetros de layout do SKU (página, sangria, margem) e devolve a
 * estrutura de composição posicionada descrita em `definition.md`: uma ou mais páginas de
 * carta, cada uma com a área de texto dentro da área segura (fora da sangria).
 *
 * Segue a convenção estabelecida por `layout-element/polaroid-com-texto` (F2-05a): função
 * pura, determinística, que valida a entrada e usa `resolveSkill` para carimbar id/versão
 * da skill no resultado. `SkuLayoutParams` é duplicado aqui de propósito —
 * `.claude/rules/right-sizing.md` pede para não extrair abstração compartilhada entre
 * skills de layout-element nesta fase.
 */
import { resolveSkill } from '../../loader';

/**
 * Comprimento máximo do texto da carta (caracteres), espelhando o `.max()` de `finalLetter`
 * em `narrative-style/romantico`. Duplicado aqui (não importado) para manter o contrato
 * desta skill isolado, conforme `.claude/rules/product-skills.md`.
 */
export const MAX_LETTER_LENGTH = 3000;

/** Número máximo de páginas que a carta pode ocupar — ver `definition.md`. */
export const MAX_PAGES = 2;

/** Respiro (mm) entre a área segura da página e o bloco de texto da carta. */
const PAGE_PADDING_MM = 8;
/** Tamanho de fonte estimado (mm), usado só para estimar quanto texto cabe por página. */
const FONT_SIZE_MM = 4.5;
/** Proporção altura de linha / tamanho de fonte (espaçamento entre linhas). */
const LINE_HEIGHT_RATIO = 1.5;
/** Largura média estimada de um caractere, como proporção do tamanho da fonte. */
const AVG_CHAR_WIDTH_RATIO = 0.55;

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

export interface CartaInput {
	/** Texto de `finalLetter` (saída de narrative-style), até `MAX_LETTER_LENGTH` caracteres. */
	text: string;
}

export interface PositionedRect {
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
}

export interface CartaPage {
	/** Índice da página dentro da carta (0-based; 0 = primeira página). */
	pageIndex: number;
	/** Trecho do texto original posicionado nesta página (ver `paginateLetter`). */
	text: string;
	/** Área do bloco de texto dentro da área segura da página (fora de sangria/margem). */
	area: PositionedRect;
}

export interface CartaComposition {
	skillId: 'carta';
	skillVersion: string;
	pageCount: number;
	pages: CartaPage[];
}

/** Erro de validação da composição (texto vazio/longo demais, SKU inválido, ou texto que não cabe em `MAX_PAGES`). Nunca lançado por bug de cálculo. */
export class CartaValidationError extends Error {}

function assertLetterText(text: string): void {
	if (text.length === 0) {
		throw new CartaValidationError('texto vazio: carta exige o texto de finalLetter');
	}
	if (text.length > MAX_LETTER_LENGTH) {
		throw new CartaValidationError(
			`texto com ${text.length} caracteres excede o máximo de ${MAX_LETTER_LENGTH} ` +
				`definido em carta/definition.md`
		);
	}
}

function assertSkuParams(sku: SkuLayoutParams): void {
	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	if (usableWidth <= 2 * PAGE_PADDING_MM || usableHeight <= 2 * PAGE_PADDING_MM) {
		throw new CartaValidationError(
			`parâmetros de SKU inválidos: página ${sku.pageWidthMm}x${sku.pageHeightMm}mm com ` +
				`sangria ${sku.bleedMm}mm + margem ${sku.safeMarginMm}mm não sobra área útil para o ` +
				`respiro de ${PAGE_PADDING_MM}mm da carta`
		);
	}
}

/**
 * Divide `text` em páginas de até `charsPerPage` caracteres, quebrando só em limites de
 * palavra (nunca no meio de uma palavra) — mesma decisão de `polaroid-com-texto`: melhor
 * mover a palavra inteira para a página seguinte do que arriscar um corte sem sentido.
 * Espaços em sequência (incluindo quebras de linha) são normalizados para um único espaço;
 * a quebra de parágrafo original não é preservada nesta v1 — fica para a renderização real
 * em F2-06+, fora de escopo aqui (golden sample é estrutura, não bitmap renderizado).
 */
function paginateLetter(text: string, charsPerPage: number): string[] {
	const words = text.split(/\s+/).filter((word) => word.length > 0);
	const pages: string[] = [];
	let current = '';

	for (const word of words) {
		const candidate = current.length === 0 ? word : `${current} ${word}`;
		if (candidate.length > charsPerPage && current.length > 0) {
			pages.push(current);
			current = word;
		} else {
			current = candidate;
		}
	}
	if (current.length > 0) {
		pages.push(current);
	}
	return pages;
}

/**
 * Compõe a carta dentro da área útil da página do SKU (fora da sangria), paginando em até
 * `MAX_PAGES` páginas quando o texto não cabe em uma única. Lança `CartaValidationError` se
 * o texto vier vazio, ultrapassar `MAX_LETTER_LENGTH`, se os parâmetros de SKU não sobrarem
 * área útil, ou se nem `MAX_PAGES` páginas forem suficientes para o texto.
 */
export function composeCarta(input: CartaInput, sku: SkuLayoutParams): CartaComposition {
	assertLetterText(input.text);
	assertSkuParams(sku);

	const skill = resolveSkill('layout-element', 'carta');

	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const textAreaWidth = usableWidth - 2 * PAGE_PADDING_MM;
	const textAreaHeight = usableHeight - 2 * PAGE_PADDING_MM;

	const lineHeightMm = FONT_SIZE_MM * LINE_HEIGHT_RATIO;
	const avgCharWidthMm = FONT_SIZE_MM * AVG_CHAR_WIDTH_RATIO;
	const linesPerPage = Math.floor(textAreaHeight / lineHeightMm);
	const charsPerLine = Math.floor(textAreaWidth / avgCharWidthMm);
	const charsPerPage = linesPerPage * charsPerLine;

	const pageTexts = paginateLetter(input.text, charsPerPage);
	if (pageTexts.length > MAX_PAGES) {
		throw new CartaValidationError(
			`texto de ${input.text.length} caracteres precisaria de ${pageTexts.length} páginas ` +
				`para caber no SKU informado (capacidade estimada de ${charsPerPage} caracteres por ` +
				`página), acima do máximo de ${MAX_PAGES} definido em carta/definition.md`
		);
	}

	const textArea: PositionedRect = {
		xMm: sku.bleedMm + sku.safeMarginMm + PAGE_PADDING_MM,
		yMm: sku.bleedMm + sku.safeMarginMm + PAGE_PADDING_MM,
		widthMm: textAreaWidth,
		heightMm: textAreaHeight
	};

	const pages: CartaPage[] = pageTexts.map((text, pageIndex) => ({
		pageIndex,
		text,
		area: textArea
	}));

	return {
		skillId: 'carta',
		skillVersion: skill.version,
		pageCount: pages.length,
		pages
	};
}
