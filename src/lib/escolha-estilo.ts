/**
 * Lógica pura da tela `/estilo-e-tamanho`: monta as opções a partir do registry,
 * decide se o catálogo está incompleto e valida uma escolha contra os ids `published`.
 * Ver `src/lib/registry.ts` (única fonte do catálogo) e `src/lib/order.ts` (`StyleAndSizeChoice`).
 */
import {
	getPublishedNarrativeStyles,
	getPublishedPhotoStyles,
	getPublishedSizes,
	type ProductRegistry
} from './registry';
import type { StyleAndSizeChoice } from './order';

export interface OpcaoEscolha {
	id: string;
	label: string;
}

export interface OpcoesEstiloETamanho {
	narrativeStyles: OpcaoEscolha[];
	photoStyles: OpcaoEscolha[];
	sizes: OpcaoEscolha[];
}

/** Monta as três listas de opções a partir das entradas `published` do registry. */
export function montarOpcoes(registry?: ProductRegistry): OpcoesEstiloETamanho {
	return {
		narrativeStyles: getPublishedNarrativeStyles(registry).map(({ id, label }) => ({
			id,
			label
		})),
		photoStyles: getPublishedPhotoStyles(registry).map(({ id, label }) => ({ id, label })),
		sizes: getPublishedSizes(registry).map(({ id, label }) => ({ id, label }))
	};
}

/**
 * O catálogo está incompleto quando QUALQUER uma das três listas está vazia — publicar
 * só parte do catálogo (ex.: tamanhos sem estilo de narrativa) não dá um produto vendável.
 */
export function catalogoIncompleto(opcoes: OpcoesEstiloETamanho): boolean {
	return (
		opcoes.narrativeStyles.length === 0 ||
		opcoes.photoStyles.length === 0 ||
		opcoes.sizes.length === 0
	);
}

/**
 * Valida uma escolha contra os ids `published` do registry: um id `draft` ou inexistente
 * é recusado (única defesa hoje contra o comentário de `order.ts` sobre ids `published`).
 */
export function validarEscolha(
	choice: StyleAndSizeChoice,
	registry?: ProductRegistry
): boolean {
	const opcoes = montarOpcoes(registry);

	return (
		opcoes.narrativeStyles.some((opcao) => opcao.id === choice.narrativeStyleId) &&
		opcoes.photoStyles.some((opcao) => opcao.id === choice.photoStyleId) &&
		opcoes.sizes.some((opcao) => opcao.id === choice.sizeId)
	);
}
