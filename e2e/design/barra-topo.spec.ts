import { expect, test } from '@playwright/test';
// A MESMA lista da evidência visual (Q2, [D-083]) e do gate de viewports (Q4) — ver o cabeçalho
// de `rotas-de-ui.mjs`. A barra é chrome global (§15, "Barra de topo do wireframe da §6") e tem
// de aparecer nas mesmas 5 rotas × 3 viewports que os outros gates determinísticos já cobrem.
import { ROTAS, VIEWPORTS } from '../../.github/scripts/rotas-de-ui.mjs';
import { homeContent } from '../../src/lib/home-content';

/**
 * A barra de topo (§6, wireframe da página de produto; issue #179): marca "Nossa História" à
 * esquerda, ação à direita — a mesma ação da home (anti-pattern 70), acima da primeira dobra, em
 * toda rota. `regua.spec.ts` já prova que nada da página cruza a régua; este arquivo prova o
 * conteúdo e o colapso desenhado no 375 que a issue pediu.
 */

for (const { largura, altura } of VIEWPORTS) {
	test.describe(`barra de topo em ${largura}px`, () => {
		test.use({ viewport: { width: largura, height: altura } });

		for (const rota of ROTAS) {
			test(`mostra marca e ação, acima da dobra, em ${rota}`, async ({ page }) => {
				await page.goto(rota);

				const barra = page.locator('.barra-topo');
				await expect(barra).toBeVisible();

				const marca = barra.getByRole('link', { name: 'Nossa História' });
				await expect(marca).toBeVisible();
				await expect(marca).toHaveAttribute('href', '/');

				const acao = barra.getByRole('link', { name: homeContent.ctaLabel });
				await expect(acao).toBeVisible();
				await expect(acao).toHaveAttribute('href', homeContent.ctaHref);

				// Acima da primeira dobra (§3): o topo da barra está dentro da altura do viewport.
				const topo = await barra.evaluate((el) => el.getBoundingClientRect().top);
				expect(topo).toBeLessThan(altura);
			});
		}
	});
}

test('colapsa em 375px: marca em cima, ação embaixo, ocupando a coluna', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/');

	const barra = page.locator('.barra-topo');
	const marca = barra.locator('.marca');
	const acao = barra.locator('.acao-barra');

	const caixaMarca = await marca.evaluate((el) => el.getBoundingClientRect());
	const caixaAcao = await acao.evaluate((el) => el.getBoundingClientRect());

	// Empilhado: a ação começa abaixo da marca, não ao lado dela.
	expect(caixaAcao.top).toBeGreaterThanOrEqual(caixaMarca.bottom);
	// E ocupa a largura da coluna, como o CTA do herói (mesma decisão de composição).
	expect(caixaAcao.width).toBeGreaterThan(caixaMarca.width);
});

test('vira uma linha só a partir de 768px: marca à esquerda, ação à direita', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');

	const barra = page.locator('.barra-topo');
	const marca = barra.locator('.marca');
	const acao = barra.locator('.acao-barra');

	const caixaMarca = await marca.evaluate((el) => el.getBoundingClientRect());
	const caixaAcao = await acao.evaluate((el) => el.getBoundingClientRect());

	// Mesma linha: `.barra-topo` usa `align-items: center` (§6) — a ação tem padding vertical
	// (é um botão) e a marca é só texto, então os TOPOS não coincidem por design; quem coincide é
	// o centro vertical (tolerância de arredondamento subpixel).
	const centroMarca = caixaMarca.top + caixaMarca.height / 2;
	const centroAcao = caixaAcao.top + caixaAcao.height / 2;
	expect(Math.abs(centroMarca - centroAcao)).toBeLessThanOrEqual(1);
	// Marca à esquerda da ação.
	expect(caixaMarca.right).toBeLessThan(caixaAcao.left);
});
