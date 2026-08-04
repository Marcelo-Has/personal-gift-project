import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mesma técnica de `stripe.test.ts`: `$env/dynamic/private` só é lido quando o cliente é
 * criado, então o mock precisa existir antes do `import('./claude')`.
 */
const mockEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

const { getClaudeClient } = await import('./claude');

describe('getClaudeClient', () => {
	afterEach(() => {
		delete mockEnv.ANTHROPIC_API_KEY;
		vi.unstubAllGlobals();
	});

	it('deve lançar erro descritivo quando ANTHROPIC_API_KEY está ausente', () => {
		delete mockEnv.ANTHROPIC_API_KEY;

		expect(() => getClaudeClient()).toThrow(/ANTHROPIC_API_KEY/);
	});

	describe('com a chave configurada', () => {
		beforeEach(() => {
			mockEnv.ANTHROPIC_API_KEY = 'chave-de-teste';
		});

		it('deve chamar a API de Messages com os headers e o corpo certos', async () => {
			const fetchMock = vi.fn(
				async () =>
					new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
						status: 200
					})
			);
			vi.stubGlobal('fetch', fetchMock);

			const client = getClaudeClient();
			const resultado = await client.messages.create({
				model: 'claude-sonnet-5',
				max_tokens: 100,
				system: [{ type: 'text', text: 'system prompt' }],
				messages: [{ role: 'user', content: 'oi' }]
			});

			expect(resultado).toEqual({ content: [{ type: 'text', text: 'ok' }] });
			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://api.anthropic.com/v1/messages');
			expect(init.method).toBe('POST');
			expect(init.headers).toMatchObject({
				'x-api-key': 'chave-de-teste',
				'anthropic-version': '2023-06-01',
				'content-type': 'application/json'
			});
			expect(JSON.parse(init.body as string)).toEqual({
				model: 'claude-sonnet-5',
				max_tokens: 100,
				system: [{ type: 'text', text: 'system prompt' }],
				messages: [{ role: 'user', content: 'oi' }]
			});
		});

		it('deve lançar erro com o status quando a API responde com falha', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response('chave inválida', { status: 401 }))
			);

			const client = getClaudeClient();

			await expect(
				client.messages.create({
					model: 'claude-sonnet-5',
					max_tokens: 100,
					system: [{ type: 'text', text: 'system prompt' }],
					messages: [{ role: 'user', content: 'oi' }]
				})
			).rejects.toThrow(/401/);
		});
	});
});
