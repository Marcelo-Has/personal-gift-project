/**
 * As rotas de UI do produto e os três viewports da §10 do `DESIGN.md` — a fonte única.
 *
 * POR QUE ESTE ARQUIVO EXISTE (EV2.4 · Q4). A lista nasceu dentro de `screenshots.mjs` na Q2
 * ([D-083]) e é contrato: o `design-critic` procura a evidência em `artifacts/screenshots/` por
 * esta convenção, e `conferir-evidencia.mjs` pergunta ao captador quais arquivos esperar em vez de
 * reimplementar a regra. A Q4 traz um segundo consumidor — o gate de viewports, que visita as
 * MESMAS rotas nas MESMAS larguras para provar que nada transborda. Só que `screenshots.mjs` chama
 * `process.exit` no topo do módulo, então importá-lo mata o processo de quem importa (é por isso
 * que `conferir-evidencia.mjs` usa `spawn`). Um teste de Playwright não pode fazer `spawn` para
 * descobrir onde navegar.
 *
 * A saída é extrair a lista para cá — sem executável junto — e fazer `screenshots.mjs` importá-la.
 * A alternativa (copiar as rotas para dentro do teste) reintroduziria exatamente a divergência que
 * a [D-084] §5 registra como o modo de falha mais caro do desenho: duas cópias da mesma convenção
 * que um dia discordam, e aí um gate reprova o que está certo.
 */

/** O diretório da evidência visual. Relativo à raiz do repositório. */
export const DIRETORIO = 'artifacts/screenshots';

/**
 * As três larguras da §10 do `DESIGN.md`, com altura fixa. A altura não entra no nome do arquivo
 * (a convenção é `<rota>-<viewport>`) mas precisa ser determinística: o screenshot é `fullPage`, e
 * é a altura do viewport que define onde fica a PRIMEIRA DOBRA dentro da imagem — a §3 exige que a
 * assinatura apareça acima dela, e o critic confere isso medindo os primeiros N px.
 */
export const VIEWPORTS = [
	{ largura: 375, altura: 812 },
	{ largura: 768, altura: 1024 },
	{ largura: 1280, altura: 800 }
];

/**
 * As rotas de UI do produto. Lista explícita, não varredura de `src/routes/`: rota dinâmica
 * (`/questionario/[etapa]`) não tem screenshot sem uma instância concreta, e é melhor a instância
 * escolhida ficar visível aqui do que ser adivinhada por um glob. Rota nova de UI acrescenta uma
 * linha nesta lista — sem isso ela não produz evidência (e sem evidência o critic reprova) e não
 * passa pelo gate de viewports.
 */
export const ROTAS = [
	'/', //                       página de produto: a tela que o anúncio abre (§6)
	'/estilo-e-tamanho', //       escolha de estilo e tamanho (hoje no estado vazio, §11)
	'/questionario/pessoas', //   uma etapa concreta do fluxo guiado — a primeira (§6, §10)
	'/pedido/sucesso', //         retorno do Stripe (§13)
	'/pedido/cancelado' //        retorno do Stripe, caminho de desistência
];

/**
 * `/` → `home`; `/pedido/cancelado` → `pedido-cancelado`. Sem barra no nome do arquivo.
 * @param {string} rota
 * @returns {string}
 */
export function slugDaRota(rota) {
	const limpo = rota.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
	return limpo === '' ? 'home' : limpo.replace(/\//g, '-');
}

/**
 * O caminho fixado pela convenção, sempre com `/` (o CI é Linux e o critic lê string).
 * @param {string} rota
 * @param {number} largura
 * @returns {string}
 */
export function caminhoDoArquivo(rota, largura) {
	return `${DIRETORIO}/${slugDaRota(rota)}-${largura}.png`;
}

/** Todos os arquivos que uma rodada completa produz, na ordem em que são gerados. */
export function listarArquivos(rotas = ROTAS, viewports = VIEWPORTS) {
	return viewports.flatMap(({ largura }) => rotas.map((rota) => caminhoDoArquivo(rota, largura)));
}
