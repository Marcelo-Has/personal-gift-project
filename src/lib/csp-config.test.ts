import { describe, expect, it } from 'vitest';
import svelteConfig from '../../svelte.config.js';

describe('CSP configurada em svelte.config.js', () => {
	const csp = svelteConfig.kit?.csp;

	it('deve usar o modo auto quando o app renderiza páginas dinâmicas e pré-renderizadas', () => {
		expect(csp?.mode).toBe('auto');
	});

	it('deve restringir a origem padrão a "self" quando nenhuma outra diretiva se aplica', () => {
		expect(csp?.directives?.['default-src']).toEqual(['self']);
	});

	it('deve bloquear plugins legados (object-src none) e reduzir a superfície de XSS', () => {
		expect(csp?.directives?.['object-src']).toEqual(['none']);
	});

	it('deve impedir que a aplicação seja embutida em iframes de terceiros', () => {
		expect(csp?.directives?.['frame-ancestors']).toEqual(['none']);
	});

	it('deve restringir scripts à própria origem, sem CDNs externos', () => {
		expect(csp?.directives?.['script-src']).toEqual(['self']);
	});

	describe('connect-src liberado para o Firebase (F1-04)', () => {
		const connectSrc = csp?.directives?.['connect-src'] ?? [];

		it('deve liberar os hosts de Auth, Firestore e Storage quando o app usa o Firebase', () => {
			expect(connectSrc).toEqual(
				expect.arrayContaining([
					'self',
					'https://identitytoolkit.googleapis.com',
					'https://securetoken.googleapis.com',
					'https://firestore.googleapis.com',
					'https://storage.googleapis.com'
				])
			);
		});

		it('deve usar allow-list de hosts específicos, sem curinga, ao liberar terceiros', () => {
			for (const origem of connectSrc) {
				expect(origem).not.toContain('*');
			}
		});
	});
});
