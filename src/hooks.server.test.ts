import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handle } from './hooks.server';

describe('handle', () => {
	it('deve adicionar os cabeçalhos de segurança quando resolve uma resposta', async () => {
		const event = {} as RequestEvent;
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Strict-Transport-Security')).toBe(
			'max-age=63072000; includeSubDomains; preload'
		);
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('deve preservar os demais cabeçalhos e o corpo da resposta original', async () => {
		const event = {} as RequestEvent;
		const resolve = async () =>
			new Response('conteudo', { headers: { 'x-custom-header': 'valor' } });

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(await response.text()).toBe('conteudo');
		expect(response.headers.get('x-custom-header')).toBe('valor');
	});
});
