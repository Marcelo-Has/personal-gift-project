import { expect, test } from '@playwright/test';
// A MESMA lista da evidência visual (Q2, [D-083]) e do gate de viewports (Q4) — ver o cabeçalho
// de `rotas-de-ui.mjs`. A régua é a assinatura da §3 e tem de aparecer nas mesmas 5 rotas × 3
// viewports que os outros gates determinísticos já cobrem.
import { ROTAS, VIEWPORTS } from '../../.github/scripts/rotas-de-ui.mjs';

/**
 * A régua de margem (§3, EV2.4 · Q5a): a assinatura visual do produto.
 *
 * Quatro coisas, e as quatro são exigidas pelo critério de aceite da issue:
 *
 *   1. Existe e é CONTÍNUA do topo ao rodapé de TODA a página — não só do viewport, a altura real
 *      do conteúdo, curto ou longo.
 *   2. Aparece ACIMA da primeira dobra (o topo da régua está dentro da altura do viewport, sem
 *      rolar).
 *   3. O offset é o token certo por largura: `--space-md` (24px) abaixo de 768, `--space-2xl`
 *      (64px) a partir de 768 — nunca um literal solto. Medido a partir da borda esquerda de
 *      `.pagina`, não do viewport: a §3 fala em "borda esquerda da coluna de conteúdo", e desde a
 *      [D-089] a página é centralizada, então as duas medidas deixaram de coincidir.
 *   4. NENHUM elemento cruza a régua — nem para a esquerda dela nem para a direita.
 *
 * Tolerância de 1px para arredondamento subpixel de layout, igual ao gate de viewports.
 */

const TOLERANCIA = 1;

function offsetEsperado(largura: number): number {
	return largura < 768 ? 24 : 64;
}

interface Medida {
	reguaTop: number;
	reguaBottom: number;
	reguaLeft: number;
	paginaTop: number;
	paginaBottom: number;
	alturaDocumento: number;
	viewportHeight: number;
	cruzamentos: string[];
}

