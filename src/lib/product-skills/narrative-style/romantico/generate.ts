/**
 * Geração da skill `narrative-style/romantico` v1 (F2-02, issue #101).
 *
 * Recebe o `CoupleQuestionnaire` (`src/lib/order.ts`) e devolve os blocos de narrativa do
 * contrato de `definition.md` (abertura, capítulos, legendas de polaroid, linha do tempo,
 * carta final, dedicatória), gerados pela Claude API a partir de um prompt derivado do
 * próprio `definition.md` — nunca prompt solto (`.claude/rules/product-skills.md`).
 *
 * A skill é resolvida via `resolveSkill('narrative-style', 'romantico')` (F2-01) para ler
 * `definition.md` do disco e confirmar a versão — o contrato em prosa é a fonte da verdade
 * do estilo, este módulo só o traduz em instrução de sistema + parsing tipado da resposta.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { getClaudeClient, type ClaudeMessagesClient } from '$lib/server/claude';
import { resolveSkill, type ResolvedSkill } from '../../loader';
import type { CoupleQuestionnaire } from '../../../order';

const CLAUDE_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 4096;

export const narrativeChapterSchema = z.object({
	title: z.string().trim().min(1).max(120),
	text: z.string().trim().min(1).max(2000)
});

export const polaroidCaptionSchema = z.object({
	photoId: z.string().trim().min(1),
	caption: z.string().trim().min(1).max(200)
});

export const timelineEntrySchema = z.object({
	title: z.string().trim().min(1).max(120),
	description: z.string().trim().min(1).max(500)
});

/** Blocos de narrativa do contrato de `definition.md`, mapeados aos elementos de layout. */
export const narrativeBlocksSchema = z.object({
	opening: z.string().trim().min(1).max(1000),
	chapters: z.array(narrativeChapterSchema).min(1).max(20),
	polaroidCaptions: z.array(polaroidCaptionSchema).max(20),
	timeline: z.array(timelineEntrySchema).max(20),
	finalLetter: z.string().trim().min(1).max(3000),
	dedication: z.string().trim().min(1).max(500)
});

export type NarrativeChapter = z.infer<typeof narrativeChapterSchema>;
export type PolaroidCaption = z.infer<typeof polaroidCaptionSchema>;
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;
export type NarrativeBlocks = z.infer<typeof narrativeBlocksSchema>;

/** Erro tipado — permite quem chama distinguir falha de geração de outros erros. */
export class NarrativaInvalidaError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NarrativaInvalidaError';
	}
}

const FORMATO_JSON_ESPERADO = `Responda APENAS com um objeto JSON (sem markdown, sem texto fora do JSON) no formato:
{
  "opening": string,
  "chapters": [{ "title": string, "text": string }, ...],
  "polaroidCaptions": [{ "photoId": string, "caption": string }, ...],
  "timeline": [{ "title": string, "description": string }, ...],
  "finalLetter": string,
  "dedication": string
}
"polaroidCaptions" só pode referenciar "photoId" que exista nas fotos informadas no
questionário — nunca invente uma foto.`;

function construirPromptDeSistema(definitionMd: string): string {
	return `Você gera a narrativa de um mini livro personalizado de casal, seguindo o contrato\nda skill de estilo abaixo. Use só o que o casal informou; se faltar dado, seja genérico\nsem afirmar nada falso.\n\n${definitionMd}\n\n${FORMATO_JSON_ESPERADO}`;
}

function extrairTexto(response: { content: { type: string; text?: string }[] }): string {
	const bloco = response.content.find((b) => b.type === 'text' && b.text);
	if (!bloco?.text) {
		throw new NarrativaInvalidaError('Claude API não retornou nenhum bloco de texto na resposta.');
	}
	return bloco.text;
}

function validarFundamentacaoFactual(
	blocks: NarrativeBlocks,
	questionnaire: CoupleQuestionnaire
): void {
	const idsValidos = new Set(questionnaire.photos.map((foto) => foto.photoId));
	const idInvalido = blocks.polaroidCaptions.find((legenda) => !idsValidos.has(legenda.photoId));
	if (idInvalido) {
		throw new NarrativaInvalidaError(
			`Legenda de polaroid referencia photoId "${idInvalido.photoId}" que não está no questionário.`
		);
	}
}

export interface GerarNarrativaRomanticaOptions {
	client?: ClaudeMessagesClient;
	skill?: ResolvedSkill;
}

/**
 * Gera os blocos de narrativa da skill `romantico` a partir do questionário do casal.
 *
 * O bloco de sistema carrega `cache_control: { type: 'ephemeral' }` (D-011: prompt caching)
 * porque `definition.md` é o mesmo para todo pedido desta versão da skill — só o conteúdo
 * do usuário (o questionário) muda por chamada.
 */
export async function gerarNarrativaRomantica(
	questionnaire: CoupleQuestionnaire,
	{
		client = getClaudeClient(),
		skill = resolveSkill('narrative-style', 'romantico')
	}: GerarNarrativaRomanticaOptions = {}
): Promise<NarrativeBlocks> {
	const definitionMd = readFileSync(path.join(skill.absolutePath, 'definition.md'), 'utf-8');

	const response = await client.messages.create({
		model: CLAUDE_MODEL,
		max_tokens: MAX_TOKENS,
		system: [
			{
				type: 'text',
				text: construirPromptDeSistema(definitionMd),
				cache_control: { type: 'ephemeral' }
			}
		],
		messages: [{ role: 'user', content: JSON.stringify(questionnaire) }]
	});

	const texto = extrairTexto(response);

	let parsed: unknown;
	try {
		parsed = JSON.parse(texto);
	} catch {
		throw new NarrativaInvalidaError('Resposta da Claude API não é JSON válido.');
	}

	const resultado = narrativeBlocksSchema.safeParse(parsed);
	if (!resultado.success) {
		throw new NarrativaInvalidaError(
			`Resposta da Claude API não bate com o contrato de blocos de narrativa: ${resultado.error.message}`
		);
	}

	validarFundamentacaoFactual(resultado.data, questionnaire);

	return resultado.data;
}
