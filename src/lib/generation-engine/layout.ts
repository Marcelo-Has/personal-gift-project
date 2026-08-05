/**
 * Motor de geração — composição dos spreads finais de layout (F2-06c, issue #121).
 *
 * Dado um `Order` + o `NarrativeBlocks` (F2-06a) + o `StylizedPhoto[]` (F2-06b) já
 * gerados, monta a lista ORDENADA de spreads do livro chamando os `compose*` das quatro
 * skills de `layout-element` (F2-05a/b/c/d) via `resolveSkill` — só estrutura
 * (retângulos/posições/refs), nunca bitmap renderizado nem PDF (isso é F2-08/F2-09).
 *
 * Mapeamento de bloco de narrativa → skill de layout-element (D-061, sem skill dedicada a
 * "capítulo"/"abertura"):
 * - `opening` e `dedication` → `dedicatoria` (bloco de texto centralizado genérico — o
 *   campo se chama "dedication" na skill, mas o compose não lê semântica alguma do texto).
 * - cada `chapters[]` → `carta` (título + texto colados num único bloco; `carta` já
 *   pagina texto livre e rejeita o que não cabe em `MAX_PAGES`, sem acoplamento a
 *   "carta final" especificamente).
 * - cada `polaroidCaptions[]` → `polaroid-com-texto`, casado por `photoId` contra
 *   `StylizedPhoto.sourcePhotoId`.
 * - `timeline` → `timeline`, em grupos de até `MAX_ENTRIES_PER_SPREAD` (a skill rejeita
 *   grupos maiores).
 * - `finalLetter` → `carta`.
 *
 * Orçamento de páginas: `registry.json` > `sizes[].pages` (32 para o SKU mini,
 * `docs/PRODUCT.md` §5) é o teto. Cada spread contribui o número de páginas que a skill
 * que o compôs devolveu (`carta` pode devolver mais de uma; as demais sempre 1). Estoura
 * o teto → `LayoutPageBudgetExceededError`, nunca corta conteúdo (mesmo princípio de
 * D-051/D-054/D-055).
 */
import { MINI_SKU_LAYOUT, MINI_SKU_PHOTO_PARAMS } from '../fixtures/pedido-exemplo';
import type { Order } from '../order';
import {
	composeCarta,
	type CartaComposition,
	type SkuLayoutParams
} from '../product-skills/layout-element/carta/compose';
import {
	composeDedicatoria,
	type DedicatoriaComposition
} from '../product-skills/layout-element/dedicatoria/compose';
import {
	composePolaroidComTexto,
	type PolaroidComposition
} from '../product-skills/layout-element/polaroid-com-texto/compose';
import {
	composeTimeline,
	MAX_ENTRIES_PER_SPREAD,
	type TimelineComposition,
	type TimelineMarkerInput
} from '../product-skills/layout-element/timeline/compose';
import type {
	NarrativeBlocks,
	NarrativeChapter,
	PolaroidCaption
} from '../product-skills/narrative-style/romantico/generate';
import { resolveSkill } from '../product-skills/loader';
import type { StylizedPhoto } from '../product-skills/photo-style/provider';
import { defaultRegistry } from '../registry';

/** Geometria de página derivada por `sizeId` — só o SKU mini está aqui (mesmo motivo de
 * `photos.ts`: é o único com página de produção decidida, `docs/PRODUCT.md` §5). */
const SKU_LAYOUT_PARAMS_BY_SIZE_ID: Record<string, SkuLayoutParams> = {
	[MINI_SKU_PHOTO_PARAMS.sizeId]: MINI_SKU_LAYOUT
};

export type LayoutSpreadType =
	'abertura' | 'capitulo' | 'polaroid' | 'timeline' | 'carta' | 'dedicatoria';

export interface LayoutSpread {
	type: LayoutSpreadType;
	/** Páginas ocupadas por este spread (quase sempre 1; `carta` pode devolver mais). */
	pageCount: number;
	composition:
		DedicatoriaComposition | CartaComposition | PolaroidComposition | TimelineComposition;
}

export interface GeneratedBook {
	sizeId: string;
	pageBudget: number;
	totalPages: number;
	spreads: LayoutSpread[];
}

/** Lançado quando o `sizeId` do pedido não existe no registry ou não tem geometria derivada. */
export class LayoutUnknownSizeError extends Error {}

