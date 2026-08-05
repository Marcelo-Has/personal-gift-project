/**
 * Testes do motor de geração — orquestração da narrativa (F2-06a, issue #119).
 *
 * A Claude API é mockada (`.claude/rules/testing.md`: mockar dependência externa, não
 * módulo interno), mesmo padrão de `generate.test.ts` da skill `romantico`.
 */
import { describe, expect, it } from 'vitest';
import type {
	ClaudeMessage,
	ClaudeMessageCreateParams,
	ClaudeMessagesClient
} from '$lib/server/claude';
import {
	NarrativaInvalidaError,
	type NarrativeBlocks
} from '../product-skills/narrative-style/romantico/generate';
import { PEDIDO_EXEMPLO } from '../fixtures/pedido-exemplo';
import type { Order } from '../order';
import { gerarNarrativaDoPedido } from './narrative';

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

/** Blocos de narrativa válidos para `PEDIDO_EXEMPLO`: só referencia fotos que existem nele. */
const NARRATIVA_VALIDA: NarrativeBlocks = {
	opening: 'Helena e Tomás se conheceram numa festa e nunca mais se separaram.',
	chapters: [
		{
			title: 'A varanda',
			text: 'Ficaram na varanda a noite toda porque a música estava alta demais lá dentro.'
		}
	],
	polaroidCaptions: [
		{ photoId: 'foto-01-varanda', caption: 'Onde tudo começou.' },
		{ photoId: 'foto-06-cachorro', caption: 'A chegada da Vitória.' }
	],
	timeline: [{ title: 'Primeiro encontro', description: 'A festa na varanda.' }],
	finalLetter: 'Helena e Tomás, que a história continue sendo escrita.',
	dedication: 'Para Helena e Tomás.'
};

describe('gerarNarrativaDoPedido — caminho feliz', () => {
	it('resolve a skill por choice.narrativeStyleId e devolve os NarrativeBlocks', async () => {
		const { client, calls } = fakeClaudeClient(JSON.stringify(NARRATIVA_VALIDA));

		const resultado = await gerarNarrativaDoPedido(PEDIDO_EXEMPLO, { client });

		expect(resultado).toEqual(NARRATIVA_VALIDA);
		expect(calls).toHaveLength(1);
	});
});

describe('gerarNarrativaDoPedido — referência de foto inválida', () => {
	it('lança NarrativaInvalidaError quando uma legenda referencia photoId fora do questionário', async () => {
		const comFotoInventada: NarrativeBlocks = {
			...NARRATIVA_VALIDA,
			polaroidCaptions: [
				...NARRATIVA_VALIDA.polaroidCaptions,
				{ photoId: 'foto-que-nao-existe-no-pedido', caption: 'Legenda inventada' }
			]
		};
		const { client } = fakeClaudeClient(JSON.stringify(comFotoInventada));

		await expect(gerarNarrativaDoPedido(PEDIDO_EXEMPLO, { client })).rejects.toThrow(
			NarrativaInvalidaError
		);
		await expect(gerarNarrativaDoPedido(PEDIDO_EXEMPLO, { client })).rejects.toThrow(
			/foto-que-nao-existe-no-pedido/
		);
	});
});

describe('gerarNarrativaDoPedido — estilo de narrativa desconhecido', () => {
	it('lança erro descritivo quando narrativeStyleId não existe no registry', async () => {
		const pedidoComEstiloInexistente: Order = {
			...PEDIDO_EXEMPLO,
			choice: { ...PEDIDO_EXEMPLO.choice, narrativeStyleId: 'estilo-que-nao-existe' }
		};

		await expect(gerarNarrativaDoPedido(pedidoComEstiloInexistente)).rejects.toThrow(
			/não encontrada/
		);
	});
});
