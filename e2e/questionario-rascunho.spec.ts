import { expect, test, type Page } from '@playwright/test';
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

/**
 * Sessão anônima falsa. São dois endpoints com formatos diferentes: `accounts:signUp`
 * devolve o token e `accounts:lookup` — chamado logo depois para montar o `User` — espera
 * `{ users: [...] }`; responder o mesmo corpo aos dois estoura o SDK em `users.length`.
 */
async function interceptarSessaoFirebase(page: Page) {
	await page.route('**identitytoolkit.googleapis.com**', async (route) => {
		const ehLookup = route.request().url().includes('accounts:lookup');

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				ehLookup
					? {
							kind: 'identitytoolkit#GetAccountInfoResponse',
							users: [
								{
									localId: 'uid-de-teste',
									providerUserInfo: [],
									lastLoginAt: `${Date.now()}`,
									createdAt: `${Date.now()}`
								}
							]
						}
					: {
							kind: 'identitytoolkit#SignupNewUserResponse',
							idToken: 'id-token-de-teste',
							refreshToken: 'refresh-token-de-teste',
							expiresIn: '3600',
							localId: 'uid-de-teste'
						}
			)
		});
	});
}

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

	await page.goto('/questionario/pessoas');

	const pessoa1 = page.getByRole('group', { name: 'Pessoa 1' });
	const pessoa2 = page.getByRole('group', { name: 'Pessoa 2' });
	await pessoa1.getByLabel('Nome').fill('Ana');
	await pessoa1.getByLabel('Características (uma por linha)').fill('gentil');
	await pessoa2.getByLabel('Nome').fill('Bia');
	await pessoa2.getByLabel('Características (uma por linha)').fill('engraçada');

	// `Avançar` é o gatilho do salvamento (melhor esforço, ver `+page.svelte`).
	await page.getByRole('button', { name: 'Avançar' }).click();
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
