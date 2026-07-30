import { expect, test } from '@playwright/test';

// O registry.json real (`src/lib/product-skills/registry.json`) tem as 5 entradas em
// `status: "draft"` — publicar qualquer uma reabriria os Decision Gates D-105/D-106,
// que seguem PENDENTES (ver issue #34). Por isso este E2E só consegue exercitar o
// estado vazio: é a verdade do staging hoje. O caso "com itens published" é coberto
// pelo unitário com fixture em `src/lib/escolha-estilo.test.ts`.

test('deve responder 200 e exibir o estado vazio quando o catálogo está todo draft', async ({
	page
}) => {
	const response = await page.goto('/estilo-e-tamanho');
	expect(response?.status()).toBe(200);

	await expect(page.getByRole('heading', { name: 'Escolha estilo e tamanho' })).toBeVisible();
	await expect(page.getByText('Ainda estamos preparando os estilos e tamanhos')).toBeVisible();
});

test('não deve exibir formulário nem valor monetário quando o catálogo está incompleto', async ({
	page
}) => {
	await page.goto('/estilo-e-tamanho');

	await expect(page.getByRole('radio')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Avançar' })).toHaveCount(0);
	await expect(page.locator('body')).not.toContainText('R$');
});
