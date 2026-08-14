import { expect, test, type Page } from '@playwright/test';
import {
	abrirEtapa,
	interceptarRascunhoVazio,
	interceptarSessaoFirebase
} from '../support/questionario';

/**
 * Gate 4 dos 4 determinísticos da EV2.4 · Q4: ESTADOS OBRIGATÓRIOS NOS COMPONENTES-CHAVE.
 *
 * O anti-pattern 58 é "só o estado feliz implementado — faltam vazio, carregando, erro, overflow
 * ou offline", e a §11 do `DESIGN.md` tem uma tabela nomeando os quatro componentes-chave e o que
 * cada estado deve fazer em cada um. Dos quatro, existem hoje **dois**: o campo de escrita do
 * questionário e o envio de foto. O contêiner da prévia e o acompanhamento de pedido ainda não
 * têm tela — este arquivo os declara em `PENDENTES`, e `tests/design/estados.test.ts` reprova se
 * um deles ganhar rota sem ganhar cobertura aqui. É o que impede o gate de envelhecer calado.
 *
 * O QUE ESTE GATE DECIDE, E O QUE ELE DEIXA PARA O CRITIC. Ele decide se o estado **existe, é
 * alcançável e não quebra**: o vazio orienta em vez de ficar mudo, o erro é anunciado a quem usa
 * leitor de tela, o carregando é visível enquanto dura, e o overflow rola por dentro em vez de
 * empurrar a página. Ele NÃO decide se a redação está na voz da §9 nem se o esqueleto tem a forma
 * do resultado (anti-pattern 59) — isso é a dimensão 5 da `DESIGN-CRITIC-RUBRIC.md`, e é
 * julgamento sobre o renderizado.
 *
 * Sem isso o gate viraria um teste de copy congelada, que quebra a cada ajuste de texto e ensina a
 * fábrica a desligá-lo.
 */

/** Componentes-chave da §11 que ainda não têm rota. Espelhado em `tests/design/estados.test.ts`. */
export const PENDENTES = ['Contêiner da prévia', 'Pedido (acompanhamento)'];

/** Um texto de 40 linhas — o caso que a §11 nomeia para o overflow do campo de escrita. */
const QUARENTA_LINHAS = Array.from(
	{ length: 40 },
	(_, i) => `linha ${i + 1} de um relato longo que a pessoa não escreveria duas vezes`
).join('\n');

/**
 * Abre uma etapa do questionário JÁ HIDRATADA, com a rede do Firebase dublada.
 *
 * Sem esperar a hidratação, todo teste de estado vira intermitente: os estados de erro e de
 * carregando existem em handlers do Svelte (`onchange` do input de arquivo, `onclick` do
 * "Avançar"), e interagir antes disso acerta um elemento inerte — o `abrirEtapa` de
 * `e2e/support/questionario.ts` existe por causa desse mesmo achado. Reproduzido aqui: as duas
 * primeiras rodadas destes testes falharam por isso.
 */
async function abrirEtapaHidratada(page: Page, slug: string) {
	await interceptarSessaoFirebase(page);
	await interceptarRascunhoVazio(page);
	await abrirEtapa(page, `/questionario/${slug}`);
}

/** A etapa de fotos, hidratada. Volta o `<input type=file>`. */
async function abrirEtapaDeFotos(page: Page) {
	await abrirEtapaHidratada(page, 'fotos');
	return page.locator('input[type="file"]');
}

