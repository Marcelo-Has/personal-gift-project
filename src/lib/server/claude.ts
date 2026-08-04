/**
 * Cliente mínimo da Claude API (Messages), server-only (F2-02, issue #101).
 *
 * Mesmo padrão de `stripe.ts`: mora em `src/lib/server/` para o SvelteKit recusar o build
 * se um módulo de cliente importar (direta ou transitivamente) daqui, e a chave secreta
 * vem só de `$env/dynamic/private` (D-005: `ANTHROPIC_API_KEY`) — nunca no bundle do
 * navegador, nunca commitada.
 *
 * Sem SDK novo (`@anthropic-ai/sdk`) — a API de Messages é um único POST JSON; um cliente
 * fetch de poucas linhas evita puxar dependência para isso (ver D-050). `messages.create`
 * espelha o formato mínimo da API oficial para o dia em que trocar por um SDK real ser
 * só trocar `getClaudeClient()`, sem tocar quem chama.
 */
import { env } from '$env/dynamic/private';

const ANTHROPIC_API_KEY_VAR = 'ANTHROPIC_API_KEY';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';

/** Bloco de sistema com `cache_control` opcional — prompt caching (D-011). */
export interface ClaudeSystemBlock {
	type: 'text';
	text: string;
	cache_control?: { type: 'ephemeral' };
}

export interface ClaudeMessageParam {
	role: 'user' | 'assistant';
	content: string;
}

export interface ClaudeMessageCreateParams {
	model: string;
	max_tokens: number;
	system: ClaudeSystemBlock[];
	messages: ClaudeMessageParam[];
}

export interface ClaudeContentBlock {
	type: string;
	text?: string;
}

export interface ClaudeMessage {
	content: ClaudeContentBlock[];
}

/**
 * Interface mínima da API usada aqui — permite o teste injetar um dublê sem chave nem
 * chamar a API real, mesmo padrão de `CheckoutSessionsClient` em `stripe.ts`.
 */
export interface ClaudeMessagesClient {
	messages: {
		create(params: ClaudeMessageCreateParams): Promise<ClaudeMessage>;
	};
}

let cachedClient: ClaudeMessagesClient | undefined;

/** Instância única do cliente, criada sob demanda (evita ler a env var em tempo de import). */
export function getClaudeClient(): ClaudeMessagesClient {
	if (cachedClient) return cachedClient;

	const apiKey = env[ANTHROPIC_API_KEY_VAR];
	if (!apiKey) {
		throw new Error(
			`Variável de ambiente ${ANTHROPIC_API_KEY_VAR} ausente: o cliente da Claude API não pode ser inicializado.`
		);
	}

	cachedClient = {
		messages: {
			async create(params) {
				const response = await fetch(CLAUDE_API_URL, {
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
						'anthropic-version': CLAUDE_API_VERSION,
						'content-type': 'application/json'
					},
					body: JSON.stringify(params)
				});

				if (!response.ok) {
					const detalhe = await response.text();
					throw new Error(`Claude API respondeu ${response.status}: ${detalhe}`);
				}

				return (await response.json()) as ClaudeMessage;
			}
		}
	};
	return cachedClient;
}
