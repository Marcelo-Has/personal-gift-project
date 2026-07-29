import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
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
