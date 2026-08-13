#!/usr/bin/env node
/**
 * Gate determinístico (NÃO-IA) — "DESIGN.md existe e está aprovado".
 *
 * O [D-078] §2 fecha com: "**nenhum código de UI antes de o `DESIGN.md` existir** — gate não-IA
 * no CI, implementado na EV2.4". Este é esse gate. Ele reprova um PR que toca paths de UI quando
 * o `DESIGN.md` da raiz está ausente, ainda em placeholder (`[A PREENCHER]`) ou com `Status`
 * diferente de `aprovado` — que é justamente o estado em que a Fundação o deixa (`candidato`) e
 * do qual o [D-078] §9 proíbe derivar UI.
 *
 * Por que não-IA, e por que no `ci.yml`: mesmo desenho dos guard-rails [D-019] e [D-034] — ou o
 * artefato existe e está válido, ou o job falha. Nenhum julgamento de agente entra aqui; o custo
 * é zero token e alguns segundos de runner. O `design-critic` (que é IA) julga o *gosto* da UI
 * depois; este gate só prova que existe contrato de onde derivá-la.
 *
 * FAIL-CLOSED em toda dúvida. Se a lista de arquivos alterados não puder ser obtida — base do PR
 * indisponível, `git` falhando, push sem comparação —, o gate NÃO se cala: passa a checar o
 * `DESIGN.md` incondicionalmente. Um gate que se omite quando não sabe é um gate que só existe
 * quando não é necessário.
 *
 * Entradas, todas por ambiente (é o que deixa cada ramo exercitável pelo teste):
 *   ARQUIVOS  lista de arquivos alterados, um por linha. Vence sobre o git.
 *   BASE_SHA  commit-base do PR. Sem `ARQUIVOS`, o gate roda `git diff --name-only BASE_SHA...HEAD`.
 *   nenhuma das duas → modo incondicional.
 * O `DESIGN.md` é procurado em `process.cwd()`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O que conta como "toca UI". Derivado da estrutura real do repositório: hoje todo o estilo mora
 * com escopo dentro do `.svelte` (não há `.css` em `src/`), mas o `.css`/`.scss` entra na lista
 * porque um `src/app.css` global é a primeira coisa que uma tarefa de UI cria — e ele nascer sem
 * gate é exatamente o buraco.
 */
const PADROES_UI = [
	/^src\/.*\.svelte$/, //          src/routes/**/*.svelte e src/lib/**/*.svelte
	/\.(css|scss|postcss)$/, //      qualquer folha de estilo, inclusive src/app.css
	/^src\/app\.html$/, //           o shell do documento
	/^DESIGN\.md$/ //                mexer no próprio contrato tem de passar pelo gate
];

/**
 * Saída de build e material exportado. Entram na lista porque `.svelte-kit/`, `build/` e
 * `.netlify/` são cheios de `.css` compilado: sem esta poda, qualquer PR que reconstruísse o app
 * casaria com o padrão de estilo e o gate perderia a relação com o que foi de fato editado.
 */
const IGNORADOS = [
	/^node_modules\//,
	/^\.svelte-kit\//,
	/^build\//,
	/^dist\//,
	/^\.netlify\//,
	/^test-results\//,
	/^playwright-report\//,
	/^artefatos-execucao\//
];

/** `true` se o caminho é código de interface segundo os padrões acima. */
function tocaUI(caminho) {
	const p = caminho.replace(/\\/g, '/').trim();
	if (p === '') return false;
	if (IGNORADOS.some((re) => re.test(p))) return false;
	return PADROES_UI.some((re) => re.test(p));
}

/**
 * Lista de arquivos alterados, ou `null` quando não dá para saber — e `null` NÃO significa
 * "nada mudou": significa "checar assim mesmo" (ver o fail-closed no cabeçalho).
 */
function arquivosAlterados() {
	const explicito = process.env.ARQUIVOS;
	if (explicito !== undefined && explicito.trim() !== '') {
		return explicito.split('\n').filter((l) => l.trim() !== '');
	}
	const base = (process.env.BASE_SHA || '').trim();
	if (base === '') return null;
	try {
		const saida = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
			encoding: 'utf8'
		});
		return saida.split('\n').filter((l) => l.trim() !== '');
	} catch (erro) {
		console.log(`::warning::Não foi possível comparar com ${base} (${erro.message.trim()}).`);
		return null;
	}
}

/**
 * Valida o conteúdo do `DESIGN.md`. Devolve `{ ok: true }` ou `{ ok: false, motivo }`.
 *
 * Os dois estados inválidos não são hipotéticos: o `docs/design/DESIGN-TEMPLATE.md` nasce com
 * `| **Status** | \`[A PREENCHER]\` — \`candidato\` \| \`aprovado\` |`, então uma cópia crua do
 * template dispara os dois de uma vez.
 */
function validar(conteudo) {
	const linhas = conteudo.split('\n');
	const placeholders = linhas
		.map((linha, i) => (linha.includes('[A PREENCHER]') ? i + 1 : 0))
		.filter((n) => n > 0);
	if (placeholders.length > 0) {
		return {
			ok: false,
			motivo: `ainda tem \`[A PREENCHER]\` (linha(s) ${placeholders.join(', ')}) — é o template, não um contrato preenchido.`
		};
	}
	const campo = conteudo.match(/^\|\s*\*\*Status\*\*\s*\|\s*`?([^|`]+?)`?\s*\|/m);
	if (campo === null) {
		return {
			ok: false,
			motivo: 'não tem o campo `Status` na tabela da §0 — o cabeçalho do contrato foi apagado ou renomeado.'
		};
	}
	const status = campo[1].trim().toLowerCase();
	if (status !== 'aprovado') {
		return {
			ok: false,
			motivo: `está com \`Status: ${status}\`. Só \`aprovado\` autoriza derivar UI ([D-078] §9): a Fundação PROPÕE, quem aprova identidade é o dono, num Decision Gate.`
		};
	}
	return { ok: true };
}

function main() {
	const caminho = join(process.cwd(), 'DESIGN.md');
	const alterados = arquivosAlterados();

	if (alterados !== null) {
		const ui = alterados.filter(tocaUI);
		if (ui.length === 0) {
			console.log(
				`Nenhum dos ${alterados.length} arquivo(s) alterado(s) toca paths de UI — gate não se aplica.`
			);
			return 0;
		}
		console.log(`Arquivos de UI neste PR:\n  ${ui.join('\n  ')}`);
	} else {
		console.log('Sem lista de arquivos alterados — checando o `DESIGN.md` incondicionalmente.');
	}

	let conteudo;
	try {
		conteudo = readFileSync(caminho, 'utf8');
	} catch {
		console.log(
			'::error::Este PR toca código de interface e não existe `DESIGN.md` na raiz. ' +
				'Código de UI antes de o `DESIGN.md` existir é violação do [D-078] §2. ' +
				'Rode a Fundação de design (`/design-foundation`) e leve o resultado ao Decision Gate ' +
				'"Identidade visual e narrativa" (`docs/AUTONOMY.md` §2) antes de escrever markup ou CSS.'
		);
		return 1;
	}

	const veredito = validar(conteudo);
	if (!veredito.ok) {
		console.log(
			`::error::Este PR toca código de interface e o \`DESIGN.md\` da raiz ${veredito.motivo}`
		);
		return 1;
	}

	console.log('`DESIGN.md` existe e está `aprovado` — há contrato de onde derivar a UI.');
	return 0;
}

process.exit(main());
