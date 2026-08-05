import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mesma técnica de `claude.test.ts`/`stripe.test.ts`: `$env/dynamic/private` só é lido
 * quando o cliente é criado, então o mock precisa existir antes do `import('./openai-image')`.
 */
const mockEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

const { getOpenAiImagesClient } = await import('./openai-image');

describe('getOpenAiImagesClient', () => {
	afterEach(() => {
		delete mockEnv.OPENAI_API_KEY;
		vi.unstubAllGlobals();
	});

	it('deve lançar erro descritivo quando OPENAI_API_KEY está ausente', () => {
		delete mockEnv.OPENAI_API_KEY;

		expect(() => getOpenAiImagesClient()).toThrow(/OPENAI_API_KEY/);
	});

	describe('com a chave configurada', () => {
		beforeEach(() => {
			mockEnv.OPENAI_API_KEY = 'chave-de-teste';
		});

		it('deve chamar /v1/images/edits com multipart e o bearer token certo', async () => {
			const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
				async () =>
					new Response(
						JSON.stringify({
							data: [{ b64_json: 'aW1hZ2Vt' }],
							usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 }
						}),
						{ status: 200 }
					)
			);
			vi.stubGlobal('fetch', fetchMock);

			const client = getOpenAiImagesClient();
			const resultado = await client.images.edit({
				model: 'gpt-image-1',
				image: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
				prompt: 'aquarela',
				size: '1024x1024'
			});

			expect(resultado.data[0].b64_json).toBe('aW1hZ2Vt');
			expect(resultado.usage).toEqual({ input_tokens: 100, output_tokens: 200, total_tokens: 300 });
			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://api.openai.com/v1/images/edits');
			expect(init.method).toBe('POST');
			expect(init.headers).toMatchObject({ authorization: 'Bearer chave-de-teste' });
			expect(init.body).toBeInstanceOf(FormData);
			const form = init.body as FormData;
			expect(form.get('model')).toBe('gpt-image-1');
			expect(form.get('prompt')).toBe('aquarela');
			expect(form.get('size')).toBe('1024x1024');
		});

		it('deve lançar erro com o status quando a API responde com falha', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response('chave inválida', { status: 401 }))
			);

			const client = getOpenAiImagesClient();

			await expect(
				client.images.edit({
					model: 'gpt-image-1',
					image: new Blob([new Uint8Array([1])], { type: 'image/png' }),
					prompt: 'aquarela',
					size: '1024x1024'
				})
			).rejects.toThrow(/401/);
		});
	});
});
