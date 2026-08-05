/**
 * Testes do motor de geração — composição dos spreads finais de layout (F2-06c, issue #121).
 */
import { describe, expect, it } from 'vitest';
import { PEDIDO_EXEMPLO } from '../fixtures/pedido-exemplo';
import type { Order } from '../order';
import { CartaValidationError } from '../product-skills/layout-element/carta/compose';
import type { NarrativeBlocks } from '../product-skills/narrative-style/romantico/generate';
import type { StylizedPhoto } from '../product-skills/photo-style/provider';
import {
	composeLayoutForOrder,
	LayoutMissingStylizedPhotoError,
	LayoutPageBudgetExceededError,
	LayoutUnknownSizeError
} from './layout';

/** Blocos de narrativa válidos para `PEDIDO_EXEMPLO`: só referencia fotos que existem nele
 * (mesmas legendas curtas de `narrative.test.ts`, dentro do `MAX_CAPTION_LENGTH` de
 * `polaroid-com-texto` — 80 caracteres, mais apertado que o limite de 200 do schema de
 * narrativa). */
const NARRATIVA_VALIDA: NarrativeBlocks = {
	opening: 'Helena e Tomás se conheceram numa festa e nunca mais se separaram.',
	chapters: [
		{
			title: 'A varanda',
			text: 'Ficaram na varanda a noite toda porque a música estava alta demais lá dentro.'
		},
		{
			title: 'A feira de domingo',
			text: 'Viraram fregueses do mesmo barraquinho de pastel por seis anos seguidos.'
		}
	],
	polaroidCaptions: [
		{ photoId: 'foto-01-varanda', caption: 'Onde tudo começou.' },
		{ photoId: 'foto-06-cachorro', caption: 'A chegada da Vitória.' }
	],
	timeline: [
		{ title: 'Primeiro encontro', description: 'A festa na varanda.' },
		{ title: 'Chegada da Vitória', description: 'A cachorra que ninguém queria.' }
	],
	finalLetter: 'Helena e Tomás, que a história continue sendo escrita.',
	dedication: 'Para Helena e Tomás.'
};

/** Uma `StylizedPhoto` fake por `photoId` de `PEDIDO_EXEMPLO`, suficiente para casar com
 * `polaroidCaptions`. Dimensões arbitrárias (positivas, aspecto razoável) — o motor não
 * revalida o conteúdo binário, só casa por `sourcePhotoId`. */
function fakeStylizedPhoto(photoId: string): StylizedPhoto {
	return {
		sourcePhotoId: photoId,
		data: new Uint8Array(),
		metadata: { widthPx: 1843, heightPx: 1843, dpi: 300, format: 'png' }
	};
}

const FOTOS_ESTILIZADAS: StylizedPhoto[] = PEDIDO_EXEMPLO.questionnaire.photos.map((photo) =>
	fakeStylizedPhoto(photo.photoId)
);

describe('composeLayoutForOrder — caminho feliz', () => {
	it('devolve os spreads na ordem abertura → capítulos → polaroids → timeline → carta → dedicatória', () => {
		const book = composeLayoutForOrder(PEDIDO_EXEMPLO, NARRATIVA_VALIDA, FOTOS_ESTILIZADAS);

		expect(book.sizeId).toBe(PEDIDO_EXEMPLO.choice.sizeId);
		expect(book.spreads.map((spread) => spread.type)).toEqual([
			'abertura',
			'capitulo',
			'capitulo',
			'polaroid',
			'polaroid',
			'timeline',
			'carta',
			'dedicatoria'
		]);
		expect(book.totalPages).toBe(book.spreads.reduce((sum, spread) => sum + spread.pageCount, 0));
		expect(book.totalPages).toBeLessThanOrEqual(book.pageBudget);
	});

	it('casa cada polaroid com a StylizedPhoto certa por photoId', () => {
		const book = composeLayoutForOrder(PEDIDO_EXEMPLO, NARRATIVA_VALIDA, FOTOS_ESTILIZADAS);

		const polaroids = book.spreads.filter((spread) => spread.type === 'polaroid');
		expect(polaroids.map((spread) => spread.composition)).toEqual(
			NARRATIVA_VALIDA.polaroidCaptions.map((caption) =>
				expect.objectContaining({ photo: expect.objectContaining({ path: caption.photoId }) })
			)
		);
	});
});

