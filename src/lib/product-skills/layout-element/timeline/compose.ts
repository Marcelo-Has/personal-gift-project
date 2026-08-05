/**
 * Composição da skill `layout-element/timeline` (F2-05b).
 *
 * Recebe uma lista de marcos (`TimelineEntry[]`, saída de narrative-style) + os
 * parâmetros de layout do SKU (página, sangria, margem) e devolve a estrutura de
 * composição posicionada descrita em `definition.md`: uma linha horizontal com um
 * marcador por entrada, rótulo (título + descrição) alternando acima/abaixo da linha
 * para não sobrepor, sempre dentro da área segura (fora da sangria).
 *
 * Segue a convenção estabelecida por `polaroid-com-texto` (F2-05a): função pura,
 * determinística (mesma entrada → mesma saída, sem `Math.random`/relógio), que valida a
 * entrada e usa `resolveSkill` para carimbar id/versão da skill no resultado. Os tipos
 * `SkuLayoutParams`/`PositionedRect` são redefinidos aqui (mesmo formato) em vez de
 * importados de `polaroid-com-texto` — `.claude/rules/right-sizing.md` pede para não
 * extrair abstração compartilhada entre skills de layout-element nesta issue.
 */
import { resolveSkill } from '../../loader';

/** Máximo de marcos que cabem num único spread, conforme `definition.md`. Acima disso, rejeitada. */
export const MAX_ENTRIES_PER_SPREAD = 8;

/** Comprimento máximo do título de um marco (mesmo limite do contrato `TimelineEntry` de narrative-style). */
export const MAX_TITLE_LENGTH = 120;

/** Comprimento máximo da descrição de um marco (mesmo limite do contrato `TimelineEntry`). */
export const MAX_DESCRIPTION_LENGTH = 500;

/** Margem horizontal da linha em relação à área útil, como proporção da largura útil. */
const LINE_INSET_RATIO = 0.06;
/** Espessura da linha do tempo (mm). */
const LINE_THICKNESS_MM = 1;
/** Espaço entre a linha e a área de rótulo mais próxima (mm). */
const LABEL_GAP_MM = 4;
/** Fração do espaçamento entre marcadores vizinhos usada como largura do rótulo (deixa vão entre rótulos). */
const LABEL_WIDTH_SPACING_RATIO = 0.9;
/** Teto da largura do rótulo, como proporção da largura útil (evita rótulo gigante com poucos marcos). */
const MAX_LABEL_WIDTH_RATIO = 0.4;

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

/** Um marco da linha do tempo (mesmo formato de `TimelineEntry` de narrative-style/romantico). */
export interface TimelineMarkerInput {
	title: string;
	description: string;
}

export interface PositionedRect {
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
}

export interface TimelineMarkerPosition {
	title: string;
	description: string;
	/** Ponto do marcador sobre a linha (mm). */
	point: { xMm: number; yMm: number };
	/** Lado da linha em que o rótulo (título + descrição) fica, alternado marco a marco. */
	labelSide: 'above' | 'below';
	/** Área do rótulo (título + descrição) desse marco. */
	labelArea: PositionedRect;
}

export interface TimelineComposition {
	skillId: 'timeline';
	skillVersion: string;
	/** A linha do tempo em si (retângulo fino, horizontal). */
	line: PositionedRect;
	/**
	 * Um marcador por entrada, na mesma ordem da entrada. Lista vazia é uma composição
	 * válida (ver `definition.md`): a linha ainda é calculada, mas não há marcos.
	 */
	markers: TimelineMarkerPosition[];
}

/** Erro de validação da composição (ex.: excesso de marcos, título/descrição fora do limite). */
export class TimelineValidationError extends Error {}

