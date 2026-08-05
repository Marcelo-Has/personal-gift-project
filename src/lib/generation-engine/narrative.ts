/**
 * Motor de geração — orquestração da narrativa (F2-06a, issue #119).
 *
 * Dado um `Order` completo, resolve a skill de `narrative-style` certa por
 * `choice.narrativeStyleId` (via `resolveSkill`, F2-01) e devolve o `NarrativeBlocks`
 * correspondente. Novo estilo de narrativa = nova entrada em `NARRATIVE_GENERATORS` +
 * `registry.json` (`.claude/rules/product-skills.md`: "sem reescrever o motor").
 *
 * A validação de que toda `polaroidCaptions[].photoId` existe nas fotos do questionário
 * já é feita por `gerarNarrativaRomantica` (mesmo questionário, mesma checagem) — o motor
 * não a duplica, só deixa o `NarrativaInvalidaError` já tipado e descritivo se propagar.
 */
import type { ClaudeMessagesClient } from '$lib/server/claude';
import { resolveSkill, type ResolvedSkill } from '../product-skills/loader';
import {
	gerarNarrativaRomantica,
	type NarrativeBlocks
} from '../product-skills/narrative-style/romantico/generate';
import type { CoupleQuestionnaire, Order } from '../order';

type NarrativeGeneratorOptions = { client?: ClaudeMessagesClient; skill?: ResolvedSkill };
type NarrativeGenerator = (
	questionnaire: CoupleQuestionnaire,
	options?: NarrativeGeneratorOptions
) => Promise<NarrativeBlocks>;

/** Gerador de cada skill de `narrative-style` publicada no registry, por `id`. */
const NARRATIVE_GENERATORS: Record<string, NarrativeGenerator> = {
	romantico: gerarNarrativaRomantica
};

export interface GerarNarrativaDoPedidoOptions {
	client?: ClaudeMessagesClient;
	skill?: ResolvedSkill;
}

/**
 * Gera o `NarrativeBlocks` de um `Order`, resolvendo a skill de narrativa por
 * `choice.narrativeStyleId`.
 *
 * Lança erro descritivo se a skill não existir no registry (via `resolveSkill`), se não
 * houver gerador cablado no motor para aquele id, ou se alguma legenda de polaroid
 * referenciar um `photoId` fora do questionário do pedido (propagado da skill).
 */
export async function gerarNarrativaDoPedido(
	order: Order,
	{ client, skill }: GerarNarrativaDoPedidoOptions = {}
): Promise<NarrativeBlocks> {
	const resolvedSkill = skill ?? resolveSkill('narrative-style', order.choice.narrativeStyleId);

	const gerar = NARRATIVE_GENERATORS[resolvedSkill.id];
	if (!gerar) {
		throw new Error(
			`Motor de narrativa: nenhum gerador implementado para a skill "${resolvedSkill.id}" ` +
				'(existe no registry, mas falta cablar em NARRATIVE_GENERATORS).'
		);
	}

	return gerar(order.questionnaire, { client, skill: resolvedSkill });
}
