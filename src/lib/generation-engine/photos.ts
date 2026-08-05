/**
 * Motor de geração — orquestração da estilização de fotos (F2-06b).
 *
 * Dado o `Order`, resolve a skill `photo-style` por `choice.photoStyleId` (`resolveSkill`,
 * F2-01) e delega a estilização ao `PhotoStyleProvider` correspondente, com os
 * `PhotoStyleOrderParams` derivados de `choice.sizeId`.
 *
 * Independente da narrativa (F2-06a) e da composição de layout (F2-06c) — só produz
 * `StylizedPhoto[]`.
 */
import { MINI_SKU_PHOTO_PARAMS } from '../fixtures/pedido-exemplo';
import type { Order } from '../order';
import { resolveSkill } from '../product-skills/loader';
import { HttpPhotoStyleProvider } from '../product-skills/photo-style/aquarela/http-provider';
import type {
	PhotoStyleOrderParams,
	PhotoStyleProvider,
	SourcePhoto,
	StylizedPhoto
} from '../product-skills/photo-style/provider';

/**
 * Fábrica do provider concreto por id de skill (mesmo padrão de instanciação de
 * `http-provider.test.ts`/`fake-provider.test.ts`). Estilo novo = nova entrada aqui, sem
 * mexer no resto do motor.
 */
const PHOTO_STYLE_PROVIDER_FACTORIES: Record<string, () => PhotoStyleProvider> = {
	aquarela: () => new HttpPhotoStyleProvider()
};

/**
 * `PhotoStyleOrderParams` já derivados por `sizeId`. Só `mini-15x15` está aqui porque é o
 * único SKU com página de produção decidida (`docs/PRODUCT.md` §5, 156×156 mm); o tamanho
 * médio ainda depende de Decision Gate (D-101/D-106) sobre as dimensões finais. Reusa
 * `MINI_SKU_PHOTO_PARAMS` (`fixtures/pedido-exemplo.ts`) em vez de repetir a conta de
 * `mmToPx`/`resolution-config.ts`.
 */
const PHOTO_STYLE_ORDER_PARAMS_BY_SIZE_ID: Record<string, PhotoStyleOrderParams> = {
	[MINI_SKU_PHOTO_PARAMS.sizeId]: MINI_SKU_PHOTO_PARAMS
};

function getPhotoStyleProvider(styleId: string): PhotoStyleProvider {
	const resolved = resolveSkill('photo-style', styleId);
	const factory = PHOTO_STYLE_PROVIDER_FACTORIES[resolved.id];
	if (!factory) {
		throw new Error(
			`generation-engine/photos: nenhum PhotoStyleProvider implementado para "photo-style/${resolved.id}" ` +
				`(o registry resolveu v${resolved.version}, mas o motor só conhece: ` +
				`${Object.keys(PHOTO_STYLE_PROVIDER_FACTORIES).join(', ')})`
		);
	}
	return factory();
}

function getPhotoStyleOrderParams(sizeId: string): PhotoStyleOrderParams {
	const params = PHOTO_STYLE_ORDER_PARAMS_BY_SIZE_ID[sizeId];
	if (!params) {
		throw new Error(
			`generation-engine/photos: sizeId "${sizeId}" sem PhotoStyleOrderParams derivado ` +
				`(tamanhos disponíveis: ${Object.keys(PHOTO_STYLE_ORDER_PARAMS_BY_SIZE_ID).join(', ')})`
		);
	}
	return params;
}

/**
 * Estiliza as fotos de origem do pedido conforme o estilo e o tamanho escolhidos.
 *
 * Resolve a skill `photo-style` por `order.choice.photoStyleId` e os
 * `PhotoStyleOrderParams` por `order.choice.sizeId`, depois delega ao
 * `PhotoStyleProvider` correspondente. Lança erro descritivo se a skill ou o tamanho não
 * forem reconhecidos — nunca falha em silêncio no meio de uma geração paga.
 */
export async function stylizePhotosForOrder(
	photos: SourcePhoto[],
	order: Order
): Promise<StylizedPhoto[]> {
	const provider = getPhotoStyleProvider(order.choice.photoStyleId);
	const params = getPhotoStyleOrderParams(order.choice.sizeId);
	return provider.stylize(photos, params);
}
