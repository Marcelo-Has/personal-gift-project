import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import type {
	PhotoStyleOrderParams,
	PhotoStyleProvider,
	SourcePhoto,
	StylizedPhoto
} from '../provider';

/**
 * Provider fake e determinístico do estilo aquarela (F2-03).
 *
 * Sem rede: a "estilização" é um hash determinístico da foto de origem + parâmetros do
 * pedido, só para provar o contrato `PhotoStyleProvider` nos testes e no motor futuro
 * (F2-06). O provedor real entra em F2-04, atrás do gate D-102 — troca desta classe por
 * outra implementação da mesma interface, sem mudar quem chama.
 */
export class AquarelaFakeProvider implements PhotoStyleProvider {
	readonly styleId = 'aquarela';
	readonly styleVersion = '1.0.0';

	async stylize(photos: SourcePhoto[], params: PhotoStyleOrderParams): Promise<StylizedPhoto[]> {
		return photos.map((photo) => this.stylizeOne(photo, params));
	}

	private stylizeOne(photo: SourcePhoto, params: PhotoStyleOrderParams): StylizedPhoto {
		const hash = createHash('sha256');
		hash.update(Buffer.from(photo.data));
		hash.update(this.styleId);
		hash.update(this.styleVersion);
		hash.update(params.sizeId);
		hash.update(String(params.targetWidthPx));
		hash.update(String(params.targetHeightPx));

		return {
			sourcePhotoId: photo.id,
			data: new Uint8Array(hash.digest()),
			metadata: {
				widthPx: params.targetWidthPx,
				heightPx: params.targetHeightPx,
				dpi: 300,
				format: 'png'
			}
		};
	}
}
