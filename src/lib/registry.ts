/**
 * Leitor do catálogo de skills do produto (`src/lib/product-skills/registry.json`).
 * Única fonte do catálogo (ver .claude/rules/product-skills.md) — nada de hardcode
 * de estilos/tamanhos em outro lugar do código.
 */
import registryJson from './product-skills/registry.json';

export type SkillStatus = 'draft' | 'published';

export interface RegistrySize {
	id: string;
	label: string;
	sku: string;
	pages: number;
	status: SkillStatus;
}

export interface RegistrySkillEntry {
	id: string;
	version: string;
	label: string;
	path: string;
	status: SkillStatus;
}

export interface ProductRegistry {
	sizes: RegistrySize[];
	'narrative-style': RegistrySkillEntry[];
	'photo-style': RegistrySkillEntry[];
	'layout-element': RegistrySkillEntry[];
}

const CATEGORIES = ['sizes', 'narrative-style', 'photo-style', 'layout-element'] as const;

function isValidEntry(entry: unknown): entry is { id: string; label: string; status: string } {
	return (
		typeof entry === 'object' &&
		entry !== null &&
		typeof (entry as Record<string, unknown>).id === 'string' &&
		typeof (entry as Record<string, unknown>).label === 'string' &&
		typeof (entry as Record<string, unknown>).status === 'string'
	);
}

/** Valida o formato mínimo do registry: cada categoria é uma lista de entradas com id/label/status. */
export function parseRegistry(raw: unknown): ProductRegistry {
	if (typeof raw !== 'object' || raw === null) {
		throw new Error('registry.json inválido: raiz deve ser um objeto');
	}

	for (const category of CATEGORIES) {
		const entries = (raw as Record<string, unknown>)[category];
		if (!Array.isArray(entries) || !entries.every(isValidEntry)) {
			throw new Error(`registry.json inválido: categoria "${category}" malformada`);
		}
	}

	return raw as ProductRegistry;
}

const defaultRegistry = parseRegistry(registryJson);

function published<T extends { status: string }>(entries: T[]): T[] {
	return entries.filter((entry) => entry.status === 'published');
}

export function getPublishedSizes(registry: ProductRegistry = defaultRegistry): RegistrySize[] {
	return published(registry.sizes);
}

export function getPublishedNarrativeStyles(
	registry: ProductRegistry = defaultRegistry
): RegistrySkillEntry[] {
	return published(registry['narrative-style']);
}

export function getPublishedPhotoStyles(
	registry: ProductRegistry = defaultRegistry
): RegistrySkillEntry[] {
	return published(registry['photo-style']);
}

export function getPublishedLayoutElements(
	registry: ProductRegistry = defaultRegistry
): RegistrySkillEntry[] {
	return published(registry['layout-element']);
}
