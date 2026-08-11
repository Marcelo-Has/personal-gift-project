import { expect, test } from '@playwright/test';

test('deve exibir o hero e os 4 passos ao abrir /como-funciona', async ({ page }) => {
	await page.goto('/como-funciona');

	await expect(page.getByRole('heading', { level: 1, name: 'Como funciona' })).toBeVisible();
	await expect(
		page.getByText('Um pequeno livro sobre tudo aquilo que fez vocês virarem vocês.')
	).toBeVisible();

	await expect(page.getByRole('heading', { name: 'Responda o questionário' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Escolha estilo e tamanho' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Pague' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Receba o livro impresso' })).toBeVisible();
});

test('o CTA "Criar o nosso livro" deve levar ao questionário', async ({ page }) => {
	await page.goto('/como-funciona');

	const cta = page.getByRole('link', { name: 'Criar o nosso livro' });
	await expect(cta).toBeVisible();
	await expect(cta).toHaveAttribute('href', '/questionario');

	await cta.click();
	await expect(page).toHaveURL(/\/questionario/);
});

test('a home deve linkar para a página /como-funciona', async ({ page }) => {
	await page.goto('/');

	const link = page.getByRole('link', { name: 'Ver como funciona em detalhes' });
	await expect(link).toBeVisible();
	await expect(link).toHaveAttribute('href', '/como-funciona');
});

test('deve definir title e meta description da página para SEO mínimo', async ({ page }) => {
	await page.goto('/como-funciona');

	await expect(page).toHaveTitle(/Como funciona/);
	const description = page.locator('meta[name="description"]');
	await expect(description).toHaveAttribute('content', /.+/);
});
