/**
 * Testes de estilo da skill `narrative-style/romantico` (F2-02, issue #101).
 *
 * A Claude API é mockada (`.claude/rules/testing.md`: mockar dependência externa, não
 * módulo interno) — os golden samples em `golden-samples/` servem de fixture determinística
 * para o mock, não de chamada real.
 *
 * Critério de comparação (documentado aqui por ser específico desta skill —
 * `.claude/rules/right-sizing.md` pede resolver para `romantico` antes de abstrair):
 * 1. **Estrutura** — a resposta precisa bater com `narrativeBlocksSchema` (Zod); é o que os
 *    testes de "resposta inválida" abaixo cobrem.
 * 2. **Fundamentação factual** — nenhuma legenda de polaroid pode referenciar um `photoId`
 *    fora do questionário (`definition.md`: "nunca inventar fatos"); coberto tanto em
 *    tempo de execução (`gerarNarrativaRomantica` lança `NarrativaInvalidaError`) quanto nos
 *    golden samples em si (assertado abaixo).
 * 3. **Golden samples como fixture de regressão** — ao mockar a API para devolver o
 *    `output.json` de um sample, `gerarNarrativaRomantica` precisa devolver exatamente esse
 *    objeto (parsing/validação não alteram o conteúdo aprovado).
 */
import { describe, expect, it } from 'vitest';
import type { CoupleQuestionnaire } from '../../../order';
import type { ClaudeMessage, ClaudeMessageCreateParams, ClaudeMessagesClient } from '$lib/server/claude';
import { resolveSkill } from '../../loader';
import {
	gerarNarrativaRomantica,
	NarrativaInvalidaError,
	narrativeBlocksSchema,
	type NarrativeBlocks
} from './generate';
import completoInput from './golden-samples/completo/input.json';
import completoOutput from './golden-samples/completo/output.json';
import concisoInput from './golden-samples/conciso/input.json';
import concisoOutput from './golden-samples/conciso/output.json';

const GOLDEN_SAMPLES = [
	{ nome: 'completo', input: completoInput, output: completoOutput },
	{ nome: 'conciso', input: concisoInput, output: concisoOutput }
];

/** Cliente Claude falso: a API é dependência externa, então é ela que se mocka. */
function fakeClaudeClient(textoDaResposta: string) {
	const calls: ClaudeMessageCreateParams[] = [];
	const client: ClaudeMessagesClient = {
		messages: {
			async create(params) {
				calls.push(params);
				return { content: [{ type: 'text', text: textoDaResposta }] } satisfies ClaudeMessage;
			}
		}
	};
	return { client, calls };
}

const skill = resolveSkill('narrative-style', 'romantico');

describe('golden samples — schema e fundamentação factual', () => {
	it.each(GOLDEN_SAMPLES)('sample "$nome": output bate com narrativeBlocksSchema', ({ output }) => {
		expect(() => narrativeBlocksSchema.parse(output)).not.toThrow();
	});

	it.each(GOLDEN_SAMPLES)(
		'sample "$nome": toda legenda de polaroid referencia um photoId do input',
		({ input, output }) => {
			const idsValidos = new Set(
				(input as CoupleQuestionnaire).photos.map((foto) => foto.photoId)
			);
			for (const legenda of (output as NarrativeBlocks).polaroidCaptions) {
				expect(idsValidos.has(legenda.photoId)).toBe(true);
			}
		}
	);
});

describe('gerarNarrativaRomantica — golden samples (Claude API mockada)', () => {
	it.each(GOLDEN_SAMPLES)(
		'sample "$nome": devolve exatamente os blocos do golden sample',
		async ({ input, output }) => {
			const { client } = fakeClaudeClient(JSON.stringify(output));

			const resultado = await gerarNarrativaRomantica(input as CoupleQuestionnaire, {
				client,
				skill
			});

			expect(resultado).toEqual(output);
		}
	);

	it('envia o definition.md da skill como bloco de sistema com prompt caching (D-011)', async () => {
		const { client, calls } = fakeClaudeClient(JSON.stringify(completoOutput));

		await gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill });

		expect(calls).toHaveLength(1);
		const [system] = calls[0].system;
		expect(system.text).toContain('Tom afetivo');
		expect(system.cache_control).toEqual({ type: 'ephemeral' });
	});

	it('usa max_tokens grande o bastante para o teto real do narrativeBlocksSchema', async () => {
		const { client, calls } = fakeClaudeClient(JSON.stringify(completoOutput));

		await gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill });

		// Teto de caracteres que o schema permite (mesma conta do comentário de MAX_TOKENS em
		// generate.ts): opening 500 + chapters 20×(120+2.000)=42.400 + polaroidCaptions
		// 20×80=1.600 + timeline 20×(120+500)=12.400 + finalLetter 3.000 + dedication 500.
		// Calculado aqui de forma independente (não copiando o valor de MAX_TOKENS) para que
		// o teste falhe se `narrativeBlocksSchema` crescer sem `MAX_TOKENS` acompanhar.
		const tetoCaracteresSchema =
			500 + 20 * (120 + 2000) + 20 * 80 + 20 * (120 + 500) + 3000 + 500;
		// Piso conservador de 3 caracteres/token (pior que os ~4 chars/token do inglês, para
		// sobrar espaço para acentuação em português e pontuação de JSON).
		const tokensMinimosNecessarios = Math.ceil(tetoCaracteresSchema / 3);

		expect(calls[0].max_tokens).toBeGreaterThan(tokensMinimosNecessarios);
	});

	it('envia o questionário serializado como mensagem do usuário', async () => {
		const { client, calls } = fakeClaudeClient(JSON.stringify(completoOutput));

		await gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill });

		expect(calls[0].messages).toEqual([
			{ role: 'user', content: JSON.stringify(completoInput) }
		]);
	});

	it('nunca envia a URL assinada da foto para a Claude API', async () => {
		const questionarioComUrl: CoupleQuestionnaire = {
			...(completoInput as CoupleQuestionnaire),
			photos: (completoInput as CoupleQuestionnaire).photos.map((foto, indice) =>
				indice === 0
					? {
							...foto,
							url: 'https://storage.googleapis.com/bucket/foto-privada?signature=segredo',
							caption: 'Nosso primeiro encontro'
						}
					: foto
			)
		};
		const { client, calls } = fakeClaudeClient(JSON.stringify(completoOutput));

		await gerarNarrativaRomantica(questionarioComUrl, { client, skill });

		const conteudoEnviado = calls[0].messages[0].content;
		expect(conteudoEnviado).not.toContain('storage.googleapis.com');
		expect(conteudoEnviado).not.toContain('segredo');
		expect(conteudoEnviado).toContain('foto-abc123');
		expect(conteudoEnviado).toContain('Nosso primeiro encontro');
	});
});

