import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),

		// Content-Security-Policy. Duas pegadinhas registradas aqui de propósito:
		//
		// 1. Rotas pré-renderizadas (`export const prerender = true`) NÃO recebem a CSP
		//    como header HTTP: o SvelteKit a injeta como `<meta http-equiv>`, e o
		//    navegador ignora `frame-ancestors` (e `report-uri`/`sandbox`) nesse formato.
		//    Arquivo estático também não passa pelo `handle` de `src/hooks.server.ts`.
		//    Por isso o `X-Frame-Options: DENY` legado foi mantido lá; ao criar a
		//    primeira rota pré-renderizada, fixar os headers na camada de CDN/edge.
		//
		// 2. Estas diretivas bloqueiam, por design, Firebase e Stripe. Ao liberar
		//    (F1-04, F1-05, F1-07), usar allow-list de HOSTS específicos — nunca `*`
		//    nem `'unsafe-inline'`. Afrouxar além disso é Decision Gate
		//    (`.claude/rules/security.md`). Ver `docs/ROADMAP.md`, Fase 1.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'base-uri': ['self'],
				'object-src': ['none'],
				'form-action': ['self'],
				'frame-ancestors': ['none'],
				'script-src': ['self'],
				'img-src': ['self', 'data:'],
				'connect-src': ['self']
			}
		}
	}
};

export default config;
