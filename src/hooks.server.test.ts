import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handle, resolveUid } from './hooks.server';

function createEvent(headers: Record<string, string> = {}): RequestEvent {
	return {
		request: new Request('http://localhost', { headers }),
		locals: {}
	} as unknown as RequestEvent;
}

describe('handle', () => {
	it('deve adicionar os cabeçalhos de segurança quando resolve uma resposta', async () => {
		const event = createEvent();
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Strict-Transport-Security')).toBe(
			'max-age=63072000; includeSubDomains'
		);
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('deve enviar X-Frame-Options DENY quando a rota é pré-renderizada e a CSP vai por meta', async () => {
		const event = createEvent();
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
	});

	it('não deve declarar preload no HSTS enquanto não houver domínio de produção', async () => {
		const event = createEvent();
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Strict-Transport-Security')).not.toContain('preload');
	});

	it('deve negar câmera, microfone e geolocalização via Permissions-Policy', async () => {
		const event = createEvent();
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Permissions-Policy')).toBe(
			'camera=(), microphone=(), geolocation=()'
		);
	});

	it('deve enviar COOP same-origin-allow-popups para não quebrar signInWithPopup/Stripe', async () => {
		const event = createEvent();
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
	});

	it('deve enviar CORP same-origin', async () => {
		const event = createEvent();
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
	});

	it('deve preservar os demais cabeçalhos e o corpo da resposta original', async () => {
		const event = createEvent();
		const resolve = async () =>
			new Response('conteudo', { headers: { 'x-custom-header': 'valor' } });

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(await response.text()).toBe('conteudo');
		expect(response.headers.get('x-custom-header')).toBe('valor');
	});

	it('deve popular locals.uid como null quando não há Authorization header, sem lançar', async () => {
		const event = createEvent();
		const resolve = async () => new Response('ok');

		await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(event.locals.uid).toBeNull();
	});

	it('deve manter os cabeçalhos de segurança mesmo quando há uma sessão anônima', async () => {
		const event = createEvent();
		event.locals.uid = 'uid-ja-resolvido';
		const resolve = async () => new Response('ok');

		const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
	});
});

describe('resolveUid', () => {
	it('deve devolver null quando não há Authorization header', async () => {
		const request = new Request('http://localhost');

		expect(await resolveUid(request)).toBeNull();
	});

	it('deve devolver null quando o header não é Bearer', async () => {
		const request = new Request('http://localhost', {
			headers: { Authorization: 'Basic xyz' }
		});

		expect(await resolveUid(request)).toBeNull();
	});

	it('deve devolver o uid quando o token é válido', async () => {
		const request = new Request('http://localhost', {
			headers: { Authorization: 'Bearer valido' }
		});
		const verificar = async (token: string) => (token === 'valido' ? 'uid-123' : null);

		expect(await resolveUid(request, verificar)).toBe('uid-123');
	});

	it('deve devolver null quando o token é inválido ou expirado, sem lançar e sem 500', async () => {
		const request = new Request('http://localhost', {
			headers: { Authorization: 'Bearer expirado' }
		});
		const verificar = async () => null;

		expect(await resolveUid(request, verificar)).toBeNull();
	});
});