describe('composeLayoutForOrder — estouro de orçamento de páginas', () => {
	it('lança LayoutPageBudgetExceededError sem truncar quando os spreads não cabem no SKU', () => {
		const capituloCurto = {
			title: 'Capítulo',
			text: 'Um capítulo bem curto para não estourar sozinho.'
		};
		// 20 capítulos (1 página cada) + 16 polaroids (as 8 fotos do fixture, repetidas para
		// dobrar a contagem sem precisar de mais fotos) + abertura/timeline/carta/dedicatória
		// somam bem mais que o orçamento de 32 páginas do SKU mini.
		const narrativaGigante: NarrativeBlocks = {
			...NARRATIVA_VALIDA,
			chapters: Array.from({ length: 20 }, () => capituloCurto),
			polaroidCaptions: [
				...PEDIDO_EXEMPLO.questionnaire.photos,
				...PEDIDO_EXEMPLO.questionnaire.photos
			].map((photo, index) => ({
				photoId: photo.photoId,
				caption: `Legenda ${index}`
			}))
		};

		expect(() =>
			composeLayoutForOrder(PEDIDO_EXEMPLO, narrativaGigante, FOTOS_ESTILIZADAS)
		).toThrow(LayoutPageBudgetExceededError);
		expect(() =>
			composeLayoutForOrder(PEDIDO_EXEMPLO, narrativaGigante, FOTOS_ESTILIZADAS)
		).toThrow(/orçamento de \d+ páginas/);
	});
});

describe('composeLayoutForOrder — erros descritivos', () => {
	it('lança LayoutMissingStylizedPhotoError quando falta a StylizedPhoto de uma legenda', () => {
		const semAUltimaFoto = FOTOS_ESTILIZADAS.filter(
			(photo) => photo.sourcePhotoId !== 'foto-06-cachorro'
		);

		expect(() => composeLayoutForOrder(PEDIDO_EXEMPLO, NARRATIVA_VALIDA, semAUltimaFoto)).toThrow(
			LayoutMissingStylizedPhotoError
		);
		expect(() => composeLayoutForOrder(PEDIDO_EXEMPLO, NARRATIVA_VALIDA, semAUltimaFoto)).toThrow(
			/foto-06-cachorro/
		);
	});

	it('lança LayoutUnknownSizeError quando sizeId não tem geometria derivada', () => {
		const pedidoComTamanhoInexistente: Order = {
			...PEDIDO_EXEMPLO,
			choice: { ...PEDIDO_EXEMPLO.choice, sizeId: 'tamanho-inexistente' }
		};

		expect(() =>
			composeLayoutForOrder(pedidoComTamanhoInexistente, NARRATIVA_VALIDA, FOTOS_ESTILIZADAS)
		).toThrow(LayoutUnknownSizeError);
	});

	it('propaga o erro tipado da skill quando um capítulo não cabe em MAX_PAGES', () => {
		const narrativaComCapituloEnorme: NarrativeBlocks = {
			...NARRATIVA_VALIDA,
			chapters: [
				{
					title: 'Capítulo enorme',
					text: 'Um parágrafo bem longo. '.repeat(90).trim().slice(0, 2000)
				}
			]
		};

		expect(() =>
			composeLayoutForOrder(PEDIDO_EXEMPLO, narrativaComCapituloEnorme, FOTOS_ESTILIZADAS)
		).toThrow(CartaValidationError);
	});
});
