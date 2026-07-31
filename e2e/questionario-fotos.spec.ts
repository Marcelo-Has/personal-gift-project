import { expect, test, type Page } from '@playwright/test';

/**
 * E2E da etapa de fotos (F1-05b, issue #32).
 *
 * Toda a rede é interceptada, por dois motivos independentes: o emulador do Storage não
 * assina URL V4, e o job `e2e` do CI não tem projeto Firebase nenhum. Interceptamos as
 * três fronteiras que o fluxo atravessa — sessão anônima do Firebase, a nossa rota
 * `/api/fotos/url-de-upload` e o `PUT` na URL assinada — de modo que o teste exercite a
 * integração REAL do componente (seleção → validação → envio → preview) sem sair do runner.
 */

const HOST_STORAGE = 'https://storage.googleapis.com';
const URL_ASSINADA_UPLOAD = `${HOST_STORAGE}/bucket-de-teste/upload-assinado`;
const URL_ASSINADA_DOWNLOAD = `${HOST_STORAGE}/bucket-de-teste/download-assinado`;
const CAMINHO_FOTO = 'users/uid-de-teste/orders/pedido-de-teste/photos/foto-de-teste';

/** 1x1 PNG transparente — arquivo válido de verdade, pequeno o bastante para o teste. */
const PNG_MINIMO = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64'
);

/**
 * Sessão anônima falsa: evita qualquer chamada real ao Identity Toolkit.
 *
 * São DOIS endpoints, com formatos diferentes, e responder o mesmo corpo aos dois quebra o
 * SDK: `accounts:signUp` cria a sessão e devolve o token; `accounts:lookup` é chamado logo
 * em seguida para montar o objeto `User` e espera `{ users: [...] }` — sem esse array o
 * firebase estoura em `users.length`.
 */
async function interceptarSessaoFirebase(page: Page) {
	await page.route('**identitytoolkit.googleapis.com**', async (route) => {
		const ehLookup = route.request().url().includes('accounts:lookup');

		const corpo = ehLookup
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
				};

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(corpo)
		});
	});
}

test.describe('etapa de fotos do questionário', () => {
	test.beforeEach(async ({ page }) => {
		await interceptarSessaoFirebase(page);
	});

	test('deve enviar a foto e mostrar o preview quando o arquivo é válido', async ({ page }) => {
		const chamadas: string[] = [];

		await page.route('**/api/fotos/url-de-upload**', async (route) => {
			const requisicao = route.request();
			chamadas.push(requisicao.method());

			// O `POST` pede a URL de upload; o `GET` pede a de leitura, para o preview.
			const corpo =
				requisicao.method() === 'POST'
					? { url: URL_ASSINADA_UPLOAD, path: CAMINHO_FOTO, expiresAt: Date.now() + 600_000 }
					: { url: URL_ASSINADA_DOWNLOAD, path: CAMINHO_FOTO, expiresAt: Date.now() + 600_000 };

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(corpo)
			});
		});

		let cabecalhosDoPut: Record<string, string> = {};
		await page.route(`${URL_ASSINADA_UPLOAD}**`, async (route) => {
			cabecalhosDoPut = route.request().headers();
			await route.fulfill({ status: 200, body: '' });
		});

		// A URL de download é só o `src` do preview; devolvemos o próprio PNG.
		await page.route(`${URL_ASSINADA_DOWNLOAD}**`, async (route) => {
			await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_MINIMO });
		});

		await page.goto('/questionario/fotos');

		await page.getByLabel('Selecionar fotos').setInputFiles({
			name: 'nossa-foto.png',
			mimeType: 'image/png',
			buffer: PNG_MINIMO
		});

		await expect(page.getByRole('listitem').filter({ hasText: 'nossa-foto.png' })).toContainText(
			'enviada'
		);
		await expect(page.getByRole('img', { name: 'Foto enviada do casal' })).toBeVisible();

		// O fluxo passou pelas duas pontas da rota, não só pela primeira.
		expect(chamadas).toEqual(['POST', 'GET']);

		// Os headers do `PUT` precisam repetir o que entrou na assinatura V4 — se divergirem,
		// o Storage responde 403 `SignatureDoesNotMatch` e o sintoma parece "URL errada".
		expect(cabecalhosDoPut['content-type']).toBe('image/png');
		expect(cabecalhosDoPut['x-goog-content-length-range']).toBe('0,10485760');
	});

	test('deve recusar arquivo grande demais sem chamar a rota de upload', async ({ page }) => {
		let bateuNaRota = false;
		await page.route('**/api/fotos/url-de-upload**', async (route) => {
			bateuNaRota = true;
			await route.abort();
		});

		await page.goto('/questionario/fotos');

		// 10 MB é o teto (`MAX_PHOTO_BYTES`); 10 MB + 1 byte tem de ser recusado no cliente,
		// antes de gastar requisição.
		await page.getByLabel('Selecionar fotos').setInputFiles({
			name: 'foto-gigante.png',
			mimeType: 'image/png',
			buffer: Buffer.alloc(10 * 1024 * 1024 + 1)
		});

		await expect(page.getByRole('alert')).toContainText('Arquivo muito grande');
		await expect(page.getByRole('img', { name: 'Foto enviada do casal' })).toHaveCount(0);
		expect(bateuNaRota).toBe(false);
	});
});
