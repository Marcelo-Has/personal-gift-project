import { expect, test } from '@playwright/test';
// A MESMA lista da evidência visual da Q2 ([D-083]), importada e não copiada — ver o cabeçalho de
// `rotas-de-ui.mjs`. Rota nova de UI entra lá uma vez e passa a ser exigida pelos dois gates.
import { ROTAS, VIEWPORTS } from '../../.github/scripts/rotas-de-ui.mjs';

/**
 * Gate 3 dos 4 determinísticos da EV2.4 · Q4: VIEWPORTS RESPONSIVOS, SEM OVERFLOW.
 *
 * A §10 do `DESIGN.md` projeta a composição em 375 / 768 / 1280 — "projetada por breakpoint, não
 * esticada", nas palavras da dimensão 1 da `DESIGN-CRITIC-RUBRIC.md`. Transbordo horizontal é a
 * falha dessa promessa que NÃO precisa de julgamento: ou o conteúdo cabe na largura, ou não cabe.
 * Por isso ela sai do critic (caro, uma sessão de IA lendo 15 PNGs) e vira medição no browser.
 *
 * DUAS MEDIÇÕES, e as duas são necessárias:
 *
 *   1. **A página não rola na horizontal.** `scrollWidth` do documento contra a largura do
 *      viewport. É o sintoma que o usuário sente.
 *   2. **Nenhum elemento ultrapassa a largura.** Porque a medição 1 sozinha é enganável: um
 *      `overflow-x: hidden` no `body` some com a barra de rolagem sem consertar o layout — o
 *      conteúdo continua fora da tela, agora sem como alcançá-lo. A medição 2 é a que pega isso,
 *      e é ela que nomeia o elemento culpado no erro.
 *
 * A tolerância é de 1px, para o arredondamento subpixel do layout — não é folga de design.
 */

/** Tolerância de arredondamento subpixel. Não é folga: 2px já é transbordo de verdade. */
const TOLERANCIA = 1;

interface Transbordo {
	seletor: string;
	direita: number;
	largura: number;
}

/**
 * `goto` com uma segunda tentativa em aborto de navegação.
 *
 * O `net::ERR_ABORTED` apareceu UMA vez em três rodadas locais, sempre num `goto` e nunca numa
 * asserção — o servidor de preview derrubando a primeira conexão, não a página quebrada. Um gate
 * que pisca ensina a fábrica a re-executar o job em vez de ler o vermelho, e aí ele deixa de
 * significar alguma coisa. A tentativa extra é do TRANSPORTE; nenhuma asserção é repetida.
 */
async function irPara(page: import('@playwright/test').Page, rota: string) {
	try {
		return await page.goto(rota);
	} catch (erro) {
		if (!String(erro).includes('ERR_ABORTED')) throw erro;
		return await page.goto(rota);
	}
}

for (const { largura, altura } of VIEWPORTS) {
	test.describe(`viewport ${largura}`, () => {
		test.use({ viewport: { width: largura, height: altura } });

		for (const rota of ROTAS) {
			test(`deve caber em ${largura}px, sem transbordo horizontal, em ${rota}`, async ({
				page
			}) => {
				const resposta = await irPara(page, rota);
				expect(resposta?.status(), `${rota} respondeu ${resposta?.status()}`).toBeLessThan(400);

				const medida = await page.evaluate(
					({ tolerancia }) => {
						const limite = document.documentElement.clientWidth + tolerancia;
						const transbordos: { seletor: string; direita: number; largura: number }[] = [];

						/** Um nome legível para o erro: tag + id + classes, o suficiente para achar no código. */
						const nomear = (el: Element) => {
							const id = el.id ? `#${el.id}` : '';
							const classes =
								typeof el.className === 'string' && el.className.trim() !== ''
									? `.${el.className.trim().split(/\s+/).join('.')}`
									: '';
							return `${el.tagName.toLowerCase()}${id}${classes}`;
						};

						for (const el of Array.from(document.body.querySelectorAll('*'))) {
							const estilo = getComputedStyle(el);
							// Elemento invisível não transborda nada que se veja. E o que rola por dentro
							// (`overflow-x: auto/scroll`) transborda de propósito — é exatamente o que a §11
							// pede do campo de escrita longo: cresce até um limite e passa a rolar.
							if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;
							if (estilo.overflowX === 'auto' || estilo.overflowX === 'scroll') continue;
							const caixa = el.getBoundingClientRect();
							if (caixa.width === 0 && caixa.height === 0) continue;
							if (caixa.right > limite) {
								transbordos.push({
									seletor: nomear(el),
									direita: Math.round(caixa.right),
									largura: Math.round(caixa.width)
								});
							}
						}

						return {
							scrollWidth: document.documentElement.scrollWidth,
							clientWidth: document.documentElement.clientWidth,
							// Só os cinco piores: a lista inteira de uma página quebrada é ruído.
							transbordos: transbordos
								.sort((a, b) => b.direita - a.direita)
								.slice(0, 5) as Transbordo[]
						};
					},
					{ tolerancia: TOLERANCIA }
				);

				expect(
					medida.scrollWidth,
					`${rota} rola na horizontal em ${largura}px: scrollWidth ${medida.scrollWidth} > ` +
						`clientWidth ${medida.clientWidth}. A §10 do DESIGN.md projeta a composição para esta ` +
						'largura — ela não é esticada a partir de outra.'
				).toBeLessThanOrEqual(medida.clientWidth + TOLERANCIA);

				expect(
					medida.transbordos,
					`${rota} tem elemento(s) além da largura de ${largura}px: ` +
						medida.transbordos.map((t) => `${t.seletor} (direita ${t.direita}px)`).join(', ') +
						'. Um `overflow-x: hidden` esconderia a barra de rolagem sem consertar o layout.'
				).toEqual([]);
			});
		}
	});
}
