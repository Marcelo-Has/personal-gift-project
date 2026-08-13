import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { ROTAS } from '../../.github/scripts/rotas-de-ui.mjs';

/**
 * Gate 2 dos 4 determinísticos da EV2.4 · Q4, primeira metade: AXE COM CATRACA.
 *
 * O piso da §12 do `DESIGN.md` é WCAG 2.2 AA, "obrigatório, não negociável". Este gate mede a
 * parte do piso que uma máquina mede sem julgar — e reprova em `critical` + `serious`, não em
 * tudo: `moderate`/`minor` do axe misturam heurística de best-practice com violação real, e um
 * gate que reprova o discutível é um gate que se aprende a ignorar. O que sobra (foco visível,
 * ordem de leitura, rótulo que faz sentido para quem ouve) é a a11y qualitativa da dimensão 6 da
 * `DESIGN-CRITIC-RUBRIC.md`, e continua sendo do critic.
 *
 * A CATRACA, E POR QUE ELA ANDA NOS DOIS SENTIDOS. `tests/design/a11y-baseline.json` guarda, por
 * `<rota>@<largura>`, a lista de REGRAS toleradas — regra por id, nunca uma contagem. Contagem
 * responde "quantos", que é a pergunta errada; id responde "o quê", que é a pergunta que dá para
 * revisar num diff. Hoje todas as listas estão vazias, e é assim que se pretende que fique.
 *
 *   - regra que dispara e NÃO está na lista → reprova (regressão);
 *   - regra que está na lista e NÃO dispara mais → reprova também (catraca velha).
 *
 * O segundo caso é o que impede o falso-positivo residual: uma tolerância que sobrevive à correção
 * que a tornou desnecessária vira permissão permanente, e ninguém volta para removê-la. Reprovar
 * com a instrução de apagar a linha é barato; descobrir três meses depois que o gate estava
 * afrouxado não é.
 *
 * `ATUALIZAR_BASELINE=1` reescreve o arquivo com o que foi medido — para o dia de apertar a
 * catraca, e nunca dentro do CI (nenhum workflow define a variável).
 */

const BASELINE = 'tests/design/a11y-baseline.json';

/**
 * As duas larguras que a §10 declara como extremos de intenção: 375 é a tela real do público
 * (18–30, chegando de anúncio, no celular) e 1280 é onde a composição abre em duas colunas. O 768
 * fica de fora AQUI — e só aqui: ele continua coberto pelo gate de viewports e pela evidência
 * visual. Rodar axe nas três larguras triplicaria o custo do gate para medir, na largura do meio,
 * o que as duas pontas já mediram.
 */
const LARGURAS = [
	{ largura: 375, altura: 812 },
	{ largura: 1280, altura: 800 }
];

/** WCAG 2.2 AA, o piso da §12. `best-practice` fica fora: não é o piso, é opinião do axe. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Só o que não admite discussão. Ver o cabeçalho. */
const IMPACTOS = new Set(['critical', 'serious']);

type Baseline = { descricao: string; toleradas: Record<string, string[]> };

const baseline: Baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const medido: Record<string, string[]> = {};

for (const { largura, altura } of LARGURAS) {
	test.describe(`axe ${largura}`, () => {
		test.use({ viewport: { width: largura, height: altura } });

		for (const rota of ROTAS) {
			test(`deve ficar sem violação critical/serious em ${rota} a ${largura}px`, async ({
				page
			}) => {
				await page.goto(rota);

				const resultado = await new AxeBuilder({ page }).withTags(TAGS).analyze();
				const chave = `${rota}@${largura}`;
				const disparadas = resultado.violations
					.filter((v) => IMPACTOS.has(v.impact ?? ''))
					.map((v) => v.id)
					.sort();
				medido[chave] = [...new Set(disparadas)];

				const toleradas = baseline.toleradas[chave] ?? [];
				const novas = medido[chave].filter((id) => !toleradas.includes(id));
				const zumbis = toleradas.filter((id) => !medido[chave].includes(id));

				const detalhe = resultado.violations
					.filter((v) => novas.includes(v.id))
					.map(
						(v) =>
							`  ${v.id} (${v.impact}) — ${v.help}\n` +
							v.nodes
								.slice(0, 3)
								.map((n) => `      ${n.target.join(' ')}`)
								.join('\n')
					)
					.join('\n');

				expect(
					novas,
					`${chave}: violação de acessibilidade nova (WCAG 2.2 AA é piso não negociável, ` +
						`DESIGN.md §12).\n${detalhe}\n  Corrija — ou, se for tolerância consciente, ` +
						`acrescente o id em \`${BASELINE}\` com o motivo no campo \`descricao\`.`
				).toEqual([]);

				expect(
					zumbis,
					`${chave}: a catraca está frouxa. Estas regras estão toleradas em \`${BASELINE}\` e ` +
						`não disparam mais: ${zumbis.join(', ')}. Remova a(s) linha(s) — tolerância que ` +
						'sobrevive à própria correção vira permissão permanente.'
				).toEqual([]);
			});
		}
	});
}

// Só roda com a variável explícita, e nenhum workflow a define: é a ferramenta de apertar a
// catraca à mão, não um auto-conserto que faria o gate concordar com qualquer regressão.
test.afterAll(() => {
	if (process.env.ATUALIZAR_BASELINE !== '1') return;
	const atualizado: Baseline = { ...baseline, toleradas: { ...baseline.toleradas } };
	for (const [chave, ids] of Object.entries(medido)) atualizado.toleradas[chave] = ids;
	writeFileSync(BASELINE, `${JSON.stringify(atualizado, null, '\t')}\n`);
	console.log(`Catraca de a11y reescrita em ${BASELINE}.`);
});
