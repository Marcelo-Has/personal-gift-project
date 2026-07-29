import { expect, test } from '@playwright/test';

test('deve exibir o título e a promessa de "Nossa História" quando a home é carregada', async ({
	page
}) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { level: 1, name: 'Nossa História' })).toBeVisible();
	await expect(
		page.getByText('Um pequeno livro sobre tudo aquilo que fez vocês virarem vocês.')
	).toBeVisible();
});

test('deve explicar as etapas do fluxo (questionário, estilo/tamanho, livro impresso)', async ({
	page
}) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Responda o questionário' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Escolha estilo e tamanho' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Receba o livro impresso' })).toBeVisible();
});

test('deve exibir um CTA principal apontando para o questionário', async ({ page }) => {
	await page.goto('/');

	const cta = page.getByRole('link', { name: 'Começar meu livro' });
	await expect(cta).toBeVisible();
	await expect(cta).toHaveAttribute('href', '/questionario');
});

test('deve definir title e meta description da página para SEO mínimo', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Nossa História/);
	const description = page.locator('meta[name="description"]');
	await expect(description).toHaveAttribute('content', /.+/);
});
