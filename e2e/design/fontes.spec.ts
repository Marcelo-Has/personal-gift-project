import { expect, test } from '@playwright/test';

/**
 * As duas famílias auto-hospedadas da §4.5/§13: Lora 400 (voz do livro) e Archivo 800/wdth 87
 * (voz do sistema). `src/lib/styles/fonts.css` declara os `@font-face`; este teste prova que o
 * BROWSER de fato os resolve — não o fallback (`Georgia`/`'Arial Narrow'`) — e que nenhum arquivo
 * de fonte vem de fora do próprio domínio (§13: o navegador in-app é o pior caso de rede).
 */

test.describe('fontes auto-hospedadas', () => {
	test('Lora 400 e Archivo 800/wdth 87 resolvem para as fontes carregadas, não para o fallback', async ({
		page
	}) => {
		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);

		const resultado = await page.evaluate(async () => {
			const [lora, archivo] = await Promise.all([
				document.fonts.load('400 17px Lora'),
				document.fonts.load('800 14px Archivo')
			]);

			/** Largura renderizada por família, para provar que Lora/Archivo ≠ o fallback genérico. */
			function largura(fontShorthand: string): number {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
				ctx.font = fontShorthand;
				return ctx.measureText('Nossa História — mmmmmmmmmm').width;
			}

			return {
				loraCarregada: lora.length > 0 && lora.every((f) => f.status === 'loaded'),
				loraDisplaySwap: lora.every((f) => f.display === 'swap'),
				archivoCarregada: archivo.length > 0 && archivo.every((f) => f.status === 'loaded'),
				archivoDisplaySwap: archivo.every((f) => f.display === 'swap'),
				larguraLora: largura('400 40px Lora'),
				larguraLoraFallback: largura('400 40px Georgia'),
				larguraArchivo: largura('800 40px Archivo'),
				larguraArchivoFallback: largura('800 40px "Arial Narrow"')
			};
		});

		expect(resultado.loraCarregada, 'Lora não resolveu para nenhum @font-face carregado').toBe(
			true
		);
		expect(resultado.loraDisplaySwap, 'o @font-face de Lora não declara font-display: swap').toBe(
			true
		);
		expect(
			resultado.archivoCarregada,
			'Archivo não resolveu para nenhum @font-face carregado'
		).toBe(true);
		expect(
			resultado.archivoDisplaySwap,
			'o @font-face de Archivo não declara font-display: swap'
		).toBe(true);

		// A prova de que NÃO é o fallback: a fonte carregada mede diferente do fallback declarado
		// (Georgia / Arial Narrow) para o mesmo texto no mesmo corpo e peso.
		expect(
			resultado.larguraLora,
			'Lora mede o mesmo que o fallback (Georgia) — não parece ter carregado de verdade'
		).not.toBeCloseTo(resultado.larguraLoraFallback, 0);
		expect(
			resultado.larguraArchivo,
			"Archivo mede o mesmo que o fallback ('Arial Narrow') — não parece ter carregado de verdade"
		).not.toBeCloseTo(resultado.larguraArchivoFallback, 0);
	});

	test('nenhum arquivo de fonte vem de fora do próprio domínio', async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() =>
			Promise.all([document.fonts.load('400 17px Lora'), document.fonts.load('800 14px Archivo')])
		);

		const origensDeFonte = await page.evaluate(() =>
			performance
				.getEntriesByType('resource')
				.filter((r) => /\.woff2?(\?|$)/.test(r.name))
				.map((r) => new URL(r.name).origin)
		);

		expect(origensDeFonte.length, 'nenhuma requisição de fonte foi observada').toBeGreaterThan(0);

		const origemDaPagina = new URL(page.url()).origin;
		for (const origem of origensDeFonte) {
			expect(origem, `fonte servida de fora do próprio domínio: ${origem}`).toBe(origemDaPagina);
		}
	});
});
