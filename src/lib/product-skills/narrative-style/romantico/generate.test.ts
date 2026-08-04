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

	it('envia o questionário serializado como mensagem do usuário', async () => {
		const { client, calls } = fakeClaudeClient(JSON.stringify(completoOutput));

		await gerarNarrativaRomantica(completoInput as CoupleQuestionnaire, { client, skill });

		expect(calls[0].messages).toEqual([
			{ role: 'user', content: JSON.stringify(completoInput) }
		]);
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
