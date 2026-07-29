import { expect, test } from '@playwright/test';

test('deve exibir o título placeholder quando a home é carregada', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Personal Gift Project' })).toBeVisible();
});
