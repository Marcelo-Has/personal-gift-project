import { spawn, spawnSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Teste do gate de evidência do Visual Verification Loop (EV2.4 · Q3 — [D-078] §7, [D-083] §6).
 *
 * Os dois scripts são EXECUTADOS, como `screenshots.test.ts` faz com o captador e
 * `design-md.test.ts` com o gate do `DESIGN.md`: o que importa aferir é o **código de saída**, que
 * é o que fica vermelho no PR. Reimplementar a regra dentro do teste provaria só que sei
 * escrevê-la duas vezes.
 *
 * O `aguardar-screenshots.mjs` fala com a API do GitHub, então o teste sobe um servidor stub e
 * aponta `GITHUB_API_URL` para ele — assim o caminho de rede é exercitado de verdade, inclusive o
 * fail-closed por tempo esgotado, sem depender de rede nem de credencial.
 */

const CONFERIR = join(process.cwd(), '.github', 'scripts', 'conferir-evidencia.mjs');
const AGUARDAR = join(process.cwd(), '.github', 'scripts', 'aguardar-screenshots.mjs');
const CAPTADOR = join(process.cwd(), '.github', 'scripts', 'screenshots.mjs');
const SHA = 'b57d75d8574b409860640197cf189b56a6a2ba6c';

function rodar(script: string, env: Record<string, string> = {}) {
	const r = spawnSync(process.execPath, [script], {
		encoding: 'utf8',
		env: { ...process.env, ...env }
	});
	return { codigo: r.status, saida: `${r.stdout}${r.stderr}` };
}

/**
 * Versão assíncrona, obrigatória quando o servidor stub vive NESTE processo: `spawnSync` bloqueia
 * o event loop, o servidor nunca chega a responder ao filho e os dois travam esperando um ao
 * outro. Foi o que aconteceu na primeira versão deste teste.
 */
function rodarAsync(script: string, env: Record<string, string> = {}) {
	return new Promise<{ codigo: number | null; saida: string }>((resolver) => {
		const filho = spawn(process.execPath, [script], { env: { ...process.env, ...env } });
		let saida = '';
		filho.stdout.on('data', (p) => (saida += p));
		filho.stderr.on('data', (p) => (saida += p));
		filho.on('close', (codigo) => resolver({ codigo, saida }));
	});
}

/** A lista esperada vem do próprio captador — a mesma fonte que o script sob teste consulta. */
function arquivosEsperados(): string[] {
	const r = spawnSync(process.execPath, [CAPTADOR, '--listar'], { encoding: 'utf8' });
	return r.stdout
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l !== '');
}

/** Um destino temporário com os PNGs pedidos (conteúdo qualquer — o gate afere presença e tamanho). */
function destinoCom(arquivos: string[]): string {
	const raiz = mkdtempSync(join(tmpdir(), 'evidencia-'));
	for (const relativo of arquivos) {
		const caminho = join(raiz, relativo);
		mkdirSync(dirname(caminho), { recursive: true });
		writeFileSync(caminho, 'png');
	}
	return raiz;
}

