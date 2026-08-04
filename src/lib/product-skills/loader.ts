/**
 * Carregador versionado de skills de produto (F2-01).
 *
 * Dado categoria + id (+ versão opcional), resolve a entrada do `registry.json`
 * correspondente e confirma que a skill existe no disco. Base única para F2-02/03/05/06
 * carregarem skills, em vez de cada um reimplementar a leitura do registry.
 *
 * Convenção de chave (D-049): `id` sozinho NÃO identifica uma entrada — várias versões
 * do mesmo `id` podem coexistir no array da categoria (`.claude/rules/product-skills.md`:
 * melhorar um estilo = nova versão, preservando a anterior). É o par `(id, version)` que
 * identifica uma entrada de forma única; sem `version`, `resolveSkill` resolve a maior
 * versão *presente no registry* para aquele id (comparação semver, não a `status:
 * published` de F1-06 — as skills desta fase seguem `draft` e ainda assim precisam
 * resolver, ver D-049).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultRegistry, type ProductRegistry, type RegistrySkillEntry } from '../registry';

export const SKILL_CATEGORIES = ['narrative-style', 'photo-style', 'layout-element'] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** Skill resolvida: entrada do registry + categoria + caminho absoluto confirmado no disco. */
export interface ResolvedSkill extends RegistrySkillEntry {
	category: SkillCategory;
	absolutePath: string;
}

const PRODUCT_SKILLS_DIR = path.dirname(fileURLToPath(import.meta.url));

const SEMVER_RE =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/;

interface Semver {
	major: number;
	minor: number;
	patch: number;
	prerelease: string | null;
}

function parseSemver(version: string): Semver | null {
	const match = SEMVER_RE.exec(version);
	if (!match) {
		return null;
	}
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4] ?? null
	};
}

/** Compara duas versões semver: positivo se `a` > `b`, negativo se `a` < `b`, 0 se iguais. */
function compareSemver(a: Semver, b: Semver): number {
	if (a.major !== b.major) return a.major - b.major;
	if (a.minor !== b.minor) return a.minor - b.minor;
	if (a.patch !== b.patch) return a.patch - b.patch;
	if (a.prerelease === b.prerelease) return 0;
	if (a.prerelease === null) return 1;
	if (b.prerelease === null) return -1;
	return a.prerelease < b.prerelease ? -1 : 1;
}

function isSkillCategory(category: string): category is SkillCategory {
	return (SKILL_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Resolve uma skill do registry por categoria + id (+ versão opcional).
 *
 * Sem `version`, resolve a maior versão semver presente no registry para aquele id.
 * Lança erro descritivo (nunca `undefined`) quando categoria/id/versão não existem, quando
 * alguma entrada daquele id não tem versão semver válida, ou quando a pasta da skill ou o
 * `definition.md` não existem no disco.
 */
export function resolveSkill(
	category: string,
	id: string,
	version?: string,
	registry: ProductRegistry = defaultRegistry
): ResolvedSkill {
	if (!isSkillCategory(category)) {
		throw new Error(
			`categoria de skill inválida: "${category}" (use uma de: ${SKILL_CATEGORIES.join(', ')})`
		);
	}

	const matches = registry[category].filter((entry) => entry.id === id);
	if (matches.length === 0) {
		throw new Error(`skill "${id}" não encontrada na categoria "${category}"`);
	}

	const parsedByEntry = matches.map((entry) => {
		const parsed = parseSemver(entry.version);
		if (!parsed) {
			throw new Error(
				`skill "${category}/${id}": versão "${entry.version}" não é um semver válido`
			);
		}
		return { entry, parsed };
	});

	let resolved: RegistrySkillEntry;
	if (version !== undefined) {
		const exact = parsedByEntry.find(({ entry }) => entry.version === version);
		if (!exact) {
			throw new Error(`skill "${category}/${id}": versão "${version}" não encontrada`);
		}
		resolved = exact.entry;
	} else {
		resolved = parsedByEntry.reduce((highest, current) =>
			compareSemver(current.parsed, highest.parsed) > 0 ? current : highest
		).entry;
	}

	const absolutePath = path.join(PRODUCT_SKILLS_DIR, resolved.path);
	if (!existsSync(absolutePath)) {
		throw new Error(
			`skill "${category}/${id}" v${resolved.version}: pasta não encontrada em "${absolutePath}"`
		);
	}

	const definitionPath = path.join(absolutePath, 'definition.md');
	if (!existsSync(definitionPath)) {
		throw new Error(
			`skill "${category}/${id}" v${resolved.version}: definition.md não encontrado em "${definitionPath}"`
		);
	}

	return { ...resolved, category, absolutePath };
}
