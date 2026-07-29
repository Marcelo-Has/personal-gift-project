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
 * `Permissions-Policy` nega câmera, microfone e geolocalização por padrão: nenhuma rota
 * atual os usa, e o upload de fotos (F1-05) vai por `<input type="file">`, que não
 * depende dessas APIs.
 *
 * `Cross-Origin-Opener-Policy: same-origin-allow-popups` (não `same-origin`): o Firebase
 * Auth (F1-04) ainda não foi implementado e não há decisão registrada sobre popup vs.
 * redirect no login. `same-origin` quebraria `signInWithPopup` (e também popups do
 * Stripe Checkout, F1-07) caso esse seja o fluxo escolhido. `same-origin-allow-popups`
 * já isola a janela de `window.opener` de outras origens sem travar esses popups; migrar
 * para `same-origin` fica para quando F1-04 confirmar um fluxo por redirect.
 *
 * `Cross-Origin-Resource-Policy: same-origin` só afeta como **este** site é embutido por
 * outras origens; não bloqueia buscar as URLs assinadas de foto (F1-05) vindas de outro
 * domínio (isso dependeria de COEP, que não está em uso aqui).
 *
 * Referências: `.claude/rules/security.md`, `docs/DECISIONS.md` (D-010), issue #15.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

	return response;
};