/** Lançado quando uma legenda de polaroid referencia um `photoId` sem `StylizedPhoto`
 * correspondente — F2-06a e F2-06b rodaram sobre o mesmo pedido, mas produziram saídas
 * que não batem entre si. */
export class LayoutMissingStylizedPhotoError extends Error {}

/** Lançado quando a soma de páginas dos spreads estoura o orçamento do SKU. Nunca é
 * lançado por corte de conteúdo — quem chama decide o que fazer (mesmo princípio de
 * D-051/D-054/D-055). */
export class LayoutPageBudgetExceededError extends Error {}

function getSkuLayoutParams(sizeId: string): SkuLayoutParams {
	const params = SKU_LAYOUT_PARAMS_BY_SIZE_ID[sizeId];
	if (!params) {
		throw new LayoutUnknownSizeError(
			`generation-engine/layout: sizeId "${sizeId}" sem SkuLayoutParams derivado ` +
				`(tamanhos disponíveis: ${Object.keys(SKU_LAYOUT_PARAMS_BY_SIZE_ID).join(', ')})`
		);
	}
	return params;
}

function getPageBudget(sizeId: string): number {
	const entry = defaultRegistry.sizes.find((size) => size.id === sizeId);
	if (!entry) {
		throw new LayoutUnknownSizeError(
			`generation-engine/layout: sizeId "${sizeId}" não existe no registry (tamanhos: ` +
				`${defaultRegistry.sizes.map((size) => size.id).join(', ')})`
		);
	}
	return entry.pages;
}

/** `compose*` de cada skill de `layout-element`, indexado pelo `id` que `resolveSkill`
 * devolve — nunca chamado direto, sempre depois de resolver a skill no registry. */
const CARTA_COMPOSERS: Record<string, typeof composeCarta> = { carta: composeCarta };
const DEDICATORIA_COMPOSERS: Record<string, typeof composeDedicatoria> = {
	dedicatoria: composeDedicatoria
};
const POLAROID_COM_TEXTO_COMPOSERS: Record<string, typeof composePolaroidComTexto> = {
	'polaroid-com-texto': composePolaroidComTexto
};
const TIMELINE_COMPOSERS: Record<string, typeof composeTimeline> = { timeline: composeTimeline };

/** Resolve uma skill de `layout-element` pelo registry e devolve o `compose*` cablado
 * para o `id` resolvido. Mesmo padrão de `getPhotoStyleProvider` (`photos.ts`, F2-06b):
 * a resolução de versão/existência é sempre via `resolveSkill`, nunca por import direto. */
function resolveLayoutElementComposer<T>(id: string, composers: Record<string, T>): T {
	const resolved = resolveSkill('layout-element', id);
	const composer = composers[resolved.id];
	if (!composer) {
		throw new Error(
			`generation-engine/layout: nenhum composer implementado para "layout-element/${resolved.id}" ` +
				`(o registry resolveu v${resolved.version}, mas o motor só conhece: ` +
				`${Object.keys(composers).join(', ')})`
		);
	}
	return composer;
}

/** Composers das quatro skills de `layout-element` usadas por `composeLayoutForOrder`,
 * já resolvidas via `resolveSkill` (registry + versão), não por import direto. */
interface LayoutElementComposers {
	carta: typeof composeCarta;
	dedicatoria: typeof composeDedicatoria;
	polaroidComTexto: typeof composePolaroidComTexto;
	timeline: typeof composeTimeline;
}

function resolveLayoutElementComposers(): LayoutElementComposers {
	return {
		carta: resolveLayoutElementComposer('carta', CARTA_COMPOSERS),
		dedicatoria: resolveLayoutElementComposer('dedicatoria', DEDICATORIA_COMPOSERS),
		polaroidComTexto: resolveLayoutElementComposer(
			'polaroid-com-texto',
			POLAROID_COM_TEXTO_COMPOSERS
		),
		timeline: resolveLayoutElementComposer('timeline', TIMELINE_COMPOSERS)
	};
}

function composeAbertura(
	opening: string,
	sku: SkuLayoutParams,
	composers: LayoutElementComposers
): LayoutSpread {
	return {
		type: 'abertura',
		pageCount: 1,
		composition: composers.dedicatoria({ dedication: opening }, sku)
	};
}

function composeCapitulos(
	chapters: NarrativeChapter[],
	sku: SkuLayoutParams,
	composers: LayoutElementComposers
): LayoutSpread[] {
	return chapters.map((chapter) => {
		const composition = composers.carta({ text: `${chapter.title}\n\n${chapter.text}` }, sku);
		return { type: 'capitulo', pageCount: composition.pageCount, composition };
	});
}