function assertEntries(entries: TimelineMarkerInput[]): void {
	if (entries.length > MAX_ENTRIES_PER_SPREAD) {
		throw new TimelineValidationError(
			`${entries.length} marcos excedem o máximo de ${MAX_ENTRIES_PER_SPREAD} por spread ` +
				`definido em timeline/definition.md`
		);
	}
	entries.forEach((entry, index) => {
		if (entry.title.length === 0) {
			throw new TimelineValidationError(`marco ${index}: título vazio`);
		}
		if (entry.title.length > MAX_TITLE_LENGTH) {
			throw new TimelineValidationError(
				`marco ${index}: título com ${entry.title.length} caracteres excede o máximo de ` +
					`${MAX_TITLE_LENGTH} definido em timeline/definition.md`
			);
		}
		if (entry.description.length === 0) {
			throw new TimelineValidationError(`marco ${index}: descrição vazia`);
		}
		if (entry.description.length > MAX_DESCRIPTION_LENGTH) {
			throw new TimelineValidationError(
				`marco ${index}: descrição com ${entry.description.length} caracteres excede o máximo ` +
					`de ${MAX_DESCRIPTION_LENGTH} definido em timeline/definition.md`
			);
		}
	});
}

function assertSkuParams(sku: SkuLayoutParams): void {
	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	if (usableWidth <= 0 || usableHeight <= 0) {
		throw new TimelineValidationError(
			`parâmetros de SKU inválidos: página ${sku.pageWidthMm}x${sku.pageHeightMm}mm com ` +
				`sangria ${sku.bleedMm}mm + margem ${sku.safeMarginMm}mm não sobra área útil`
		);
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Compõe a linha do tempo dentro da área útil da página do SKU (fora da sangria).
 * Lança `TimelineValidationError` se houver mais marcos do que `MAX_ENTRIES_PER_SPREAD`,
 * se algum título/descrição estiver vazio ou acima do limite, se os parâmetros de SKU não
 * sobrarem área útil, ou se a área útil não sobrar altura suficiente para os rótulos.
 *
 * Lista vazia de marcos é uma composição válida (`markers: []`) — ver `definition.md`.
 */
export function composeTimeline(
	entries: TimelineMarkerInput[],
	sku: SkuLayoutParams
): TimelineComposition {
	assertEntries(entries);
	assertSkuParams(sku);

	const skill = resolveSkill('layout-element', 'timeline');

	const usableWidth = sku.pageWidthMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableHeight = sku.pageHeightMm - 2 * (sku.bleedMm + sku.safeMarginMm);
	const usableX = sku.bleedMm + sku.safeMarginMm;
	const usableY = sku.bleedMm + sku.safeMarginMm;

	const lineXStart = usableX + usableWidth * LINE_INSET_RATIO;
	const lineXEnd = usableX + usableWidth * (1 - LINE_INSET_RATIO);
	const lineWidthMm = lineXEnd - lineXStart;
	const lineY = usableY + usableHeight / 2;

	const labelHeightMm = (usableHeight - LINE_THICKNESS_MM) / 2 - LABEL_GAP_MM;
	if (labelHeightMm <= 0) {
		throw new TimelineValidationError(
			`área útil (${usableWidth.toFixed(1)}x${usableHeight.toFixed(1)}mm) do SKU informado não ` +
				`sobra altura suficiente para os rótulos da timeline (definition.md)`
		);
	}

	const line: PositionedRect = {
		xMm: lineXStart,
		yMm: lineY - LINE_THICKNESS_MM / 2,
		widthMm: lineWidthMm,
		heightMm: LINE_THICKNESS_MM
	};

	const n = entries.length;
	const spacingMm = n > 1 ? lineWidthMm / (n - 1) : lineWidthMm;
	const labelWidthMm = Math.min(spacingMm * LABEL_WIDTH_SPACING_RATIO, usableWidth * MAX_LABEL_WIDTH_RATIO);

	const markers: TimelineMarkerPosition[] = entries.map((entry, index) => {
		const pointX = n === 1 ? lineXStart + lineWidthMm / 2 : lineXStart + (lineWidthMm * index) / (n - 1);
		const labelSide: 'above' | 'below' = index % 2 === 0 ? 'above' : 'below';
		const labelYMm = labelSide === 'above' ? usableY : lineY + LINE_THICKNESS_MM / 2 + LABEL_GAP_MM;
		const labelXMm = clamp(pointX - labelWidthMm / 2, usableX, usableX + usableWidth - labelWidthMm);

		return {
			title: entry.title,
			description: entry.description,
			point: { xMm: pointX, yMm: lineY },
			labelSide,
			labelArea: { xMm: labelXMm, yMm: labelYMm, widthMm: labelWidthMm, heightMm: labelHeightMm }
		};
	});

	return {
		skillId: 'timeline',
		skillVersion: skill.version,
		line,
		markers
	};
}
