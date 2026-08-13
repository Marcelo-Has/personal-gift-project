#!/usr/bin/env node
/**
 * O lint determinístico dos anti-patterns (EV2.4 · Q4 — [D-078] §5 e §7).
 *
 * `.claude/rules/design-antipatterns.md` marca cada item como **[LINT]** (verificável por
 * grep/AST/regra estática) ou **[CRITIC]** (exige julgamento sobre o renderizado). Este script é o
 * gate do subconjunto [LINT]: enquanto ele não existia, a própria rule dizia que esses itens eram
 * "checagem manual do `developer-frontend`" — ou seja, não eram checados.
 *
 * A POLÍTICA DA RULE VALE AQUI, INTEIRA. Nada é proibido em absoluto: cada item é permitido com
 * justificativa registrada. A forma da justificativa neste gate é uma linha no ponto de uso:
 *
 *     <!-- antipattern-ok: 6 -- a altura fixa aqui é do PDF, não da tela; ver DESIGN.md §13 -->
 *     e, em CSS, o mesmo texto dentro de um comentário de bloco.
 *
 * O número é o do item na rule, e o texto depois de `--` é obrigatório: silenciamento anônimo é
 * ele próprio um achado (`justificativa-vazia`), pelo mesmo desenho de `reportDescriptionlessDisables`
 * do `stylelint.config.js`. E silenciamento que não silencia nada também é achado
 * (`justificativa-inutil`) — é o que impede o falso-positivo residual: a exceção não sobrevive à
 * correção que a tornou desnecessária.
 *
 * O QUE ESTE GATE COBRE, E O QUE ELE DEIXA PARA O CRITIC — de propósito. Só entram detectores
 * PRECISOS. Item [LINT] cuja detecção por texto produziria falso-positivo em copy legítima fica de
 * fora e a ausência é declarada em `NAO_DETECTADOS`, com o motivo: um gate determinístico que
 * reprova o certo é pior que um gate que não roda, porque ensina a ignorá-lo.
 *
 * SEM DEPENDÊNCIA, como o resto de `.github/scripts/`: só `node:fs`. Roda em `npm run lint` (é lint,
 * não teste) e no job `ci` do `ci.yml`.
 *
 * Uso:
 *     node .github/scripts/lint-antipatterns.mjs                  # varre os caminhos de UI
 *     node .github/scripts/lint-antipatterns.mjs arq1 arq2 ...    # varre só o que foi passado
 *     node .github/scripts/lint-antipatterns.mjs --listar         # imprime os detectores, sem varrer
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Os caminhos de UI. Mesma definição de "toca UI" do gate `design-md` e dos `paths:` de
 * `screenshots.yml`/`design-critic.yml`: componente/rota `.svelte`, folha de estilo e o shell do
 * documento. Este gate NÃO varre `docs/`, `.claude/` nem o texto narrativo do livro — a própria
 * rule declara o travessão do livro como exceção da língua, e `docs/` é onde os anti-patterns são
 * *citados* para serem proibidos.
 */
const RAIZES = ['src'];
const EXTENSOES = ['.svelte', '.css', '.html'];
const IGNORADOS = new Set(['node_modules', '.svelte-kit', 'build', 'dist', '.git']);

/**
 * Caminhos que este gate NÃO varre mesmo estando sob `src/`. Entrada aqui é allowlist de ARQUIVO e
 * precisa de motivo escrito — hoje há uma só.
 */
const ALLOWLIST_DE_ARQUIVO = [
	{
		// Os literais deste arquivo SÃO o sistema de tokens; ele é a fonte que os detectores de cor
		// existem para proteger. Mesma exceção que o `overrides` do `stylelint.config.js` faz.
		caminho: 'src/lib/styles/tokens.css',
		motivo: 'é a declaração do sistema de tokens do DESIGN.md — o literal aqui é o produto'
	}
];

/**
 * `linha` é 1-indexada. O `trecho` é o que aparece na mensagem, cortado para caber.
 * @param {number} item
 * @param {string} id
 * @param {string} mensagem
 * @param {string} arquivo
 * @param {number} linha
 * @param {string} trecho
 */
function achado(item, id, mensagem, arquivo, linha, trecho) {
	return { item, id, mensagem, arquivo, linha, trecho: trecho.trim().slice(0, 90) };
}

