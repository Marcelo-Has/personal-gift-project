import { json } from '@sveltejs/kit';
import {
	getPublishedNarrativeStyles,
	getPublishedPhotoStyles,
	getPublishedSizes
} from '$lib/registry';
import type { RequestHandler } from './$types';

/**
 * Catálogo público (issue #163): vitrine read-only sobre `registry.ts`, a única fonte do
 * catálogo (`.claude/rules/product-skills.md`) — sem reimplementar leitura nem filtro de
 * `published`. `path` (interno ao registry) fica de fora da resposta; o catálogo é público.
 */
export const GET: RequestHandler = () => {
	const styles = [
		...getPublishedNarrativeStyles().map(({ id, version, label }) => ({
			id,
			version,
			label,
			category: 'narrative-style' as const
		})),
		...getPublishedPhotoStyles().map(({ id, version, label }) => ({
			id,
			version,
			label,
			category: 'photo-style' as const
		}))
	];

	const sizes = getPublishedSizes().map(({ id, label, sku, pages }) => ({
		id,
		label,
		sku,
		pages
	}));

	return json({ styles, sizes }, { headers: { 'Cache-Control': 'public, max-age=300' } });
};
