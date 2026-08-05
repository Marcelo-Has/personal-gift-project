/**
 * Custo real por chamada ao provedor de imagem (F2-04, [D-056]; `ARCHITECTURE.md` exige
 * "cada etapa registra o custo real por pedido").
 *
 * Preço por token do `gpt-image-1` (publicado pela OpenAI no momento desta
 * implementação — validar antes de usar para faturamento real): US$ 10 / 1M tokens de
 * imagem de entrada, US$ 40 / 1M tokens de imagem de saída. Este módulo só CALCULA e
 * registra o custo de uma chamada real; agregação por pedido/estilo (F4-04) é consumidora
 * deste log, não escopo desta issue.
 */

const INPUT_IMAGE_TOKEN_COST_USD = 10 / 1_000_000;
const OUTPUT_IMAGE_TOKEN_COST_USD = 40 / 1_000_000;

export interface PhotoStyleCallUsage {
	styleId: string;
	sourcePhotoId: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
}

export interface PhotoStyleCallCost extends PhotoStyleCallUsage {
	estimatedCostUsd: number;
}

/** Custo estimado, em USD, de uma chamada a partir do uso de tokens reportado pela API. */
export function estimateCallCostUsd(inputTokens: number, outputTokens: number): number {
	return inputTokens * INPUT_IMAGE_TOKEN_COST_USD + outputTokens * OUTPUT_IMAGE_TOKEN_COST_USD;
}

/**
 * Registra o custo real de uma chamada. Log estruturado (uma linha JSON) — sem infra de
 * ledger/agregação aqui (isso é F4-04); quem consome hoje é o próprio log do processo.
 */
export function recordPhotoStyleCallCost(usage: PhotoStyleCallUsage): PhotoStyleCallCost {
	const cost: PhotoStyleCallCost = {
		...usage,
		estimatedCostUsd: estimateCallCostUsd(usage.inputTokens, usage.outputTokens)
	};

	console.log(
		JSON.stringify({
			event: 'photo_style_provider_call_cost',
			...cost
		})
	);

	return cost;
}