/**
 * Um detector por item da rule. `alvo` limita a extensão em que ele faz sentido; `procurar` recebe
 * o conteúdo inteiro (para regra multilinha) e devolve `{ linha, trecho }`.
 *
 * Regex sobre TEXTO, não AST, e isso é decisão de right-sizing: o parser de `.svelte` traria uma
 * dependência e um modo de falha novos para achar padrões que são literalmente textuais.
 */
const DETECTORES = [
	{
		item: 6,
		id: 'vh-em-vez-de-dvh',
		descricao: '`100vh` (ou `vh` em altura) onde o certo é `dvh` — §13 do DESIGN.md',
		alvo: ['.svelte', '.css', '.html'],
		regex: /(?:^|[^a-z-])(?:min-|max-)?height\s*:\s*[^;{}]*?\d[\d.]*vh\b/gim,
		mensagem:
			'altura em `vh`. A barra do navegador in-app entra e sai (DESIGN.md §13): use `dvh`.'
	},
	{
		item: 12,
		id: 'nasce-invisivel',
		descricao: 'conteúdo que nasce em `opacity: 0` / `visibility: hidden` esperando JS',
		alvo: ['.svelte', '.css'],
		regex: /(?:^|[^a-z-])(opacity\s*:\s*0(?!\.)\s*[;}]|visibility\s*:\s*hidden\s*[;}])/gim,
		mensagem:
			'conteúdo nasce invisível esperando JS. Sem JS ele nunca aparece — e o crawler nunca o vê.'
	},
	{
		item: 14,
		id: 'glassmorphism',
		descricao: '`backdrop-filter` decorativo, sem sobreposição real de camadas',
		alvo: ['.svelte', '.css'],
		regex: /(?:^|[^a-z-])(-webkit-)?backdrop-filter\s*:/gim,
		mensagem: '`backdrop-filter`. A §4.4 tem três níveis de elevação e nenhum é vidro.'
	},
	{
		item: 15,
		id: 'sombra-multicamada',
		descricao: 'três ou mais `box-shadow` empilhadas no mesmo elemento',
		alvo: ['.svelte', '.css'],
		regex: /box-shadow\s*:\s*[^;{}]*?,[^;{}]*?,[^;{}]*?;/gim,
		mensagem: 'sombra multicamada. A §4.4 declara três elevações, todas de uma camada só.'
	},
	{
		item: 18,
		id: 'raio-gigante',
		descricao: '`border-radius` ≥ 24px, uniforme, do botão ao contêiner',
		alvo: ['.svelte', '.css'],
		regex: /border-radius\s*:\s*(?:(?:[2-9]\d|\d{3,})px|(?:[2-9]|\d{2,})(?:\.\d+)?rem)\b/gim,
		mensagem:
			'raio ≥ 24px. A §4.3 vai até 4px (`radius-md`) e declara que `radius-lg` não se aplica: papel tem canto reto.'
	},
	{
		item: 22,
		id: 'fundo-listrado',
		descricao: 'fundo decorativo de listras/grade via `repeating-linear-gradient`',
		alvo: ['.svelte', '.css'],
		regex: /repeating-(linear|radial|conic)-gradient\s*\(/gim,
		mensagem:
			'gradiente repetido como textura de fundo. A §15 registra que o papel pautado foi trocado por UMA linha com trabalho semântico.'
	},
	{
		item: 26,
		id: 'gradiente-roxo-ciano',
		descricao: 'gradiente roxo → ciano/lilás como paleta default',
		alvo: ['.svelte', '.css'],
		// Um gradiente cuja rampa tem uma cor no arco roxo/violeta E outra no arco ciano/turquesa.
		// A checagem real é a função `gradienteRoxoCiano`, abaixo — regex só acha o candidato.
		regex: /(linear|radial|conic)-gradient\s*\([^)]*\)/gim,
		filtro: gradienteRoxoCiano,
		mensagem:
			'gradiente roxo → ciano, a paleta que sai sozinha de um gerador. O único acento deste produto é a tinta `--accent` (§4.1).'
	},
	{
		item: 27,
		id: 'texto-com-gradiente',
		descricao: 'texto preenchido com gradiente',
		alvo: ['.svelte', '.css'],
		regex: /background-clip\s*:\s*text|-webkit-text-fill-color\s*:\s*transparent/gim,
		mensagem: 'texto com gradiente. A voz tipográfica da §4.5 é a fonte, não o preenchimento.'
	},
	{
		item: 28,
		id: 'preto-puro',
		descricao: '`#000` como texto ou fundo',
		alvo: ['.svelte', '.css', '.html'],
		regex: /(?:^|[^0-9a-fA-F#])#(?:000|000000|000000ff)\b|\brgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]/gim,
		mensagem:
			'preto puro. A §4.1 diz que nem `#000` nem cinza 100% dessaturado entram em lugar nenhum — os neutros puxam do acento.'
	},
	{
		item: 36,
		id: 'fonte-default-do-navegador',
		descricao: 'Inter/Roboto/fonte de sistema como voz tipográfica do produto',
		alvo: ['.svelte', '.css', '.html'],
		// Só a PRIMEIRA família da pilha é a voz; `system-ui` no fim do fallback é legítimo e está
		// no próprio `--font-sistema` da §4.5.
		regex: /font-family\s*:\s*([^;{}]+)/gim,
		filtro: fonteDefaultComoVoz,
		mensagem:
			'fonte default do navegador/SO como voz do produto. A §4.5 declara duas famílias com papel: Lora (voz do casal) e Archivo (voz do sistema).'
	},
	{
		item: 47,
		id: 'easing-com-overshoot',
		descricao: '`bounce`/`elastic`/cubic-bezier com overshoot como easing',
		alvo: ['.svelte', '.css'],
		regex: /cubic-bezier\s*\([^)]*\)|\b(bounce|elastic|back(in|out)?)\b\s*[;,)]/gim,
		filtro: easingComOvershoot,
		mensagem:
			'curva com overshoot. A §4.6 declara `--ease-papel` como a única curva do produto: objeto real que para, sem quicar.'
	},
	{
		item: 50,
		id: 'anima-layout',
		descricao: 'animar `width`/`height`/`top`/`left`/`margin`/`padding`',
		alvo: ['.svelte', '.css'],
		regex:
			/transition(-property)?\s*:\s*[^;{}]*\b(width|height|top|left|right|bottom|margin|padding)\b/gim,
		mensagem:
			'transição em propriedade de layout. A §4.6 anima só `transform` e `opacity` — o resto força relayout a cada quadro.'
	},
	{
		item: 51,
		id: 'movimento-decorativo',
		descricao: 'marquee auto-rolante ou ponto pulsante decorativo',
		alvo: ['.svelte', '.css'],
		regex: /<marquee|animation\s*:\s*[^;{}]*\b(pulse|blink|marquee|ping)\b/gim,
		mensagem: 'movimento decorativo em laço. O único momento autoral declarado (§4.6) é a régua que cresce.'
	},
	{
		item: 52,
		id: 'cursor-customizado',
		descricao: 'cursor customizado',
		alvo: ['.svelte', '.css'],
		regex: /cursor\s*:\s*url\s*\(/gim,
		mensagem: 'cursor customizado. Nada no DESIGN.md pede substituir o ponteiro do sistema.'
	},
	{
		item: 53,
		id: 'scroll-dirigindo-animacao',
		descricao: '`addEventListener("scroll", ...)` dirigindo animação',
		alvo: ['.svelte'],
		regex: /addEventListener\s*\(\s*['"`]scroll['"`]|on:scroll|onscroll\s*=/gim,
		mensagem:
			'animação dirigida por evento de scroll. Use `IntersectionObserver` ou animação por scroll do CSS.'
	},
	{
		item: 55,
		id: 'foco-apagado',
		descricao: '`outline: none` no foco sem indicador visível de substituição',
		alvo: ['.svelte', '.css'],
		regex: /outline\s*:\s*(none|0)\s*[;}]/gim,
		mensagem:
			'`outline: none`. A §11 exige foco visível em todo controle desde o primeiro commit: `outline: 2px solid var(--focus)` + `outline-offset: 2px`.'
	},
	{
		item: 60,
		id: 'lorem-ipsum',
		descricao: 'lorem ipsum ou qualquer texto de preenchimento',
		alvo: ['.svelte', '.html'],
		regex:
			/\b(lorem\s+ipsum|dolor\s+sit\s+amet|consectetur\s+adipiscing|texto\s+de\s+exemplo|placeholder\s+text|TODO:?\s*texto|blá\s*blá)\b/gim,
		mensagem: 'texto de preenchimento. Copy de produto é conteúdo, não espaço reservado.'
	},
	{
		item: 61,
		id: 'placeholder-poetico',
		descricao: 'placeholder poético do tipo "Bem-vindo à sua jornada"',
		alvo: ['.svelte', '.html'],
		regex:
			/\b(sua\s+jornada|your\s+journey|nossa\s+jornada|eternize|experiência\s+única|momentos\s+inesquecíveis|surpreenda\s+quem\s+você\s+ama)\b/gim,
		mensagem:
			'placeholder poético. A §9 lista essas palavras entre as que este produto NUNCA diz — ele fala de UMA história, não em genérico.'
	},
	{
		item: 62,
		id: 'cta-generico',
		descricao: '"Comece agora" / "Get Started" como CTA primário',
		alvo: ['.svelte', '.html'],
		regex:
			/>\s*(comece\s+agora|começar\s+agora|get\s+started|saiba\s+mais|clique\s+aqui|learn\s+more|ok)\s*</gim,
		mensagem:
			'rótulo genérico de ação. A §9 exige que o rótulo nomeie a ação E deixe previsível o que vem depois ("Continuar para as fotos").'
	},
	{
		item: 63,
		id: 'buzzword',
		descricao: 'buzzword de marketing',
		alvo: ['.svelte', '.html'],
		regex:
			/\b(revolucion[ae]|potencialize|next-?gen|seamless|disruptiv[ao]|inovador[ae]?s?\b|de\s+ponta|estado\s+da\s+arte)\b/gim,
		mensagem: 'buzzword de marketing. A §9 declara um registro só: conversa direta e concreta.'
	},
	{
		item: 64,
		id: 'dado-de-exemplo-generico',
		descricao: 'dado de exemplo genérico ("João Silva", "Acme", "usuario@email.com")',
		alvo: ['.svelte', '.html'],
		regex:
			/\b(jo[ãa]o\s+silva|maria\s+silva|fulano|beltrano|sicrano|acme|lorem\s+corp|usuario@email\.com|user@example\.com|john\s+doe|jane\s+doe)\b/gim,
		mensagem:
			'dado de exemplo genérico. A §11 exige exemplo real e específico no estado vazio — "nunca João Silva", nas palavras do contrato.'
	},
	{
		item: 65,
		id: 'rotulo-de-etapa-generico',
		descricao: '"Etapa 1 / Etapa 2 / Etapa 3" no lugar do nome da etapa',
		alvo: ['.svelte', '.html'],
		regex: />\s*(etapa|passo|step)\s+\d+\s*</gim,
		mensagem:
			'rótulo de etapa genérico. A §9 exige nome: "como se conheceram", "as fotos", "a mensagem final".'
	},
	{
		item: 66,
		id: 'strip-de-metadados',
		descricao: 'strip decorativo de metadados (cidade · hora · versão · build)',
		alvo: ['.svelte', '.html'],
		regex: /\bbuild\s*[·|]\s*v?\d|\bv\d+\.\d+\.\d+\s*[·|]/gim,
		mensagem: 'strip decorativo de metadados em página de produto.'
	},
	{
		item: 67,
		id: 'dica-de-rolagem',
		descricao: 'dica de rolagem ("↓ role para explorar")',
		alvo: ['.svelte', '.html'],
		regex: /(role\s+para|scroll\s+(down|to\s+explore)|desça\s+para|arraste\s+para\s+baixo)/gim,
		mensagem: 'dica de rolagem. A barra de rolagem já é a affordance.'
	},
	{
		item: 68,
		id: 'alt-ausente-ou-generico',
		descricao: '`alt` ausente, ou genérico ("imagem", "foto"), em imagem não decorativa',
		alvo: ['.svelte', '.html'],
		regex: /<img\b[^>]*>/gim,
		filtro: altAusenteOuGenerico,
		mensagem:
			'`<img>` sem `alt`, ou com `alt` genérico. `alt=""` é legítimo só em imagem puramente decorativa.'
	}
];

/**
 * Os itens [LINT] da rule que este gate NÃO detecta, e o motivo. Existe para ser LIDO — a
 * `tests/design/antipatterns.test.ts` compara esta lista + os detectores com as marcas [LINT] da
 * própria rule e reprova se um item novo aparecer lá sem virar detector nem entrar aqui. É o que
 * impede a lista de envelhecer em silêncio.
 */
export const NAO_DETECTADOS = [
	{
		item: 4,
		motivo:
			'"numeração decorativa de seção" depende de a numeração NÃO carregar sequência — e "1." numa lista ordenada de passos carrega. Distinguir é julgamento: fica com o critic (dimensão 1).'
	},
	{
		item: 5,
		motivo:
			'"card dentro de card" exige a árvore renderizada com o CSS aplicado; no texto do componente não há como saber o que é card. Dimensão 1 do critic.'
	},
	{
		item: 7,
		motivo:
			'`calc(33% - 1rem)` em flex só é achado quando existe uma alternativa em Grid para AQUELE layout. Sem o render, a regra reprovaria uso legítimo de porcentagem.'
	},
	{
		item: 16,
		motivo:
			'"halo colorido de offset zero" é `box-shadow: 0 0 …` — que é exatamente a forma de um anel de foco legítimo (§11). Separar os dois exige saber se o seletor é `:focus-visible`, e a regra ficaria mais frágil que útil.'
	},
	{
		item: 17,
		motivo:
			'"borda hairline E sombra larga no mesmo elemento" precisa resolver a cascata (as duas podem vir de seletores diferentes). Resolver cascata é o trabalho do render — dimensão 3 do critic.'
	},
	{
		item: 19,
		motivo:
			'"faixa colorida grossa" depende de o elemento ser card/callout/alerta, o que é papel semântico, não texto. Dimensão 3 do critic.'
	},
	{
		item: 20,
		motivo:
			'emoji no lugar de ícone: o produto tem emoji legítimo em copy do casal e em comentário de código. Um grep de emoji reprovaria os dois. Dimensão 6 do critic.'
	},
	{
		item: 21,
		motivo:
			'"ícones de famílias diferentes" só se verifica com um inventário de ícones — que este produto ainda não tem (§7.1 permite ícone em quatro papéis, nenhum implementado). Vira detector quando existir o primeiro ícone.'
	},
	{
		item: 29,
		motivo:
			'"cinza neutro sobre fundo colorido" exige resolver qual cor está sob qual texto. É contraste computado no render — e quem mede isso é o gate de a11y (axe), não um grep.'
	},
	{
		item: 30,
		motivo:
			'cor literal em vez de token: **é coberto**, e por gate melhor — o `stylelint.config.js` o pega com o parser de CSS, sem falso-positivo de texto.'
	},
	{
		item: 31,
		motivo:
			'contraste abaixo de AA: **é coberto** pelo gate de a11y (axe `color-contrast`, critical/serious), que mede no render em vez de adivinhar no texto.'
	},
	{
		item: 37,
		motivo:
			'"tela inteira em 400/500" é uma propriedade da TELA, não de uma linha: só se sabe somando os pesos do que foi renderizado. Dimensão 2 do critic.'
	},
	{
		item: 38,
		motivo:
			'escala achatada: a escala mora no `tokens.css` e é comparada com a §5 do `DESIGN.md` por `tests/design/tokens.test.ts` — que é a checagem correta, e não um grep no componente.'
	},
	{
		item: 39,
		motivo:
			'`letter-spacing` além de -0,04em: fica sem detector porque hoje nenhum componente declara `letter-spacing`, e o `stylelint` é o lugar certo quando declarar. Entra como regra de valor permitido no primeiro uso.'
	},
	{
		item: 40,
		motivo:
			'medida de linha em 45–75 caracteres: é medição no render (largura do container ÷ largura do glifo). O `--medida-leitura` do token vem da §6; conferir o resultado é dimensão 2 do critic.'
	},
	{
		item: 41,
		motivo:
			'corpo abaixo de 16px / UI abaixo de 14px: **é coberto** pelo `stylelint`, que só aceita `font-size: var(--text-*)`, e a escala da §5 não tem passo abaixo de 14px.'
	},
	{
		item: 42,
		motivo:
			'caixa alta em texto corrido: `text-transform: uppercase` é legítimo em rótulo curto; distinguir rótulo de texto corrido é julgamento. Dimensão 2 do critic.'
	},
	{
		item: 43,
		motivo:
			'nível de heading pulado: exige a árvore do documento montada (o `h2` pode vir de um layout e o `h4` da rota). É o `heading-order` do axe, no gate de a11y.'
	},
	{
		item: 44,
		motivo:
			'`font-size` literal fora da escala: **é coberto** pelo `stylelint`, com o parser de CSS.'
	},
	{
		item: 48,
		motivo:
			'`scale`/`translateY` de hover "como default a tudo que é clicável" — o achado é a UNIVERSALIDADE, não a existência. Contar quantos seletores clicáveis têm hover é análise de cascata; dimensão 4 do critic.'
	},
	{
		item: 49,
		motivo:
			'ausência de bloco `prefers-reduced-motion` onde existe animação: detectável, mas hoje NENHUM componente anima. Vira detector no primeiro `@keyframes`/`transition` do produto — construí-lo agora seria gate sem superfície.'
	},
	{
		item: 54,
		motivo:
			'imagem que escala/rotaciona no hover: precisa casar o seletor de hover com o elemento ser imagem, atravessando a cascata. Dimensão 4 do critic.'
	},
	{
		item: 56,
		motivo:
			'`placeholder` como rótulo: exige saber se existe `<label>` associado ao campo — relação de árvore, não de texto. É o `label` do axe, no gate de a11y.'
	},
	{
		item: 69,
		motivo:
			'travessão em copy de interface: a própria rule declara o texto narrativo do livro como exceção da língua, e o produto usa "—" legitimamente como separador em `<title>`. Um grep reprovaria copy correta, que é o pior modo de falha de um gate determinístico. Dimensão 6 do critic.'
	}
];

/** Item 26: a rampa do gradiente tem cor no arco roxo/violeta E cor no arco ciano/turquesa. */
function gradienteRoxoCiano(/** @type {string} */ trecho) {
	const roxo =
		/\b(purple|violet|indigo|orchid|magenta|fuchsia|blueviolet|rebeccapurple)\b|#(6|7|8|9|a|b)[0-9a-f]{1}[0-9a-f]{2}(e|f)[0-9a-f]|hsl\(\s*2[5-9]\d/i;
	const ciano =
		/\b(cyan|aqua|turquoise|teal|aquamarine|skyblue|lightblue)\b|#[0-9a-f]{2}(d|e|f)[0-9a-f](e|f)[0-9a-f]|hsl\(\s*1[6-9]\d/i;
	return roxo.test(trecho) && ciano.test(trecho);
}

/** Item 36: a PRIMEIRA família da pilha é a voz. `system-ui` no fim do fallback é legítimo. */
function fonteDefaultComoVoz(/** @type {string} */ trecho) {
	const valor = trecho.replace(/^[^:]*:\s*/, '').trim();
	if (valor.startsWith('var(')) return false;
	const primeira = valor
		.split(',')[0]
		.trim()
		.replace(/^['"]|['"]$/g, '')
		.toLowerCase();
	return [
		'inter',
		'roboto',
		'system-ui',
		'-apple-system',
		'blinkmacsystemfont',
		'segoe ui',
		'helvetica',
		'helvetica neue',
		'arial',
		'sans-serif',
		'serif',
		'ui-sans-serif',
		'ui-serif'
	].includes(primeira);
}

/** Item 47: cubic-bezier com y fora de [0,1] quica; as palavras `bounce`/`elastic`/`back` idem. */
function easingComOvershoot(/** @type {string} */ trecho) {
	const bezier = trecho.match(/cubic-bezier\s*\(([^)]*)\)/i);
	if (!bezier) return true;
	const n = bezier[1].split(',').map((/** @type {string} */ v) => Number(v.trim()));
	if (n.length !== 4 || n.some(Number.isNaN)) return false;
	return n[1] < 0 || n[1] > 1 || n[3] < 0 || n[3] > 1;
}

/** Item 68: `alt` ausente, ou presente e genérico. `alt=""` (decorativa) é legítimo. */
function altAusenteOuGenerico(/** @type {string} */ trecho) {
	const alt = trecho.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/i);
	if (!alt) return true;
	// `alt={expressão}` é conteúdo dinâmico: o valor não está aqui, e reprová-lo seria adivinhar.
	if (alt[3] !== undefined) return false;
	const valor = (alt[1] ?? alt[2] ?? '').trim().toLowerCase();
	if (valor === '') return false;
	return ['imagem', 'foto', 'image', 'photo', 'picture', 'icone', 'ícone', 'icon', 'logo'].includes(
		valor
	);
}

/**
 * Apaga o CONTEÚDO dos comentários, preservando posição e quebras de linha.
 *
 * Sem isto o gate reprova a si mesmo: a etapa de fotos tem um comentário que explica que "quem
 * envia as fotos cedo e volta depois vê `<img>` quebrado", e o detector do item 68 achava aquele
 * `<img>` — um achado dentro de uma frase que descreve o achado. Comentário é onde a fábrica
 * escreve POR QUE algo é ou não é anti-pattern; varrê-lo transforma documentação em defeito.
 *
 * Cada caractere de comentário vira espaço (a quebra de linha fica), então o índice de toda
 * ocorrência continua batendo com o número de linha. A heurística de string é a mínima que
 * protege o caso real: `//` só abre comentário quando o caractere anterior não é `:` (senão
 * `https://` viraria comentário), e aspas/crase abrem região protegida.
 */
export function mascararComentarios(/** @type {string} */ conteudo) {
	const saida = conteudo.split('');
	const apagar = (/** @type {number} */ de, /** @type {number} */ ate) => {
		for (let k = de; k < ate && k < saida.length; k += 1) {
			if (saida[k] !== '\n' && saida[k] !== '\r') saida[k] = ' ';
		}
	};

	let i = 0;
	let aspas = '';
	while (i < conteudo.length) {
		const c = conteudo[i];
		if (aspas !== '') {
			if (c === '\\') i += 2;
			else {
				if (c === aspas) aspas = '';
				i += 1;
			}
			continue;
		}
		if (c === '"' || c === "'" || c === '`') {
			aspas = c;
			i += 1;
			continue;
		}
		if (conteudo.startsWith('<!--', i)) {
			const fim = conteudo.indexOf('-->', i + 4);
			const ate = fim === -1 ? conteudo.length : fim + 3;
			apagar(i, ate);
			i = ate;
			continue;
		}
		if (conteudo.startsWith('/*', i)) {
			const fim = conteudo.indexOf('*/', i + 2);
			const ate = fim === -1 ? conteudo.length : fim + 2;
			apagar(i, ate);
			i = ate;
			continue;
		}
		if (conteudo.startsWith('//', i) && conteudo[i - 1] !== ':') {
			const fim = conteudo.indexOf('\n', i);
			const ate = fim === -1 ? conteudo.length : fim;
			apagar(i, ate);
			i = ate;
			continue;
		}
		i += 1;
	}
	return saida.join('');
}

/** `antipattern-ok: N -- motivo`, em comentário de markup ou de CSS, na linha ANTERIOR. */
const SILENCIAMENTO = /antipattern-ok\s*:\s*(\d+)\s*(?:--\s*(.*?))?\s*(?:-->|\*\/|$)/;

function lerSilenciamentos(/** @type {string[]} */ linhas) {
	/** @type {Map<number, { item: number, justificativa: string, linhaDoComentario: number, usado: boolean }>} */
	const porLinha = new Map();
	linhas.forEach((linha, i) => {
		const m = linha.match(SILENCIAMENTO);
		if (!m) return;
		porLinha.set(i + 2, {
			item: Number(m[1]),
			justificativa: (m[2] || '').trim(),
			linhaDoComentario: i + 1,
			usado: false
		});
	});
	return porLinha;
}

function arquivosDe(/** @type {string} */ raiz) {
	/** @type {string[]} */
	const encontrados = [];
	const visitar = (/** @type {string} */ dir) => {
		for (const entrada of readdirSync(dir)) {
			if (IGNORADOS.has(entrada)) continue;
			const caminho = join(dir, entrada);
			if (statSync(caminho).isDirectory()) visitar(caminho);
			else if (EXTENSOES.some((ext) => entrada.endsWith(ext))) encontrados.push(caminho);
		}
	};
	visitar(raiz);
	return encontrados;
}

/**
 * Varre um arquivo e devolve os achados dele. Exportada para o teste.
 * @param {string} caminhoRelativo
 * @param {string} conteudo
 */
export function varrer(caminhoRelativo, conteudo) {
	const extensao = EXTENSOES.find((ext) => caminhoRelativo.endsWith(ext));
	const linhas = conteudo.split(/\r?\n/);
	// Os silenciamentos são lidos do texto CRU (eles moram em comentário); os detectores varrem o
	// texto mascarado (comentário não é UI).
	const silenciamentos = lerSilenciamentos(linhas);
	const codigo = mascararComentarios(conteudo);
	const achados = [];

	for (const detector of DETECTORES) {
		if (extensao === undefined || !detector.alvo.includes(extensao)) continue;
		detector.regex.lastIndex = 0;
		for (const ocorrencia of codigo.matchAll(detector.regex)) {
			const trecho = ocorrencia[0];
			if (detector.filtro && !detector.filtro(trecho)) continue;
			// A linha da ocorrência: quantas quebras existem antes dela.
			const linha = codigo.slice(0, ocorrencia.index ?? 0).split(/\r?\n/).length;
			// O silenciamento vale para a linha em que o padrão COMEÇA.
			const silenciamento = silenciamentos.get(linha);
			if (silenciamento && silenciamento.item === detector.item) {
				silenciamento.usado = true;
				if (silenciamento.justificativa === '') {
					achados.push(
						achado(
							detector.item,
							'justificativa-vazia',
							'`antipattern-ok` sem justificativa depois de `--`. Exceção anônima é ela própria um achado: escreva por que ESTE produto quer ISTO.',
							caminhoRelativo,
							silenciamento.linhaDoComentario,
							linhas[silenciamento.linhaDoComentario - 1] ?? ''
						)
					);
				}
				continue;
			}
			achados.push(
				achado(detector.item, detector.id, detector.mensagem, caminhoRelativo, linha, trecho)
			);
		}
	}

	// Exceção que não silencia nada: o falso-positivo residual que a onda existe para não deixar.
	for (const [, s] of silenciamentos) {
		if (s.usado) continue;
		achados.push(
			achado(
				s.item,
				'justificativa-inutil',
				`\`antipattern-ok: ${s.item}\` não silencia nada nesta linha. Exceção que sobreviveu à correção vira ruído — remova-a.`,
				caminhoRelativo,
				s.linhaDoComentario,
				linhas[s.linhaDoComentario - 1] ?? ''
			)
		);
	}

	return achados;
}

/** @param {string[]} argv */
function main(argv) {
	if (argv.includes('--listar')) {
		for (const d of DETECTORES) console.log(`${String(d.item).padStart(2)}  ${d.id}  ${d.descricao}`);
		console.log(`\n${DETECTORES.length} detectores; ${NAO_DETECTADOS.length} itens [LINT] declarados sem detector.`);
		return 0;
	}

	const explicitos = argv.filter((/** @type {string} */ a) => !a.startsWith('--'));
	const alvos = (
		explicitos.length > 0 ? explicitos : RAIZES.flatMap((raiz) => arquivosDe(raiz))
	).map((/** @type {string} */ caminho) => relative(process.cwd(), caminho).split(sep).join('/'));

	const ignorados = new Set(ALLOWLIST_DE_ARQUIVO.map((a) => a.caminho));
	const achados = [];
	for (const caminho of alvos) {
		if (ignorados.has(caminho)) continue;
		achados.push(...varrer(caminho, readFileSync(caminho, 'utf8')));
	}

	if (achados.length === 0) {
		console.log(
			`Anti-patterns [LINT]: nenhum achado em ${alvos.length} arquivo(s) de UI ` +
				`(${DETECTORES.length} detectores).`
		);
		return 0;
	}

	for (const a of achados) {
		console.log(
			`::error file=${a.arquivo},line=${a.linha}::anti-pattern ${a.item} (${a.id}) — ${a.mensagem}\n` +
				`  ${a.arquivo}:${a.linha}  ${a.trecho}`
		);
	}
	console.log(
		`\n${achados.length} achado(s) de anti-pattern. Corrija, ou registre a justificativa no ponto ` +
			'de uso com `antipattern-ok: <item> -- <por que ESTE produto quer ISTO>` ' +
			'(`.claude/rules/design-antipatterns.md`: nada é proibido em absoluto, mas nada passa sem uma das duas).'
	);
	return 1;
}

// `import.meta.main` não existe no Node 22: o guard é comparar o módulo com o `argv[1]`, por
// `pathToFileURL` (no Windows, `file://J:\...` não bate com a URL do módulo). Sem este guard, o
// teste que importa `varrer`/`NAO_DETECTADOS` executaria a varredura e mataria o processo — que é
// exatamente o problema que `screenshots.mjs` tem e que obriga `conferir-evidencia.mjs` a usar
// `spawn` em vez de `import`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exit(main(process.argv.slice(2)));
}
