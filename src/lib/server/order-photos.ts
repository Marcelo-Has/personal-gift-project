import type { Order } from '../order';
import type { SourcePhoto } from '../product-skills/photo-style/provider';
import { getPhotoBucket } from './firebase-admin';
import { photoObjectPath } from './signed-url';

/**
 * Busca os bytes de todas as fotos de um pedido no Storage (F2-07, issue #135) — a peça que
 * faltava entre `order.questionnaire.photos` (só `photoId`/legenda) e `stylizePhotosForOrder`
 * (`generation-engine/photos.ts`, que espera `SourcePhoto[]` com os bytes já em mãos).
 *
 * Lê o objeto direto pela Admin SDK (`bucket.file(path).download()`), não por URL assinada:
 * quem chama já é o próprio servidor com credencial de Admin, então a URL assinada de
 * `signed-url.ts` (pensada para o NAVEGADOR baixar/enviar) seria uma volta desnecessária.
 * Reaproveita `photoObjectPath` de lá para o caminho do objeto continuar sendo montado num
 * único lugar do repositório, nunca recebido pronto (mesmo invariante de `signed-url.ts`).
 */
export interface MinimalStorageBucket {
	file(path: string): { download(): Promise<[Uint8Array]> };
}

export async function loadSourcePhotosFromStorage(
	order: Order,
	uid: string,
	orderId: string,
	bucket: MinimalStorageBucket = getPhotoBucket()
): Promise<SourcePhoto[]> {
	return Promise.all(
		order.questionnaire.photos.map(async ({ photoId }) => {
			const path = photoObjectPath(uid, orderId, photoId);
			const [data] = await bucket.file(path).download();
			return { id: photoId, data: new Uint8Array(data) };
		})
	);
}
