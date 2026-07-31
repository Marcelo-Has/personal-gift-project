import { error, json, type RequestEvent } from '@sveltejs/kit';
import { requireUid } from '$lib/server/auth';
import { getPhotoBucket } from '$lib/server/firebase-admin';
import { checkRateLimit } from '$lib/server/rate-limit';
import {
	ALLOWED_PHOTO_CONTENT_TYPES,
	createPhotoDownloadUrl,
	createPhotoUploadUrl,
	type PhotoContentType,
	type SignableBucket
} from '$lib/server/signed-url';
import type { RequestHandler } from './$types';

/**
 * Primeira rota de servidor do projeto (F1-05b, issue #32).
 *
 * `POST`: recebe só `{ contentType, orderId }` — nunca o arquivo em si (o teto de 10 MB
 * só é garantido pela assinatura V4 em `signed-url.ts`, não por nada que passe por aqui).
 * `photoId` é sempre gerado no servidor; `userId` vem de `locals.uid` (sessão verificada
 * por `requireUid`), nunca do corpo — impede um cliente malicioso de pedir URL na pasta
 * de outro usuário.
 *
 * `GET`: devolve a URL de download assinada (`createPhotoDownloadUrl`) da mesma foto,
 * usada só para o preview logo após o upload — vive na mesma rota para não abrir um
 * segundo diretório de API para uma foto que ainda não é persistida em pedido (#33).
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function isPhotoContentType(value: unknown): value is PhotoContentType {
	return (
		typeof value === 'string' && (ALLOWED_PHOTO_CONTENT_TYPES as readonly string[]).includes(value)
	);
}

export async function _handleUrlDeUpload(
	event: Pick<RequestEvent, 'request' | 'locals'>,
	bucket: SignableBucket = getPhotoBucket(),
	gerarPhotoId: () => string = () => crypto.randomUUID().replace(/-/g, '')
): Promise<Response> {
	const uid = requireUid(event.locals);

	if (
		!checkRateLimit(`upload:${uid}`, {
			windowMs: RATE_LIMIT_WINDOW_MS,
			maxRequests: RATE_LIMIT_MAX_REQUESTS
		})
	) {
		error(429, 'Muitas requisições. Aguarde um pouco antes de tentar de novo.');
	}

	const corpo = await event.request.json().catch(() => null);
	const contentType = (corpo as Record<string, unknown> | null)?.contentType;
	const orderId = (corpo as Record<string, unknown> | null)?.orderId;

	if (!isPhotoContentType(contentType)) {
		error(
			400,
			`Tipo de arquivo não permitido. Aceitos: ${ALLOWED_PHOTO_CONTENT_TYPES.join(', ')}.`
		);
	}
	if (typeof orderId !== 'string' || orderId.length === 0) {
		error(400, 'Pedido inválido.');
	}

	try {
		const resultado = await createPhotoUploadUrl(
			{ userId: uid, orderId, photoId: gerarPhotoId(), contentType },
			bucket
		);
		return json(resultado);
	} catch (erro) {
		error(400, erro instanceof Error ? erro.message : 'Não foi possível gerar a URL de upload.');
	}
}

export const POST: RequestHandler = (event) => _handleUrlDeUpload(event);

export async function _handleUrlDeDownload(
	event: Pick<RequestEvent, 'url' | 'locals'>,
	bucket: SignableBucket = getPhotoBucket()
): Promise<Response> {
	const uid = requireUid(event.locals);

	if (
		!checkRateLimit(`download:${uid}`, {
			windowMs: RATE_LIMIT_WINDOW_MS,
			maxRequests: RATE_LIMIT_MAX_REQUESTS
		})
	) {
		error(429, 'Muitas requisições. Aguarde um pouco antes de tentar de novo.');
	}

	const orderId = event.url.searchParams.get('orderId');
	const photoId = event.url.searchParams.get('photoId');

	if (!orderId || !photoId) {
		error(400, 'Parâmetros orderId e photoId são obrigatórios.');
	}

	try {
		const resultado = await createPhotoDownloadUrl({ userId: uid, orderId, photoId }, bucket);
		return json(resultado);
	} catch (erro) {
		error(400, erro instanceof Error ? erro.message : 'Não foi possível gerar a URL de download.');
	}
}

export const GET: RequestHandler = (event) => _handleUrlDeDownload(event);