for (const { largura, altura } of VIEWPORTS) {
	test.describe(`régua de margem em ${largura}px`, () => {
		test.use({ viewport: { width: largura, height: altura } });

		for (const rota of ROTAS) {
			test(`é contínua, no offset certo, acima da dobra e sem nada a cruzando, em ${rota}`, async ({
				page
			}) => {
				await page.goto(rota);

				const medida = await page.evaluate((): Medida | null => {
					const regua = document.querySelector('.regua');
					const pagina = document.querySelector('.pagina');
					if (!regua || !pagina) return null;

					const rRegua = regua.getBoundingClientRect();
					const rPagina = pagina.getBoundingClientRect();
					const eixoX = rRegua.left + rRegua.width / 2;

					// Nada cruza a régua: nenhum elemento pintado começa de um lado e termina do outro.
					// O escopo é o SUBTREE de `.pagina`, não `document.body` inteiro — a régua divide o
					// CONTEÚDO da página, e `.pagina` é exatamente essa fronteira. Isso também exclui, de
					// graça, tudo que o SvelteKit injeta acima ou ao lado dela (o wrapper
					// `<div style="display: contents">` de `app.html`, o `#svelte-announcer` de
					// acessibilidade) sem precisar listar cada um: nenhum dos dois é conteúdo da página.
					// `.grade` continua excluída à parte — é full-bleed dentro de `.pagina` de propósito,
					// não é "conteúdo" cruzando, é o que a régua divide por dentro. Mesma razão para
					// qualquer caixa com área zero (largura OU altura zero — ex.: `.margem` ainda sem
					// conteúdo no empilhamento de 375px — não pinta nada, então não há o que cruzar).
					const cruzamentos: string[] = [];
					for (const el of Array.from(pagina.querySelectorAll('*'))) {
						if (el === regua) continue;
						const classes = typeof el.className === 'string' ? el.className : '';
						if (/\bgrade\b/.test(classes)) continue;
						const estilo = getComputedStyle(el);
						if (
							estilo.display === 'none' ||
							estilo.display === 'contents' ||
							estilo.visibility === 'hidden'
						)
							continue;
						const caixa = el.getBoundingClientRect();
						if (caixa.width === 0 || caixa.height === 0) continue;
						if (caixa.left < eixoX - 1 && caixa.right > eixoX + 1) {
							const id = el.id ? `#${el.id}` : '';
							cruzamentos.push(`${el.tagName.toLowerCase()}${id}.${classes}`.trim());
						}
					}

					return {
						reguaTop: rRegua.top + window.scrollY,
						reguaBottom: rRegua.bottom + window.scrollY,
						// Relativo a `.pagina`, NÃO ao viewport: a §3 posiciona a régua "da borda esquerda
						// da coluna de conteúdo", e desde a [D-089] `.pagina` é centralizada
						// (`--largura-pagina` + `margin-inline: auto`), como o conceito e o grid da §6
						// sempre pediram. Medir do viewport passaria a somar a margem de centralização
						// (80px em 1280) ao offset do token e reprovaria a composição correta.
						reguaLeft: rRegua.left - rPagina.left,
						paginaTop: rPagina.top + window.scrollY,
						paginaBottom: rPagina.bottom + window.scrollY,
						// A altura REAL da página — não a de `.pagina`, que por construção (a régua é
						// `top`/`bottom: 0` DENTRO dela) sempre bate com `reguaBottom` mesmo quando a régua
						// para no meio da tela. É esta medida, independente de `.pagina`, que prova que a
						// régua alcança o rodapé de verdade em conteúdo mais curto que o viewport.
						alturaDocumento: Math.max(
							document.body.scrollHeight,
							document.documentElement.scrollHeight
						),
						viewportHeight: window.innerHeight,
						cruzamentos
					};
				});

				expect(medida, `${rota} não renderizou \`.regua\`/\`.pagina\` no DOM`).not.toBeNull();
				if (!medida) return;

				expect(
					medida.reguaTop,
					`${rota}: a régua não começa no topo da página (topo em ${medida.reguaTop}px)`
				).toBeLessThanOrEqual(medida.paginaTop + TOLERANCIA);

				expect(
					medida.reguaBottom,
					`${rota}: a régua não chega ao rodapé real da página (ela em ${medida.reguaBottom}px, ` +
						`a página em ${medida.paginaBottom}px) — não pode ser só a altura do viewport`
				).toBeGreaterThanOrEqual(medida.paginaBottom - TOLERANCIA);

				// Comparação independente de `.pagina`: em conteúdo mais curto que o viewport, a régua
				// tem de acompanhar a altura REAL do documento (`min-height: 100dvh` na folha de base),
				// não só a caixa de `.pagina` — que sempre bate com a régua por construção e não pegaria
				// essa regressão sozinha.
				expect(
					medida.reguaBottom,
					`${rota}: a régua para em ${medida.reguaBottom}px mas a página real vai até ` +
						`${medida.alturaDocumento}px — sobra tela sem régua abaixo dela em ${largura}px`
				).toBeGreaterThanOrEqual(medida.alturaDocumento - TOLERANCIA);

				expect(
					medida.reguaTop,
					`${rota}: a régua não aparece acima da primeira dobra em ${largura}px`
				).toBeLessThan(medida.viewportHeight);

				expect(
					Math.abs(medida.reguaLeft - offsetEsperado(largura)),
					`${rota}: offset da régua é ${medida.reguaLeft}px, esperado ${offsetEsperado(largura)}px ` +
						`(\`--space-md\`/\`--space-2xl\`) em ${largura}px`
				).toBeLessThanOrEqual(TOLERANCIA);

				expect(
					medida.cruzamentos,
					`${rota} tem elemento(s) cruzando a régua em ${largura}px: ${medida.cruzamentos.join(', ')}`
				).toEqual([]);
			});
		}
	});
}
