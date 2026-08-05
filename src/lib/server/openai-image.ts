/**
 * Cliente mínimo da API de imagens da OpenAI (`/v1/images/edits`), server-only (F2-04,
 * issue #115, [D-056]).
 *
 * Mesmo padrão de `stripe.ts`/`claude.ts`: mora em `src/lib/server/` para o SvelteKit
 * recusar o build se um módulo de cliente importar (direta ou transitivamente) daqui, e a
 * chave secreta vem só de `$env/dynamic/private` (`OPENAI_API_KEY`) — nunca no bundle do
 * navegador, nunca commitada, nunca em log.
 *
 * Sem SDK novo — um POST multipart de poucas linhas evita puxar dependência (mesmo
 * racional de D-050 para a Claude API).
 */
import { env } from '$env/dynamic/private';

const OPENAI_API_KEY_VAR = 'OPENAI_API_KEY';
const OPENAI_IMAGES_EDIT_URL = 'https://api.openai.com/v1/images/edits';

/**
 * Tamanhos de saída suportados pelo `gpt-image-1` no momento desta implementação —
 * ver achado registrado em `docs/DECISIONS.md` ([D-056]/F2-04): o maior lado suportado
 * (1536 px) fica ABAIXO do requisito de impressão do maior SKU (~2400 px, `PRODUCT.md`
 * §5). Não é resolvido aqui — só reportado nos metadados de saída.
 */
export type OpenAiImageSize = '1024x1024' | '1024x1536' | '1536x1024';

export interface OpenAiImageEditParams {
	model: string;
	/** Imagem de referência (já redimensionada ao teto de entrada) em PNG. */
	image: Blob;
	prompt: string;
	size: OpenAiImageSize;
}

export interface OpenAiImageUsage {
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
}

export interface OpenAiImageEditResult {
	data: Array<{ b64_json: string }>;
	usage?: OpenAiImageUsage;
}

/** Interface mínima usada aqui — permite o teste injetar um dublê sem chave nem rede. */
export interface OpenAiImagesClient {
	images: {
		edit(params: OpenAiImageEditParams): Promise<OpenAiImageEditResult>;
	};
}

let cachedClient: OpenAiImagesClient | undefined;

/** Instância única do cliente, criada sob demanda (evita ler a env var em tempo de import). */
export function getOpenAiImagesClient(): OpenAiImagesClient {
	if (cachedClient) return cachedClient;

	const apiKey = env[OPENAI_API_KEY_VAR];
	if (!apiKey) {
		throw new Error(
			`Variável de ambiente ${OPENAI_API_KEY_VAR} ausente: o cliente da API de imagens da OpenAI não pode ser inicializado.`
		);
	}

	cachedClient = {
		images: {
			async edit(params) {
				const form = new FormData();
				form.set('model', params.model);
				form.set('prompt', params.prompt);
				form.set('size', params.size);
				form.set('image', params.image, 'source.png');

				const response = await fetch(OPENAI_IMAGES_EDIT_URL, {
					method: 'POST',
					headers: { authorization: `Bearer ${apiKey}` },
					body: form
				});

				if (!response.ok) {
					const detalhe = await response.text();
					throw new Error(`API de imagens da OpenAI respondeu ${response.status}: ${detalhe}`);
				}

				return (await response.json()) as OpenAiImageEditResult;
			}
		}
	};
	return cachedClient;
}