describe('conferir-evidencia — o 7º quality gate', () => {
	const esperados = arquivosEsperados();

	it('deve sair 0 quando a rodada completa está no disco', () => {
		const { codigo, saida } = rodar(CONFERIR, { DESTINO: destinoCom(esperados) });
		expect(codigo).toBe(0);
		expect(saida).toContain(`${esperados.length} screenshots`);
	});

	it('deve reprovar e nomear o arquivo quando falta UM screenshot', () => {
		const faltando = esperados[0];
		const destino = destinoCom(esperados.filter((a) => a !== faltando));
		const { codigo, saida } = rodar(CONFERIR, { DESTINO: destino });
		expect(codigo).toBe(1);
		expect(saida).toContain('::error::');
		expect(saida).toContain(faltando);
	});

	it('deve reprovar quando o PNG existe com 0 byte — verde sem conteúdo não é evidência', () => {
		const destino = destinoCom(esperados);
		writeFileSync(join(destino, esperados[0]), '');
		const { codigo, saida } = rodar(CONFERIR, { DESTINO: destino });
		expect(codigo).toBe(1);
		expect(saida).toContain(esperados[0]);
	});

	it('deve reprovar quando não há evidência nenhuma', () => {
		const { codigo, saida } = rodar(CONFERIR, { DESTINO: destinoCom([]) });
		expect(codigo).toBe(1);
		expect(saida).toContain(`faltam ${esperados.length} de ${esperados.length}`);
	});

	it('deve escrever a reprovação de ofício no arquivo de veredito, para o step não-IA publicar', () => {
		const raiz = mkdtempSync(join(tmpdir(), 'veredito-'));
		const veredito = join(raiz, 'design-critic-veredito.md');
		const { codigo } = rodar(CONFERIR, {
			DESTINO: destinoCom([]),
			VEREDITO_ARQUIVO: veredito
		});
		expect(codigo).toBe(1);
		const texto = readFileSync(veredito, 'utf8');
		expect(texto).toContain('REPROVADO');
		expect(texto).toContain('de ofício');
		// Sem isto o PR ficaria vermelho e mudo: o guard-rail exige arquivo não-vazio.
		expect(texto.length).toBeGreaterThan(0);
	});
});

/**
 * O gate rodou vermelho e MUDO em todo PR de UI até a EV2.4 · Q5, e nenhum teste pegou.
 *
 * `conferir-evidencia.mjs` obtinha a lista esperada rodando `screenshots.mjs --listar`, e o
 * captador importa `playwright-core` no topo do módulo. O job `design-critic` **não instala
 * dependências** — ele baixa PNGs prontos e chama um agente, sem `npm ci` —, então no CI aquele
 * `--listar` saía 1 com `ERR_MODULE_NOT_FOUND`, o gate falhava fechado, o veredito nunca era
 * escrito e o `design-critic` ficava impossível de passar.
 *
 * Os testes acima não pegaram porque rodam sob o vitest, **com `node_modules` no disco**: o
 * ambiente do teste tinha o que o ambiente do job não tem. Aferir o código de saída não bastava —
 * o que falta aferir é a PROPRIEDADE DE AMBIENTE: nenhum script que o job executa sem `npm ci`
 * pode depender de um pacote de `node_modules`, por qualquer caminho.
 *
 * SÃO DOIS TESTES, e o primeiro é o que importa. A checagem estática do grafo de `import` sozinha
 * NÃO teria pegado o bug original: ele entrava por `spawn` do captador, não por `import`, e
 * nenhuma leitura de `import` alcança um processo filho. Por isso o teste primário **executa** os
 * scripts a partir de uma cópia fora da árvore do repositório, onde a resolução de módulos do Node
 * não encontra `node_modules` nenhum — o que reproduz o ambiente do job e cobre `import` e `spawn`
 * de uma vez. A checagem estática fica como complemento barato, porque ela NOMEIA o pacote culpado
 * quando reprova, e um gate que diz qual é o pacote custa menos para consertar.
 */
