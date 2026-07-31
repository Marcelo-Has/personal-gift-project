/**
 * Rate limiting básico para rotas do servidor (F1-05b, issue #32).
 *
 * `.claude/rules/security.md`: "rate limiting e limites de upload em rotas públicas".
 * Implementado como janela deslizante num `Map<chave, number[]>` em memória — sem
 * Redis/Firestore. Em ambiente serverless cada instância tem o seu próprio `Map`, então
 * isto não é rate limit distribuído: um mesmo uid pode ter mais requisições liberadas do
 * que `maxRequests` se cair em instâncias diferentes. Limitação aceita nesta fase
 * (`.claude/rules/right-sizing.md`) — endurecer com um backend compartilhado é backlog
 * de Fase 5 caso o volume real justifique.
 */

export interface RateLimitOptions {
	windowMs: number;
	maxRequests: number;
}

const chamadasPorChave = new Map<string, number[]>();

/** `true` se a chamada é permitida (e já registrada); `false` se estourou o limite. */
export function checkRateLimit(
	chave: string,
	{ windowMs, maxRequests }: RateLimitOptions,
	agora: number = Date.now()
): boolean {
	const inicioDaJanela = agora - windowMs;
	const chamadasNaJanela = (chamadasPorChave.get(chave) ?? []).filter(
		(timestamp) => timestamp > inicioDaJanela
	);

	if (chamadasNaJanela.length >= maxRequests) {
		chamadasPorChave.set(chave, chamadasNaJanela);
		return false;
	}

	chamadasNaJanela.push(agora);
	chamadasPorChave.set(chave, chamadasNaJanela);
	return true;
}