function composePolaroids(
	captions: PolaroidCaption[],
	photos: StylizedPhoto[],
	sku: SkuLayoutParams,
	composers: LayoutElementComposers
): LayoutSpread[] {
	return captions.map((caption) => {
		const photo = photos.find((candidate) => candidate.sourcePhotoId === caption.photoId);
		if (!photo) {
			throw new LayoutMissingStylizedPhotoError(
				`generation-engine/layout: legenda de polaroid referencia photoId "${caption.photoId}" ` +
					'sem StylizedPhoto correspondente entre as fotos estilizadas do pedido'
			);
		}
		const composition = composers.polaroidComTexto(
			{
				image: {
					path: photo.sourcePhotoId,
					widthPx: photo.metadata.widthPx,
					heightPx: photo.metadata.heightPx
				},
				caption: caption.caption
			},
			sku
		);
		return { type: 'polaroid', pageCount: 1, composition };
	});
}

function composeTimelineSpreads(
	entries: TimelineMarkerInput[],
	sku: SkuLayoutParams,
	composers: LayoutElementComposers
): LayoutSpread[] {
	const groups: TimelineMarkerInput[][] = [];
	for (let i = 0; i < entries.length; i += MAX_ENTRIES_PER_SPREAD) {
		groups.push(entries.slice(i, i + MAX_ENTRIES_PER_SPREAD));
	}
	return groups.map((group) => ({
		type: 'timeline',
		pageCount: 1,
		composition: composers.timeline(group, sku)
	}));
}

function composeCartaFinal(
	finalLetter: string,
	sku: SkuLayoutParams,
	composers: LayoutElementComposers
): LayoutSpread {
	const composition = composers.carta({ text: finalLetter }, sku);
	return { type: 'carta', pageCount: composition.pageCount, composition };
}

function composeDedicatoriaFinal(
	dedication: string,
	sku: SkuLayoutParams,
	composers: LayoutElementComposers
): LayoutSpread {
	return {
		type: 'dedicatoria',
		pageCount: 1,
		composition: composers.dedicatoria({ dedication }, sku)
	};
}

/**
 * Compõe a lista ordenada de spreads do livro: abertura, capítulos, polaroids com
 * legenda, linha do tempo, carta final e dedicatória — nessa ordem.
 *
 * Lança `LayoutUnknownSizeError` se `order.choice.sizeId` não tiver geometria/orçamento
 * derivados, `LayoutMissingStylizedPhotoError` se alguma legenda de polaroid não tiver
 * `StylizedPhoto` correspondente, `LayoutPageBudgetExceededError` se a soma de páginas
 * estourar o orçamento do SKU, ou qualquer `*ValidationError` das skills de
 * `layout-element` propagada sem alteração (ex.: `CartaValidationError` de um capítulo
 * que não cabe em `MAX_PAGES`).
 */
export function composeLayoutForOrder(
	order: Order,
	narrative: NarrativeBlocks,
	photos: StylizedPhoto[]
): GeneratedBook {
	const sizeId = order.choice.sizeId;
	const sku = getSkuLayoutParams(sizeId);
	const pageBudget = getPageBudget(sizeId);
	const composers = resolveLayoutElementComposers();

	const spreads: LayoutSpread[] = [
		composeAbertura(narrative.opening, sku, composers),
		...composeCapitulos(narrative.chapters, sku, composers),
		...composePolaroids(narrative.polaroidCaptions, photos, sku, composers),
		...composeTimelineSpreads(narrative.timeline, sku, composers),
		composeCartaFinal(narrative.finalLetter, sku, composers),
		composeDedicatoriaFinal(narrative.dedication, sku, composers)
	];

	const totalPages = spreads.reduce((sum, spread) => sum + spread.pageCount, 0);
	if (totalPages > pageBudget) {
		throw new LayoutPageBudgetExceededError(
			`generation-engine/layout: pedido precisa de ${totalPages} páginas, acima do orçamento ` +
				`de ${pageBudget} páginas do SKU "${sizeId}" (docs/PRODUCT.md §5) — reduza capítulos, ` +
				'polaroids ou marcos da linha do tempo do pedido em vez de truncar o conteúdo gerado.'
		);
	}

	return { sizeId, pageBudget, totalPages, spreads };
}