describe('scripts do design-critic rodam sem `npm ci`', () => {
	/** Os scripts que `design-critic.yml` executa com `node`, num job que não instala dependências. */
	const SEM_INSTALACAO = [
		'conferir-evidencia.mjs',
		'veredito-critic.mjs',
		'aguardar-screenshots.mjs'
	];

	/** Os especificadores `import ... from '<x>'` / `export ... from '<x>'` de um arquivo. */
	function importesDe(arquivo: string): string[] {
		const texto = readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n');
		return [...texto.matchAll(/^\s*(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/gm)].map(
			(m) => m[1]
		);
	}

	/** Percorre o grafo a partir de `entrada`, seguindo só os relativos, e junta os "bare". */
	function pacotesAlcancados(entrada: string): string[] {
		const vistos = new Set<string>();
		const bare = new Set<string>();
		const fila = [entrada];
		while (fila.length > 0) {
			const atual = fila.pop() as string;
			if (vistos.has(atual)) continue;
			vistos.add(atual);
			for (const spec of importesDe(atual)) {
				if (spec.startsWith('node:')) continue;
				if (spec.startsWith('.')) {
					fila.push(join(dirname(atual), spec));
					continue;
				}
				bare.add(`${spec} (via ${atual.split(/[\\/]/).pop()})`);
			}
		}
		return [...bare];
	}

	/**
	 * Uma cópia de `.github/scripts/` num diretório temporário FORA da árvore do repositório. A
	 * resolução de módulos do Node sobe pelos diretórios pais procurando `node_modules`; rodando de
	 * dentro do repo ela sempre acharia o do projeto, e o teste passaria sem provar nada.
	 */
	function scriptsIsolados(): string {
		const raiz = mkdtempSync(join(tmpdir(), 'sem-node-modules-'));
		cpSync(join(process.cwd(), '.github', 'scripts'), join(raiz, 'scripts'), { recursive: true });
		return join(raiz, 'scripts');
	}

	it('conferir-evidencia deve rodar num ambiente SEM node_modules — é o ambiente do job', () => {
		// O caso feliz: evidência completa. Se o script precisar de qualquer pacote, por `import` ou
		// por `spawn` de um irmão que importe, ele morre aqui em vez de morrer no CI, mudo.
		const destino = destinoCom(arquivosEsperados());
		const { codigo, saida } = rodar(join(scriptsIsolados(), 'conferir-evidencia.mjs'), {
			DESTINO: destino
		});
		expect(saida).not.toContain('ERR_MODULE_NOT_FOUND');
		expect(saida).not.toContain('Não foi possível saber quais screenshots esperar');
		expect(codigo).toBe(0);
	});

	it.each(SEM_INSTALACAO)(
		'%s não deve alcançar nenhum pacote de node_modules por import — o job não roda `npm ci`',
		(script) => {
			expect(pacotesAlcancados(join(process.cwd(), '.github', 'scripts', script))).toEqual([]);
		}
	);

	it('deve manter a fonte única: o gate espera exatamente o que o captador produz', () => {
		// O captador é quem PRODUZ os arquivos; o gate é quem os EXIGE. Se as duas listas divergirem,
		// o critic reprova PR correto. Aqui o `--listar` pode rodar: este teste tem node_modules.
		const doGate = rodar(CONFERIR, { DESTINO: destinoCom([]) }).saida;
		for (const arquivo of arquivosEsperados()) expect(doGate).toContain(arquivo);
	});
});

describe('aguardar-screenshots — encontrar o run da evidência', () => {
	let servidor: Server;
	let base: string;
	let resposta: unknown = { workflow_runs: [] };

	beforeAll(async () => {
		servidor = createServer((_req, res) => {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(resposta));
		});
		await new Promise<void>((pronto) => servidor.listen(0, '127.0.0.1', pronto));
		const endereco = servidor.address();
		base = `http://127.0.0.1:${typeof endereco === 'object' && endereco ? endereco.port : 0}`;
	});

	afterAll(() => servidor.close());

	function esperar(extra: Record<string, string> = {}) {
		return rodarAsync(AGUARDAR, {
			GITHUB_API_URL: base,
			GITHUB_REPOSITORY: 'dono/repo',
			GITHUB_TOKEN: '',
			SHA,
			TIMEOUT_SEGUNDOS: '1',
			INTERVALO_SEGUNDOS: '1',
			...extra
		});
	}

	it('deve devolver o run concluído do commit e publicá-lo em GITHUB_OUTPUT', async () => {
		resposta = {
			workflow_runs: [
				{ id: 111, head_sha: SHA, status: 'completed', conclusion: 'success', run_number: 4 }
			]
		};
		const saidaGh = join(mkdtempSync(join(tmpdir(), 'gh-out-')), 'out.txt');
		writeFileSync(saidaGh, '');
		const { codigo } = await esperar({ GITHUB_OUTPUT: saidaGh });
		expect(codigo).toBe(0);
		expect(readFileSync(saidaGh, 'utf8')).toContain('run_id=111');
	});

	it('deve escolher a tentativa mais nova quando há vários runs do mesmo commit', async () => {
		resposta = {
			workflow_runs: [
				{ id: 111, head_sha: SHA, status: 'completed', conclusion: 'success', run_number: 4 },
				{ id: 222, head_sha: SHA, status: 'completed', conclusion: 'success', run_number: 7 }
			]
		};
		const { codigo, saida } = await esperar();
		expect(codigo).toBe(0);
		expect(saida).toContain('222');
	});

	it('deve ignorar run de OUTRO commit e esgotar o tempo — evidência de outro commit não vale', async () => {
		resposta = {
			workflow_runs: [
				{ id: 333, head_sha: 'outro'.padEnd(40, '0'), status: 'completed', conclusion: 'success' }
			]
		};
		const { codigo, saida } = await esperar();
		expect(codigo).toBe(1);
		expect(saida).toContain('::error::');
	});

	it('deve falhar de imediato quando o captador foi PULADO — é `paths:` divergente', async () => {
		resposta = {
			workflow_runs: [{ id: 444, head_sha: SHA, status: 'completed', conclusion: 'skipped' }]
		};
		const { codigo, saida } = await esperar({ TIMEOUT_SEGUNDOS: '60' });
		expect(codigo).toBe(1);
		expect(saida).toContain('PULADO');
		expect(saida).toContain('paths:');
	});

	it('deve sair 1 quando o run não conclui dentro do tempo — fail-closed, nunca "seguir sem evidência"', async () => {
		resposta = {
			workflow_runs: [{ id: 555, head_sha: SHA, status: 'in_progress', conclusion: null }]
		};
		const { codigo, saida } = await esperar();
		expect(codigo).toBe(1);
		expect(saida).toContain('::error::');
		expect(saida).toContain('reprova o PR de ofício');
	});
});

