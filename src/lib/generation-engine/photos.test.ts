import { describe, expect, it, vi } from 'vitest';
import { loadFixturePhotos } from '../fixtures/photos';
import { MINI_SKU_PHOTO_PARAMS, PEDIDO_EXEMPLO } from '../fixtures/pedido-exemplo';

/** Sem `OPENAI_API_KEY`: `HttpPhotoStyleProvider` cai para `AquarelaFakeProvider`, sem rede
 * (mesma técnica de `http-provider.test.ts`). */
vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { stylizePhotosForOrder } = await import('./photos');

describe('stylizePhotosForOrder — caminho feliz', () => {
	it('devolve um StylizedPhoto por SourcePhoto, resolvendo a skill e o tamanho do pedido', async () => {
		const photos = await loadFixturePhotos({ syntheticMaxSidePx: 64 });

		const result = await stylizePhotosForOrder(photos, PEDIDO_EXEMPLO);

		expect(result).toHaveLength(photos.length);
		expect(result.map((photo) => photo.sourcePhotoId)).toEqual(photos.map((photo) => photo.id));
		for (const stylized of result) {
			expect(stylized.metadata).toEqual({
				widthPx: MINI_SKU_PHOTO_PARAMS.targetWidthPx,
				heightPx: MINI_SKU_PHOTO_PARAMS.targetHeightPx,
				dpi: 300,
				format: 'png'
			});
		}
	});

	it('produz saída diferente para fotos de origem diferentes (sem cross-talk entre fotos)', async () => {
		const photos = await loadFixturePhotos({ syntheticMaxSidePx: 64 });

		const [first, second] = await stylizePhotosForOrder(photos, PEDIDO_EXEMPLO);

		expect(Buffer.from(first.data)).not.toEqual(Buffer.from(second.data));
	});
});

describe('stylizePhotosForOrder — erros descritivos', () => {
	it('lança erro descritivo quando photoStyleId não existe no registry', async () => {
		const photos = await loadFixturePhotos({ syntheticMaxSidePx: 64 });
		const order = {
			...PEDIDO_EXEMPLO,
			choice: { ...PEDIDO_EXEMPLO.choice, photoStyleId: 'estilo-inexistente' }
		};

		await expect(stylizePhotosForOrder(photos, order)).rejects.toThrow(/estilo-inexistente/);
	});

	it('lança erro descritivo quando sizeId não tem PhotoStyleOrderParams derivado', async () => {
		const photos = await loadFixturePhotos({ syntheticMaxSidePx: 64 });
		const order = {
			...PEDIDO_EXEMPLO,
			choice: { ...PEDIDO_EXEMPLO.choice, sizeId: 'tamanho-inexistente' }
		};

		await expect(stylizePhotosForOrder(photos, order)).rejects.toThrow(/tamanho-inexistente/);
	});
});
