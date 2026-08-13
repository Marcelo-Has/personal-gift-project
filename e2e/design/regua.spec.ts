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
 *      (64px) a partir de 768 — nunca um literal solto.
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
					// Os próprios wrappers estruturais (`.pagina`/`.grade`) são full-bleed de propósito —
					// não são "conteúdo" cruzando, são o que a régua divide por dentro.
					const cruzamentos: string[] = [];
					for (const el of Array.from(document.body.querySelectorAll('*'))) {
						if (el === regua) continue;
						const classes = typeof el.className === 'string' ? el.className : '';
						if (/\b(pagina|grade)\b/.test(classes)) continue;
						const estilo = getComputedStyle(el);
						if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;
						const caixa = el.getBoundingClientRect();
						if (caixa.width === 0 && caixa.height === 0) continue;
						if (caixa.left < eixoX - 1 && caixa.right > eixoX + 1) {
							const id = el.id ? `#${el.id}` : '';
							cruzamentos.push(`${el.tagName.toLowerCase()}${id}.${classes}`.trim());
						}
					}

					return {
						reguaTop: rRegua.top + window.scrollY,
						reguaBottom: rRegua.bottom + window.scrollY,
						reguaLeft: rRegua.left,
						paginaTop: rPagina.top + window.scrollY,
						paginaBottom: rPagina.bottom + window.scrollY,
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
