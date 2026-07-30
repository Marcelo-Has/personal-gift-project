import { expect, test } from '@playwright/test';

test('deve redirecionar /questionario para a primeira etapa e mostrar o passo atual', async ({
	page
}) => {
	await page.goto('/questionario');

	await expect(page).toHaveURL(/\/questionario\/pessoas$/);
	await expect(page.getByRole('status')).toHaveText(/Passo 1 de 9/);
});

test('deve bloquear o avanço e mostrar erro em português quando a etapa está inválida', async ({
	page
}) => {
	await page.goto('/questionario/pessoas');

	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page.getByRole('alert')).toContainText('Informe o nome.');
	await expect(page).toHaveURL(/\/questionario\/pessoas$/);
});

test('deve responder 404 quando o slug da etapa não existe', async ({ page }) => {
	const response = await page.goto('/questionario/etapa-que-nao-existe');

	expect(response?.status()).toBe(404);
	await expect(page.getByText('404')).toBeVisible();
});

test('deve preservar o preenchimento ao voltar para uma etapa anterior', async ({ page }) => {
	await page.goto('/questionario/pessoas');

	await page.getByRole('group', { name: 'Pessoa 1' }).getByLabel('Nome').fill('Ana');
	await page
		.getByRole('group', { name: 'Pessoa 1' })
		.getByLabel('Características (uma por linha)')
		.fill('gentil');
	await page.getByRole('group', { name: 'Pessoa 2' }).getByLabel('Nome').fill('Bia');
	await page
		.getByRole('group', { name: 'Pessoa 2' })
		.getByLabel('Características (uma por linha)')
		.fill('engraçada');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/fotos$/);

	await page.getByRole('button', { name: 'Voltar' }).click();

	await expect(page).toHaveURL(/\/questionario\/pessoas$/);
	await expect(page.getByRole('group', { name: 'Pessoa 1' }).getByLabel('Nome')).toHaveValue('Ana');
});

test('deve completar o fluxo feliz até o resumo, com o CTA apontando para /estilo-e-tamanho', async ({
	page
}) => {
	await page.goto('/questionario/pessoas');

	await page.getByRole('group', { name: 'Pessoa 1' }).getByLabel('Nome').fill('Ana');
	await page
		.getByRole('group', { name: 'Pessoa 1' })
		.getByLabel('Características (uma por linha)')
		.fill('gentil');
	await page.getByRole('group', { name: 'Pessoa 2' }).getByLabel('Nome').fill('Bia');
	await page
		.getByRole('group', { name: 'Pessoa 2' })
		.getByLabel('Características (uma por linha)')
		.fill('engraçada');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/fotos$/);
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/como-se-conheceram$/);
	await page
		.getByRole('textbox', { name: 'Como vocês se conheceram', exact: true })
		.fill('Nos conhecemos na faculdade.');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/momentos$/);
	await page.getByRole('button', { name: 'Adicionar momento' }).click();
	await page.getByLabel('Título').fill('Primeiro encontro');
	await page.getByLabel('Descrição').fill('No parque, num domingo.');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/piadas$/);
	await page.getByRole('textbox', { name: 'Piadas internas', exact: true }).fill('pizza de sexta');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/viagens$/);
	await page.getByRole('button', { name: 'Adicionar viagem' }).click();
	await page.getByLabel('Destino').fill('Bariloche');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/dificuldades$/);
	await page
		.getByRole('textbox', { name: 'Dificuldades superadas', exact: true })
		.fill('distância');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/planos$/);
	await page.getByRole('textbox', { name: 'Planos futuros', exact: true }).fill('morar juntos');
	await page.getByRole('button', { name: 'Avançar' }).click();

	await expect(page).toHaveURL(/\/questionario\/mensagem$/);
	await page
		.getByRole('textbox', { name: 'Mensagem especial', exact: true })
		.fill('Amo vocês dois.');

	await expect(page.getByRole('heading', { name: 'Resumo' })).toBeVisible();
	const cta = page.getByRole('link', { name: 'Escolher estilo e tamanho' });
	await expect(cta).toBeVisible();
	await expect(cta).toHaveAttribute('href', '/estilo-e-tamanho');
});
