import type { Handle } from '@sveltejs/kit';

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 *
 * A Content-Security-Policy é configurada separadamente via `kit.csp` em
 * `svelte.config.js` (inclui `frame-ancestors: 'none'`, que substitui a
 * necessidade do header legado `X-Frame-Options`).
 *
 * Referências: `.claude/rules/security.md`, `docs/DECISIONS.md` (D-010).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
