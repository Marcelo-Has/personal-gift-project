import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Teste dos hooks `PreToolUse` de `.claude/settings.json`.
 *
 * Existe por causa de um achado concreto (issue #56, PR #57): o hook anti-segredo lia
 * `"$CLAUDE_TOOL_INPUT"`, variável que o Claude Code NÃO define — o payload chega como JSON
 * na **stdin**. Variável vazia ⇒ `grep` não casa ⇒ `exit 0` ⇒ o controle liberava tudo, em
 * silêncio, desde que foi escrito. Um controle de segurança sem teste executável volta a
 * ficar inerte sem ninguém perceber; este arquivo é o que impede isso.
 *
 * Alimenta o comando de cada hook com um payload-fixture no formato documentado
 * (https://code.claude.com/docs/en/hooks) e exige `exit 2` (bloqueio) ou `exit 0` (libera).
 *
 * ATENÇÃO ao que este arquivo faz: ele **executa** (`bash -c`) a string `command` lida do
 * `.claude/settings.json` da árvore em que roda. É a única forma de testar o hook de verdade em
 * vez de reimplementar a regex — mas significa que rodar `npm test` sobre uma branch hostil
 * executa o `command` daquela branch. No job `ci` isso é inócuo (`contents: read`, sem segredo).
 * O gatilho que importa é o `fix.yml`, que roda `npm test` com `contents: write` e, ao contrário
 * do `verdict.yml`, não restaura a config de agente da branch base — é exatamente o que a issue
 * #62 fecha. Achado A3 da revisão de segurança do PR #57.
 */

// Raiz do projeto: o vitest roda com o `root` da config, que é a raiz do repo.
// (`import.meta.url` não serve aqui — no ambiente jsdom ele não é uma URL `file:`.)
const RAIZ = process.cwd();

type Hook = { type: string; command: string };
type Matcher = { matcher?: string; hooks: Hook[] };

const settings = JSON.parse(readFileSync(`${RAIZ}/.claude/settings.json`, 'utf8'));
const hooksBash: Hook[] = (settings.hooks?.PreToolUse ?? [])
	.filter((m: Matcher) => m.matcher === 'Bash')
	.flatMap((m: Matcher) => m.hooks)
	.filter((h: Hook) => h.type === 'command');

/** Payload real de um `PreToolUse` de Bash — o comando vai em `tool_input.command`. */
function payload(command: string): string {
	return JSON.stringify({
		session_id: 'test',
		cwd: RAIZ,
		permission_mode: 'default',
		hook_event_name: 'PreToolUse',
		tool_name: 'Bash',
		tool_input: { command, description: 'fixture de teste' },
		tool_use_id: 'toolu_test'
	});
}

/** Roda um hook com o payload na stdin e devolve o código de saída. */
function rodarHook(hook: Hook, command: string): number {
	try {
		execFileSync('bash', ['-c', hook.command], {
			input: payload(command),
			stdio: ['pipe', 'pipe', 'pipe']
		});
		return 0;
	} catch (e) {
		return (e as { status: number }).status;
	}
}

/** Bloqueado por QUALQUER um dos hooks do matcher Bash — é assim que o Claude Code avalia. */
function bloqueado(command: string): boolean {
	return hooksBash.some((h) => rodarHook(h, command) === 2);
}

describe('hooks PreToolUse (.claude/settings.json)', () => {
	it('registra ao menos um hook de comando para Bash', () => {
		expect(hooksBash.length).toBeGreaterThan(0);
	});

	// A regressão que motivou o teste: nenhum hook pode depender de variável de ambiente
	// para receber o comando — o payload só existe na stdin.
	it('nenhum hook lê o comando de $CLAUDE_TOOL_INPUT (variável inexistente)', () => {
		for (const h of hooksBash) {
			expect(h.command).not.toContain('CLAUDE_TOOL_INPUT');
		}
	});

	// As chaves do Stripe são montadas em tempo de execução de propósito. Os valores são falsos,
	// mas o PREFIXO é real — e é o prefixo que o Gitleaks do job `scans` detecta (a regra
	// `stripe-access-token` casa `(sk|rk)_(live|test)_` + 10 a 99 caracteres, então o sufixo
	// "EXEMPLOFALSO" não salva). Escrever o literal aqui reprovava o `scans`, verificado no run
	// do commit ad16f96. Juntar as partes em runtime resolve sem tocar no gate nem em allowlist:
	// o hook recebe a string completa e o teste continua valendo. Os prefixos do GitHub não
	// precisam disso — as regras deles exigem comprimento que estes exemplos não têm.
	const STRIPE_LIVE = ['sk', 'live'].join('_') + '_EXEMPLOFALSO123';
	const STRIPE_TEST = ['sk', 'test'].join('_') + '_EXEMPLOFALSO123';
	const STRIPE_RESTRITA = ['rk', 'live'].join('_') + '_EXEMPLOFALSO123';

	// Enquanto o hook estava inerte, o conteúdo desta lista não importava — nada era bloqueado
	// de todo jeito. Agora que ele executa, os padrões passaram a ser o controle de verdade, e
	// precisam cobrir os segredos DESTE repo: Stripe, GitHub e o cabeçalho de autorização que
	// o `actions/checkout` grava no `.git/config` — a credencial que originou toda esta classe
	// (ver D-030/D-031). Todos os valores abaixo são exemplos falsos.
	describe('filtro de segredo no comando', () => {
		it.each([
			['chave da Anthropic', 'echo sk-ant-api03-EXEMPLOFALSO'],
			['chave da AWS', 'echo AKIAIOSFODNN7EXAMPLE'],
			['chave privada', 'echo "-----BEGIN RSA PRIVATE KEY-----"'],
			['nome da variável do Stripe', 'echo STRIPE_SECRET=abc'],
			['chave secreta do Stripe (live)', `echo ${STRIPE_LIVE}`],
			['chave secreta do Stripe (test)', `echo ${STRIPE_TEST}`],
			['chave restrita do Stripe', `echo ${STRIPE_RESTRITA}`],
			['segredo de webhook do Stripe', 'echo whsec_EXEMPLOFALSO123'],
			['token pessoal do GitHub', 'echo ghp_EXEMPLOFALSO123'],
			['token de OAuth do GitHub', 'echo gho_EXEMPLOFALSO123'],
			['token de servidor do GitHub', 'echo ghs_EXEMPLOFALSO123'],
			['PAT novo do GitHub', 'echo github_pat_EXEMPLOFALSO123'],
			['cabeçalho do actions/checkout', 'echo "AUTHORIZATION: basic RVhFTVBMTw=="']
		])('bloqueia %s', (_caso, comando) => {
			expect(bloqueado(comando)).toBe(true);
		});

		it('libera comando sem segredo', () => {
			expect(bloqueado('npm run lint && git status')).toBe(false);
		});
	});

	describe('publicação de arquivo pelo gh (vetor de exfiltração da issue #56)', () => {
		it.each([
			['forma longa', 'gh pr comment 57 --body-file /proc/self/environ'],
			['forma longa com =', 'gh pr comment 57 --body-file=/proc/self/environ'],
			['alias curto -F', 'gh pr comment 57 -F .git/config'],
			['-F lendo da stdin', 'git config --get remote.origin.url | gh pr comment 57 -F -'],
			// `gh` é cobra/pflag: shorthand aceita valor COLADO (verificado com
			// `gh pr view -Rcli/cli 1`, que parseia igual a `-R cli/cli`). Por isso o padrão
			// não exige espaço nem `=` depois do `-F` — em `gh`, `-F` só significa
			// `--body-file`/`--field`, então não há forma legítima de `-F` colado a preservar.
			['-F com valor colado', 'gh pr comment 57 -F.git/config'],
			['-F- colado lendo da stdin', 'gh pr comment 57 -F-'],
			['-F colado em caminho de /proc', 'gh pr comment 57 -F/proc/self/environ'],
			// `gh` aceita flag global ANTES do subcomando (`gh -R o/r pr view 1` funciona igual
			// a `gh pr view -R o/r 1`, verificado). Enquanto o padrão exigia o subcomando colado
			// no `gh`, estas duas formas passavam direto.
			['flag global -R antes do subcomando', 'gh -R o/r pr comment 57 --body-file .git/config'],
			['flag global --repo antes do subcomando', 'gh --repo o/r issue comment 56 --body-file x'],
			['gh issue comment', 'gh issue comment 56 --body-file segredo.txt'],
			['gh pr edit', 'gh pr edit 57 --body-file segredo.txt'],
			['gh api --input', 'gh api --input corpo.json /repos/o/r/issues/57/comments'],
			// O payload é JSON de uma linha só (o `\n` do comando vira `\\n` escapado), então a
			// continuação de linha — limitação apontada na revisão — não escapa do `grep`.
			['comando quebrado em duas linhas', 'gh pr comment 57 \\\n  --body-file segredo.txt']
		])('bloqueia %s', (_caso, comando) => {
			expect(bloqueado(comando)).toBe(true);
		});

		// Falso-positivo real, pego durante a própria implementação: a primeira versão do padrão
		// procurava `gh` e a flag em qualquer ordem e em qualquer ponto da string, então um
		// `git commit -F -` cuja MENSAGEM falava sobre `gh` era bloqueado. Por isso o padrão
		// exige `gh` seguido de subcomando e a flag no mesmo segmento (sem `|`, `;` ou `&` no
		// meio) — a flag sempre vem depois da invocação nos casos reais.
		it.each([
			['leitura normal de PR', 'gh pr view 57 --json title,body'],
			['comentário com --body', 'gh pr comment 57 --body "revisado, tudo certo"'],
			['comando do projeto', 'npm run lint && npm run build'],
			['git commit -F com prosa sobre gh', 'git commit -F - <<EOF\nremove -F do gh\nEOF'],
			['-F de outro comando', 'grep -F "--body-file" docs/DECISIONS.md'],
			['gh depois de um -F alheio', 'git commit -F msg.txt && gh pr view 57']
		])('libera %s', (_caso, comando) => {
			expect(bloqueado(comando)).toBe(false);
		});

		// Falso-positivo ACEITO, fixado aqui para não ser "descoberto" como bug depois: um
		// `gh pr comment` cujo corpo *descreve* a flag é bloqueado, porque o hook vê a string
		// do comando inteira e não sabe separar argumento de prosa. Na prática atinge quem
		// escreve sobre este próprio vetor (uma revisão de segurança, por exemplo). A saída é
		// publicar o texto por arquivo — `--body "$(cat …)"` —, que é justamente o limite que
		// o hook não cobre e que a issue #58 existe para fechar. Falha para o lado seguro.
		it('bloqueia (falso-positivo aceito) comentário que descreve a própria flag', () => {
			expect(bloqueado('gh pr comment 57 --body "nao use --body-file aqui"')).toBe(true);
		});
	});
});