/**
 * O acoplamento mais frágil do desenho da Q3, e o único que falha em silêncio: o `design-critic`
 * consome o artefato do `screenshots.yml`. Se os dois filtros `paths:` divergirem, existe um PR
 * em que o critic roda e o captador não — e aí o critic espera 20 minutos por um run inexistente e
 * reprova por fail-closed um PR correto. Nada no CI perceberia isso até acontecer com um PR real,
 * então o guard-rail é este teste.
 */
describe('paths: do design-critic e do screenshots', () => {
	/**
	 * Lê o bloco `paths:` como TEXTO, sem parser de YAML — mesmo desenho de `reentrada.test.ts`,
	 * inclusive a normalização de `\r\n` (o repositório não tem `.gitattributes`, então checkout no
	 * Windows entrega CRLF). Uma dependência nova só para este guard-rail não se paga.
	 */
	function pathsDe(workflow: string): string[] {
		const texto = readFileSync(join(process.cwd(), '.github', 'workflows', workflow), 'utf8')
			.replace(/\r\n/g, '\n')
			.split('\n');
		const inicio = texto.findIndex((linha) => /^\s*paths:\s*$/.test(linha));
		if (inicio === -1) return [];
		const itens: string[] = [];
		for (const linha of texto.slice(inicio + 1)) {
			const casou = linha.match(/^\s+- '(.+)'\s*$/);
			if (casou === null) break;
			itens.push(casou[1]);
		}
		return itens;
	}

	it('deve definir "toca UI" exatamente da mesma forma nos dois workflows', () => {
		const critic = pathsDe('design-critic.yml');
		expect(critic.length).toBeGreaterThan(0);
		expect(critic).toEqual(pathsDe('screenshots.yml'));
	});

	it('deve incluir a própria infra da Q3, para que uma mudança nela seja exercitada', () => {
		const critic = pathsDe('design-critic.yml');
		expect(critic).toContain('.github/scripts/conferir-evidencia.mjs');
		expect(critic).toContain('docs/design/DESIGN-CRITIC-RUBRIC.md');
	});
});
