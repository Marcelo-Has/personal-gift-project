/**
 * Implementação real de `PhotoStyleProvider` para o estilo `aquarela` (F2-04, issue #115),
 * atrás do gate [D-102] respondido em [D-056] (opção A: API REST de imagem chamada do
 * backend, com teto de resolução).
 *
 * Provedor concreto: API de imagens da OpenAI (`gpt-image-1`, endpoint `images/edits`),
 * ver `../../../server/openai-image.ts`. Sem chave (`OPENAI_API_KEY`) configurada, cai
 * para `AquarelaFakeProvider` — nenhuma chamada paga acontece antes de o segredo existir.
 *
 * ACHADO (não resolvido aqui, ver `docs/DECISIONS.md` [D-056]): o maior lado de saída que
 * o `gpt-image-1` suporta (1536 px) fica ABAIXO do requisito de 300 DPI do maior SKU
 * (~2400 px) e até do SKU mini (~1772 px). Não fazemos upscaling artificial — os
 * metadados de saída reportam o DPI efetivo (menor que 300), honestamente.
 */
import { Buffer } from 'node:buffer';
import type {
	OpenAiImageEditResult,
	OpenAiImageSize,
	OpenAiImagesClient
} from '$lib/server/openai-image';
import { getOpenAiImagesClient } from '$lib/server/openai-image';
import type {
	PhotoStyleOrderParams,
	PhotoStyleProvider,
	SourcePhoto,
	StylizedPhoto
} from '../provider';
import { PHOTO_STYLE_INPUT_MAX_SIDE_PX, PHOTO_STYLE_TARGET_DPI } from '../resolution-config';
import { resizeToMaxSide } from '../resize';
import { AquarelaFakeProvider } from './fake-provider';
import { recordPhotoStyleCallCost } from './cost';

const MODEL = 'gpt-image-1';
const STYLE_PROMPT =
	'Redesenhe esta foto no estilo aquarela: traço suave, cores pastel, textura de ' +
	'aquarela, preservando semelhança e enquadramento do casal. Sem crop, sem elementos ' +
	'que atrapalhem legibilidade se combinado com texto.';

export interface HttpPhotoStyleProviderDeps {
	/** Injeção de dependência para teste — evita rede real. */
	client?: OpenAiImagesClient;
	/** Provider usado quando não há chave configurada. Default: `AquarelaFakeProvider`. */
	fallback?: PhotoStyleProvider;
}

/** Maior lado suportado pelo `gpt-image-1` — ver o ACHADO no docstring do módulo. */
function pickOutputSize(params: PhotoStyleOrderParams): OpenAiImageSize {
	const ratio = params.targetWidthPx / params.targetHeightPx;
	if (ratio > 1.1) return '1536x1024';
	if (ratio < 0.9) return '1024x1536';
	return '1024x1024';
}

export class HttpPhotoStyleProvider implements PhotoStyleProvider {
	readonly styleId = 'aquarela';
	readonly styleVersion = '1.0.0';

	private readonly explicitClient?: OpenAiImagesClient;
	private readonly fallback: PhotoStyleProvider;

	constructor(deps: HttpPhotoStyleProviderDeps = {}) {
		this.explicitClient = deps.client;
		this.fallback = deps.fallback ?? new AquarelaFakeProvider();
	}

	async stylize(photos: SourcePhoto[], params: PhotoStyleOrderParams): Promise<StylizedPhoto[]> {
		const client = this.getClientOrNull();
		if (!client) {
			console.warn(
				'HttpPhotoStyleProvider (aquarela): OPENAI_API_KEY ausente — usando AquarelaFakeProvider, nenhuma chamada paga foi feita.'
			);
			return this.fallback.stylize(photos, params);
		}

		return Promise.all(photos.map((photo) => this.stylizeOne(client, photo, params)));
	}

	private getClientOrNull(): OpenAiImagesClient | null {
		if (this.explicitClient) return this.explicitClient;
		try {
			return getOpenAiImagesClient();
		} catch {
			return null;
		}
	}

	private async stylizeOne(
		client: OpenAiImagesClient,
		photo: SourcePhoto,
		params: PhotoStyleOrderParams
	): Promise<StylizedPhoto> {
		const resizedInput = await resizeToMaxSide(photo.data, PHOTO_STYLE_INPUT_MAX_SIDE_PX);
		const size = pickOutputSize(params);

		let result: OpenAiImageEditResult;
		try {
			result = await client.images.edit({
				model: MODEL,
				image: new Blob([Buffer.from(resizedInput.data)], { type: 'image/png' }),
				prompt: STYLE_PROMPT,
				size
			});
		} catch (err) {
			throw new Error(
				`HttpPhotoStyleProvider (aquarela): falha ao estilizar a foto "${photo.id}": ${(err as Error).message}`,
				{ cause: err }
			);
		}

		if (result.usage) {
			recordPhotoStyleCallCost({
				styleId: this.styleId,
				sourcePhotoId: photo.id,
				model: MODEL,
				inputTokens: result.usage.input_tokens,
				outputTokens: result.usage.output_tokens
			});
		}

		const [output] = result.data;
		const [actualWidthPx, actualHeightPx] = size.split('x').map(Number) as [number, number];
		const requestedLongSidePx = Math.max(params.targetWidthPx, params.targetHeightPx);
		const actualLongSidePx = Math.max(actualWidthPx, actualHeightPx);
		const dpi = Math.round(PHOTO_STYLE_TARGET_DPI * (actualLongSidePx / requestedLongSidePx));

		return {
			sourcePhotoId: photo.id,
			data: new Uint8Array(Buffer.from(output.b64_json, 'base64')),
			metadata: { widthPx: actualWidthPx, heightPx: actualHeightPx, dpi, format: 'png' }
		};
	}
}
