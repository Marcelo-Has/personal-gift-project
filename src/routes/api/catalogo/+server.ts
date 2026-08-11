import { json } from '@sveltejs/kit';
import {
	getPublishedNarrativeStyles,
	getPublishedPhotoStyles,
	getPublishedSizes
} from '$lib/registry';
import type { RequestHandler } from './$types';

/**
 * Vitrine pública read-only do catálogo (issue #173): mesma leitura `published` que
 * `/` e `/estilo-e-tamanho` já fazem via `src/lib/registry.ts`, sem duplicar filtro
 * nem inventar chave — `(id, version)` é a mesma do registry (D-049). `path` fica de
 * fora da resposta: é caminho interno do skill, não dado de vitrine.
 */

const CACHE_CONTROL = 'public, max-age=300';

export const GET: RequestHandler = async () => {
	const styles = [
		...getPublishedNarrativeStyles().map(({ id, version, label }) => ({
			category: 'narrative-style' as const,
			id,
			version,
			label
		})),
		...getPublishedPhotoStyles().map(({ id, version, label }) => ({
			category: 'photo-style' as const,
			id,
			version,
			label
		}))
	];

	const sizes = getPublishedSizes().map(({ id, label, sku, pages }) => ({
		id,
		label,
		sku,
		pages
	}));

	return json(
		{ styles, sizes },
		{
			headers: { 'Cache-Control': CACHE_CONTROL }
		}
	);
};
