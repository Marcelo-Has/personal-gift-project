import { expect, test } from '@playwright/test';

/** As 7 seções da §6, na ordem — os `id` de `aria-labelledby` de `src/routes/+page.svelte`. */
const SECOES_EM_ORDEM = [
	'promessa',
	'impresso',
	'cinco-minutos',
	'preco-prazo',
	'quem-escreve',
	'prova',
	'fechamento'
];

test('deve exibir a promessa do herói quando a home é carregada', async ({ page }) => {
	await page.goto('/');

	await expect(
		page.getByRole('heading', {
			level: 1,
			name: 'Você já tem a história de vocês. Em cinco minutos, ela vira um livro.'
		})
	).toBeVisible();
	await expect(
		page.getByText(
			'Você escreve como se conheceram, as fotos e as piadas de vocês, e o livro sai pronto para presentear.'
		)
	).toBeVisible();
});

test('deve explicar as etapas do fluxo (questionário, estilo/tamanho, prévia e pagamento)', async ({
	page
}) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { level: 2, name: 'Em cinco minutos' })).toBeVisible();
	await expect(page.getByText('Você responde o questionário', { exact: true })).toBeVisible();
	await expect(page.getByText('Você escolhe estilo e tamanho', { exact: true })).toBeVisible();
	await expect(page.getByText('Você vê a prévia e paga', { exact: true })).toBeVisible();
});

test('deve exibir um CTA principal apontando para o questionário', async ({ page }) => {
	await page.goto('/');

	const cta = page.getByRole('link', { name: 'Começar o meu livro' }).first();
	await expect(cta).toBeVisible();
	await expect(cta).toHaveAttribute('href', '/questionario');
});

test('deve definir title e meta description da página para SEO mínimo', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Nossa História/);
	const description = page.locator('meta[name="description"]');
	await expect(description).toHaveAttribute('content', /.+/);
});

test('deve ter as 7 seções da §6 presentes, na ordem, e um único h1', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

	const idsRenderizados = await page
		.locator('main > section[aria-labelledby]')
		.evaluateAll((secoes) => secoes.map((secao) => secao.getAttribute('aria-labelledby')));
	expect(idsRenderizados).toEqual(SECOES_EM_ORDEM);
});

test('deve ter o mesmo rótulo e o mesmo destino de CTA nas seções 1 e 7 (anti-pattern 70)', async ({
	page
}) => {
	await page.goto('/');

	const ctaPromessa = page.locator('section[aria-labelledby="promessa"] a.cta');
	const ctaFechamento = page.locator('section[aria-labelledby="fechamento"] a.cta');

	await expect(ctaPromessa).toHaveCount(1);
	await expect(ctaFechamento).toHaveCount(1);
	await expect(ctaPromessa).toHaveText(await ctaFechamento.textContent());
	await expect(ctaPromessa).toHaveAttribute(
		'href',
		(await ctaFechamento.getAttribute('href')) ?? ''
	);
});

test('deve fixar a ação primária no rodapé, em dvh, quando a promessa sai da tela em 375px', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/');

	const ctaHero = page.locator('section[aria-labelledby="promessa"] a.cta');
	await expect(ctaHero).not.toHaveClass(/cta-fixa/);

	await page.locator('section[aria-labelledby="impresso"]').scrollIntoViewIfNeeded();
	await expect(ctaHero).toHaveClass(/cta-fixa/);
	await expect(ctaHero).toHaveCSS('position', 'fixed');
});

for (const largura of [375, 768, 1280]) {
	test(`deve popular a .margem da home com a voz do sistema em ${largura}px`, async ({ page }) => {
		await page.setViewportSize({ width: largura, height: 900 });
		await page.goto('/');

		const margem = page.locator('.margem');
		await expect(margem).not.toBeEmpty();
		await expect(margem.getByText(/R\$80.+R\$130/)).toBeVisible();
	});
}

test('deve anunciar a promessa, depois a foto, depois o CTA, na ordem do DOM (ordem de leitura §6)', async ({
	page
}) => {
	await page.goto('/');

	const filhos = await page
		.locator('section[aria-labelledby="promessa"] > *')
		.evaluateAll((els) =>
			els.map((el) => `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`)
		);
	expect(filhos).toEqual(['div.hero-intro', 'div.hero-foto', 'a.cta']);
});

test('deve ocupar a largura da coluna com o CTA do herói em 375px, antes de fixar no rodapé', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/');

	const heroIntro = page.locator('section[aria-labelledby="promessa"] .hero-intro');
	const cta = page.locator('section[aria-labelledby="promessa"] a.cta');

	const larguraIntro = await heroIntro.evaluate((el) => el.getBoundingClientRect().width);
	const larguraCta = await cta.evaluate((el) => el.getBoundingClientRect().width);
	expect(larguraCta).toBeGreaterThan(larguraIntro * 0.9);
});

for (const largura of [768, 1280]) {
	test(`deve esticar a caixa da foto ausente para acompanhar a coluna de texto em ${largura}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width: largura, height: 900 });
		await page.goto('/');

		const alturaColuna = await page.evaluate(() => {
			const intro = document.querySelector('section[aria-labelledby="promessa"] .hero-intro');
			const cta = document.querySelector('section[aria-labelledby="promessa"] a.cta');
			if (!intro || !cta) throw new Error('hero-intro ou cta ausente');
			const inicio = intro.getBoundingClientRect().top;
			const fim = cta.getBoundingClientRect().bottom;
			return fim - inicio;
		});
		const heroFoto = page.locator('section[aria-labelledby="promessa"] .hero-foto');
		const alturaFoto = await heroFoto.evaluate((el) => el.getBoundingClientRect().height);
		expect(alturaFoto).toBeGreaterThan(alturaColuna * 0.9);
	});
}
