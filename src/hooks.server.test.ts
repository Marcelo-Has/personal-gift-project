import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handle } from './hooks.server';

describe('handle', () => {
	it('deve adicionar os cabeçalhos de segurança quando resolve uma resposta', async () => {
		const event = {} as RequestEvent;
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Strict-Transport-Security')).toBe(
			'max-age=63072000; includeSubDomains'
		);
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('deve enviar X-Frame-Options DENY quando a rota é pré-renderizada e a CSP vai por meta', async () => {
		const event = {} as RequestEvent;
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
	});

	it('não deve declarar preload no HSTS enquanto não houver domínio de produção', async () => {
		const event = {} as RequestEvent;
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Strict-Transport-Security')).not.toContain('preload');
	});

	it('deve negar câmera, microfone e geolocalização via Permissions-Policy', async () => {
		const event = {} as RequestEvent;
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Permissions-Policy')).toBe(
			'camera=(), microphone=(), geolocation=()'
		);
	});

	it('deve enviar COOP same-origin-allow-popups para não quebrar signInWithPopup/Stripe', async () => {
		const event = {} as RequestEvent;
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
	});

	it('deve enviar CORP same-origin', async () => {
		const event = {} as RequestEvent;
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
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
