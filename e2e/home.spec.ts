import { expect, test } from '@playwright/test';

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
	await expect(page.getByText('Você responde o questionário')).toBeVisible();
	await expect(page.getByText('Você escolhe estilo e tamanho')).toBeVisible();
	await expect(page.getByText('Você vê a prévia e paga')).toBeVisible();
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
