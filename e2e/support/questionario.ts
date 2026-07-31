import type { Page } from '@playwright/test';

/**
 * Apoio comum dos E2E do questionário. Não é spec: fica em `e2e/support/`, fora do
 * `testMatch` do `playwright.config.ts`, que só coleta `*.test.*`/`*.spec.*`.
 *
 * Existe para os três specs do questionário (`questionario`, `questionario-fotos`,
 * `questionario-rascunho`) compartilharem a MESMA dublagem de rede. Antes eram três cópias
 * quase iguais, e a divergência entre elas causou falha real: um spec fingia a sessão do
 * Firebase e o outro não, então o sinal de hidratação usado por ambos só funcionava num.
 */

/**
 * Sessão anônima falsa: nenhuma chamada real ao Identity Toolkit, e nenhum projeto Firebase
 * necessário no CI.
 *
 * São DOIS endpoints com formatos diferentes, e responder o mesmo corpo aos dois quebra o SDK:
 * `accounts:signUp` cria a sessão e devolve o token; `accounts:lookup` vem logo depois para
 * montar o objeto `User` e espera `{ users: [...] }` — sem esse array o firebase estoura em
 * `users.length`.
 */
export async function interceptarSessaoFirebase(page: Page) {
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

/** Rascunho inexistente — o padrão para specs que não são sobre persistência. */
export async function interceptarRascunhoVazio(page: Page) {
	await page.route('**/api/pedidos/rascunho**', async (route) => {
		await route.fulfill({
			status: 404,
			contentType: 'application/json',
			body: JSON.stringify({ message: 'Rascunho não encontrado.' })
		});
	});
}

/**
 * Abre uma etapa e só devolve depois da HIDRATAÇÃO.
 *
 * `page.goto` espera o evento `load`; os handlers do Svelte — o `onclick` do "Avançar", o
 * `onchange` do input de arquivo — só existem depois da hidratação. Interagir antes disso
 * acerta um elemento inerte: o clique não faz nada e o teste falha de forma intermitente, com
 * "element(s) not found". Não é hipótese — aconteceu nos dois specs novos.
 *
 * O sinal é a busca do rascunho que o `$effect` do `+layout.svelte` dispara ao montar
 * (F1-05c): se a requisição saiu, o layout montou no cliente. Ela só sai se a sessão do
 * Firebase resolver, por isso `interceptarSessaoFirebase` é pré-requisito — e é exatamente
 * essa dependência que fazia a versão duplicada falhar num spec e passar no outro.
 */
export async function abrirEtapa(page: Page, caminho: string) {
	// Armada ANTES do `goto`: `waitForRequest` só enxerga requisição futura.
	const hidratou = page.waitForRequest((requisicao) =>
		requisicao.url().includes('/api/pedidos/rascunho')
	);
	await page.goto(caminho);
	await hidratou;
}