describe('gerarNarrativaRomantica — respostas inválidas da API', () => {
	it('lança NarrativaInvalidaError quando a resposta não tem bloco de texto', async () => {
		const client: ClaudeMessagesClient = {
			messages: { create: async () => ({ content: [] }) }
		};

		await expect(
			gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill })
		).rejects.toThrow(NarrativaInvalidaError);
	});

	it('lança NarrativaInvalidaError quando a resposta não é JSON válido', async () => {
		const { client } = fakeClaudeClient('isto não é JSON');

		await expect(
			gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill })
		).rejects.toThrow(/JSON válido/);
	});

	it('lança NarrativaInvalidaError quando falta um bloco exigido pelo contrato', async () => {
		const semDedicatoria: Record<string, unknown> = { ...completoOutput };
		delete semDedicatoria.dedication;
		const { client } = fakeClaudeClient(JSON.stringify(semDedicatoria));

		await expect(
			gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill })
		).rejects.toThrow(/contrato de blocos de narrativa/);
	});

	it('lança NarrativaInvalidaError quando opening excede o teto de 500 caracteres', async () => {
		// Teto de `opening` é 500, o mesmo de `dedication` — os dois mapeiam para a mesma skill
		// de layout (`dedicatoria`, D-061), que rejeita acima de `MAX_DEDICATION_LENGTH = 500`
		// (`layout-element/dedicatoria/compose.ts`). 'a'.repeat(501) fica só 1 acima do teto.
		const comOpeningEnorme: Record<string, unknown> = {
			...(completoOutput as NarrativeBlocks),
			opening: 'a'.repeat(501)
		};
		const { client } = fakeClaudeClient(JSON.stringify(comOpeningEnorme));

		await expect(
			gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill })
		).rejects.toThrow(NarrativaInvalidaError);
	});

	it('lança NarrativaInvalidaError quando uma legenda de polaroid excede o teto de 80 caracteres', async () => {
		// Teto de `caption` é 80, o mesmo de `MAX_CAPTION_LENGTH` — a legenda mapeia para a
		// skill de layout `polaroid-com-texto`, que rejeita acima disso
		// (`layout-element/polaroid-com-texto/compose.ts`). 'a'.repeat(81) fica só 1 acima do teto.
		const comLegendaEnorme: NarrativeBlocks = {
			...(completoOutput as NarrativeBlocks),
			polaroidCaptions: [
				{
					photoId: (completoOutput as NarrativeBlocks).polaroidCaptions[0].photoId,
					caption: 'a'.repeat(81)
				}
			]
		};
		const { client } = fakeClaudeClient(JSON.stringify(comLegendaEnorme));

		await expect(
			gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill })
		).rejects.toThrow(NarrativaInvalidaError);
	});

	it('lança NarrativaInvalidaError quando uma legenda referencia um photoId inexistente', async () => {
		const comFotoInventada: NarrativeBlocks = {
			...(completoOutput as NarrativeBlocks),
			polaroidCaptions: [
				...(completoOutput as NarrativeBlocks).polaroidCaptions,
				{ photoId: 'foto-que-nao-existe', caption: 'Legenda inventada' }
			]
		};
		const { client } = fakeClaudeClient(JSON.stringify(comFotoInventada));

		await expect(
			gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill })
		).rejects.toThrow(/photoId "foto-que-nao-existe"/);
	});
});

describe('gerarNarrativaRomantica — resolução da skill', () => {
	it('usa resolveSkill(\'narrative-style\', \'romantico\') por padrão', async () => {
		const { client } = fakeClaudeClient(JSON.stringify(completoOutput));

		// Sem passar `skill`: exercita o default `resolveSkill(...)` de verdade.
		const resultado = await gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, {
			client
		});

		expect(resultado).toEqual(completoOutput);
	});
});
