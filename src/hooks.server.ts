import type { Handle } from '@sveltejs/kit';

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 *
 * A Content-Security-Policy é configurada separadamente via `kit.csp` em
 * `svelte.config.js` (inclui `frame-ancestors: 'none'`).
 *
 * `X-Frame-Options: DENY` é mantido de propósito, apesar de legado: em rotas
 * pré-renderizadas o SvelteKit entrega a CSP por `<meta>`, e o navegador ignora
 * `frame-ancestors` nesse formato. Navegadores que suportam `frame-ancestors`
 * ignoram este header, então não há contrapartida.
 *
 * HSTS vai sem `preload`: a submissão à lista de preload dos navegadores é
 * quase irreversível e passaria a exigir TLS válido em todo subdomínio futuro
 * (staging incluso). Reavaliar quando houver domínio de produção definitivo.
 *
 * Referências: `.claude/rules/security.md`, `docs/DECISIONS.md` (D-010).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
