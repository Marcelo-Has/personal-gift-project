import { expect, test } from '@playwright/test';
import { abrirEtapa, interceptarSessaoFirebase } from './support/questionario';
import type { OrderDraft } from '../src/lib/order';

/**
 * E2E do rascunho do pedido (F1-05c, issue #33): recarregar no meio do questionário mantém
 * o preenchimento.
 *
 * A rede é interceptada de ponta a ponta — sessão anônima do Firebase e a rota
 * `/api/pedidos/rascunho` —, então o teste não depende de projeto Firebase nem de
 * Firestore, mas ainda exercita o caminho real: `Avançar` chama o salvamento, e o
 * `$effect` do layout hidrata o estado na carga seguinte.
 *
 * O fake da rota guarda o que foi gravado e devolve no `GET`, que é justamente o
 * comportamento que a hidratação depende. Um mock que devolvesse sempre o mesmo objeto fixo
 * passaria mesmo se o `POST` nunca acontecesse.
 */

test('deve recuperar o preenchimento ao recarregar no meio do questionário', async ({ page }) => {
	await interceptarSessaoFirebase(page);

	// Firestore de mentira, com estado: guarda o que o POST grava e devolve no GET.
	let rascunhoGravado: OrderDraft | null = null;
	let gravacoes = 0;

	await page.route('**/api/pedidos/rascunho**', async (route) => {
		const requisicao = route.request();

		if (requisicao.method() === 'POST') {
			gravacoes += 1;
			const corpo = requisicao.postDataJSON() as {
				orderId: string;
				questionnaire?: OrderDraft['questionnaire'];
			};
			rascunhoGravado = {
				orderId: corpo.orderId,
				questionnaire: corpo.questionnaire
			} as OrderDraft;

			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
			return;
		}

		await route.fulfill({
			status: rascunhoGravado ? 200 : 404,
			contentType: 'application/json',
			body: JSON.stringify(rascunhoGravado ?? { message: 'Rascunho não encontrado.' })
		});
	});

	// Espera a hidratação antes de clicar — sem isso o clique cai num botão ainda inerte e o
	// rascunho nunca é salvo. Ver `abrirEtapa` em `support/questionario.ts`.
	await abrirEtapa(page, '/questionario/pessoas');

	const pessoa1 = page.getByRole('group', { name: 'Pessoa 1' });
	const pessoa2 = page.getByRole('group', { name: 'Pessoa 2' });
	await pessoa1.getByLabel('Nome').fill('Ana');
	await pessoa1.getByLabel('Características (uma por linha)').fill('gentil');
	await pessoa2.getByLabel('Nome').fill('Bia');
	await pessoa2.getByLabel('Características (uma por linha)').fill('engraçada');

	// `Continuar para...` é o gatilho do salvamento (melhor esforço, ver `+page.svelte`).
	await page.getByRole('button', { name: /^Continuar para/ }).click();
	await expect(page).toHaveURL(/\/questionario\/fotos$/);
	await expect.poll(() => gravacoes).toBeGreaterThan(0);

	// O ponto do teste: recarregar de verdade, perdendo todo o estado em memória.
	await page.reload();
	await page.goto('/questionario/pessoas');

	await expect(pessoa1.getByLabel('Nome')).toHaveValue('Ana');
	await expect(pessoa1.getByLabel('Características (uma por linha)')).toHaveValue('gentil');
	await expect(pessoa2.getByLabel('Nome')).toHaveValue('Bia');
	await expect(pessoa2.getByLabel('Características (uma por linha)')).toHaveValue('engraçada');
});