test.describe('Campo de escrita do questionário (DESIGN.md §11)', () => {
	test('vazio: a etapa orienta o que entra ali, em vez de mostrar um campo mudo', async ({
		page
	}) => {
		await abrirEtapaHidratada(page, 'como-se-conheceram');

		// A pergunta E a orientação. Um campo vazio sem nenhuma das duas é o estado vazio
		// não-desenhado que o anti-pattern 58 descreve. A orientação é voz do sistema (§3):
		// vive na folha, abaixo do campo (rodada 4, #181 — a margem de 64px não cabe frase real).
		const secao = page.getByRole('region').first();
		await expect(secao.getByRole('heading', { level: 2 })).not.toBeEmpty();
		const orientacao = page.locator('.voz-sistema__ajuda');
		await expect(orientacao).toBeVisible();
		await expect(orientacao).not.toBeEmpty();

		// E o vazio NÃO é erro: entrar na etapa não pode acusar quem ainda não respondeu.
		await expect(page.getByRole('alert')).toHaveCount(0);
	});

	test('erro: avançar sem responder nomeia o que falta e é anunciado por leitor de tela', async ({
		page
	}) => {
		await abrirEtapaHidratada(page, 'como-se-conheceram');
		await page.getByRole('button', { name: /^Continuar para/ }).click();

		const erros = page.getByRole('alert');
		await expect(erros).toBeVisible();
		await expect(erros).not.toBeEmpty();
		// `role="alert"` é o que faz o erro EXISTIR para quem não olha a tela. Cor sozinha não
		// carrega informação (§11: "o campo ganha `border` em `destructive` E o texto do erro").
		await expect(erros).toHaveAttribute('role', 'alert');
	});

	test('overflow: 40 linhas rolam dentro do campo e não empurram a página', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await abrirEtapaHidratada(page, 'como-se-conheceram');

		const campo = page.locator('textarea').first();
		await campo.fill(QUARENTA_LINHAS);

		// Nada é truncado sem aviso (§11): o valor continua inteiro no campo.
		await expect(campo).toHaveValue(QUARENTA_LINHAS);

		// E o texto longo não vira transbordo horizontal da página.
		const transborda = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
		);
		expect(transborda, 'o campo com 40 linhas fez a página rolar na horizontal').toBe(false);

		// O campo rola por dentro em vez de crescer sem limite junto com o conteúdo.
		const alturas = await campo.evaluate((el) => ({
			visivel: (el as HTMLTextAreaElement).clientHeight,
			conteudo: (el as HTMLTextAreaElement).scrollHeight
		}));
		expect(
			alturas.visivel,
			'o campo cresceu até a altura do conteúdo em vez de rolar internamente (§11)'
		).toBeLessThan(alturas.conteudo);
	});
});

test.describe('Envio de foto (DESIGN.md §11)', () => {
	test('vazio: a etapa diz o que enviar antes de haver qualquer foto', async ({ page }) => {
		const entrada = await abrirEtapaDeFotos(page);

		await expect(entrada).toBeVisible();
		// Sem foto nenhuma, não há lista de itens nem de prévias — e nada de erro.
		await expect(page.locator('.itens-foto')).toHaveCount(0);
		await expect(page.locator('.preview-fotos')).toHaveCount(0);
		await expect(page.getByRole('alert')).toHaveCount(0);
		// E existe orientação visível sobre o que entra ali — voz do sistema, na margem (§3).
		await expect(page.locator('.voz-sistema__ajuda')).not.toBeEmpty();
	});

	test('carregando: o envio em curso é visível enquanto dura, sem congelar a tela', async ({
		page
	}) => {
		const entrada = await abrirEtapaDeFotos(page);

		// A URL assinada demora de propósito: é o instante que este teste existe para observar.
		let liberar: () => void = () => {};
		const pendente = new Promise<void>((resolve) => {
			liberar = resolve;
		});
		await page.route('**/api/fotos/url-de-upload', async (rota) => {
			await pendente;
			await rota.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
		});

		await entrada.setInputFiles({
			name: 'nos-dois.jpg',
			mimeType: 'image/jpeg',
			buffer: Buffer.from('foto de teste')
		});

		await expect(page.getByText('enviando', { exact: false })).toBeVisible();
		liberar();
	});

	test('erro: arquivo recusado explica o problema no lugar onde ele aconteceu', async ({
		page
	}) => {
		const entrada = await abrirEtapaDeFotos(page);

		// Tipo não permitido: a validação é local, então o erro aparece sem depender de rede.
		await entrada.setInputFiles({
			name: 'contrato.pdf',
			mimeType: 'application/pdf',
			buffer: Buffer.from('nao e foto')
		});

		const erro = page.getByRole('alert');
		await expect(erro).toBeVisible();
		await expect(erro).not.toBeEmpty();
		// O erro fica junto do item que falhou, e o nome do arquivo aparece — "algo deu errado"
		// solto é o anti-pattern 72.
		await expect(page.locator('.itens-foto')).toContainText('contrato.pdf');
	});

	test('overflow: 12 arquivos recusados não empurram a página para fora da largura', async ({
		page
	}) => {
		await page.setViewportSize({ width: 375, height: 812 });
		const entrada = await abrirEtapaDeFotos(page);

		await entrada.setInputFiles(
			Array.from({ length: 12 }, (_, i) => ({
				name: `um-nome-de-arquivo-bastante-comprido-numero-${i + 1}.pdf`,
				mimeType: 'application/pdf',
				buffer: Buffer.from('nao e foto')
			}))
		);

		await expect(page.locator('.itens-foto li')).toHaveCount(12);
		const transborda = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
		);
		expect(transborda, '12 itens de foto fizeram a página rolar na horizontal em 375px').toBe(
			false
		);
	});
});
