import { getPhotoBucket } from './firebase-admin';

/**
 * URLs assinadas e expiráveis para as fotos (F1-04, issue #22).
 *
 * `.claude/rules/security.md`: "URLs de foto sempre assinadas e expiráveis; nunca
 * links públicos permanentes". Este módulo é o ÚNICO caminho de acesso ao Storage —
 * `storage.rules` nega tudo, então nem o dono autenticado alcança o bucket pelo SDK
 * cliente. O fluxo é: rota do servidor confere quem está pedindo → chama uma das
 * funções abaixo → devolve uma URL que morre em minutos.
 *
 * A assinatura V4 é feita com a service account e vai direto ao Google Cloud
 * Storage, que não avalia as regras do Firebase. Por isso a autorização ("este uid
 * é dono desta foto?") é responsabilidade de quem chama — e por isso o caminho do
 * objeto é sempre montado aqui, a partir de ids validados, nunca recebido pronto.
 */

/** Teto de validade. Vale para todas as URLs, mesmo se o chamador pedir mais. */
export const MAX_TTL_SECONDS = 15 * 60;

export const DEFAULT_UPLOAD_TTL_SECONDS = 5 * 60;
export const DEFAULT_DOWNLOAD_TTL_SECONDS = 10 * 60;

/** Formatos aceitos no upload. Assinar `contentType` prende a URL a um tipo só. */
export const ALLOWED_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Teto de tamanho do upload (`.claude/rules/security.md`: "limites de upload").
 * 10 MB cobre com folga foto de celular. Sem isto, quem tem a URL pode dar PUT
 * de um arquivo de qualquer tamanho enquanto ela vale — custo de Storage aberto.
 */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export type PhotoContentType = (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number];

/**
 * Ids que entram no caminho do objeto. Allow-list em vez de blocklist: qualquer
 * coisa fora de `[A-Za-z0-9_-]` é recusada, o que descarta de uma vez `..`, `/`,
 * `%2e%2e` e afins — nenhum id consegue escapar da pasta do próprio usuário.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Interface mínima do bucket usada aqui. Existe para o teste poder passar um
 * bucket falso sem credencial nem emulador — não é uma camada de abstração sobre
 * o Storage.
 */
export interface SignableBucket {
	file(path: string): {
		getSignedUrl(options: {
			version: 'v4';
			action: 'read' | 'write';
			expires: number;
			contentType?: string;
			extensionHeaders?: Record<string, string>;
		}): Promise<[string]>;
	};
}

function assertSafeId(value: string, label: string): void {
	if (!SAFE_ID.test(value)) {
		throw new Error(
			`${label} inválido: use apenas letras, números, "-" e "_" (1 a 128 caracteres).`
		);
	}
}

function resolveExpiry(ttlSeconds: number, fallback: number): number {
	const requested = Number.isFinite(ttlSeconds) ? ttlSeconds : fallback;
	if (requested <= 0) {
		throw new Error('A validade da URL assinada precisa ser maior que zero.');
	}
	return Date.now() + Math.min(requested, MAX_TTL_SECONDS) * 1000;
}

/**
 * Caminho canônico da foto no bucket. Começa por `users/<uid>/` para que o dono
 * seja legível no próprio caminho — útil em auditoria e no pipeline de exclusão
 * de fotos (D-100, Fase 3).
 */
export function photoObjectPath(userId: string, orderId: string, photoId: string): string {
	assertSafeId(userId, 'userId');
	assertSafeId(orderId, 'orderId');
	assertSafeId(photoId, 'photoId');
	return `users/${userId}/orders/${orderId}/photos/${photoId}`;
}

export interface PhotoUploadUrlInput {
	userId: string;
	orderId: string;
	photoId: string;
	contentType: PhotoContentType;
	ttlSeconds?: number;
}

/** URL de upload (PUT) de uma foto, presa ao `contentType` e de vida curta. */
export async function createPhotoUploadUrl(
	{ userId, orderId, photoId, contentType, ttlSeconds }: PhotoUploadUrlInput,
	bucket: SignableBucket = getPhotoBucket()
): Promise<{ url: string; path: string; expiresAt: number }> {
	if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(contentType)) {
		throw new Error(
			`Tipo de arquivo não permitido: ${contentType}. Aceitos: ${ALLOWED_PHOTO_CONTENT_TYPES.join(', ')}.`
		);
	}

	const path = photoObjectPath(userId, orderId, photoId);
	const expiresAt = resolveExpiry(
		ttlSeconds ?? DEFAULT_UPLOAD_TTL_SECONDS,
		DEFAULT_UPLOAD_TTL_SECONDS
	);

	const [url] = await bucket.file(path).getSignedUrl({
		version: 'v4',
		action: 'write',
		expires: expiresAt,
		contentType,
		// Entra na assinatura: o cliente é obrigado a mandar o header, e o Google
		// Cloud Storage recusa qualquer corpo acima do teto. Um limite checado só
		// no navegador não limitaria nada — quem tem a URL fala direto com o GCS.
		extensionHeaders: { 'x-goog-content-length-range': `0,${MAX_PHOTO_BYTES}` }
	});

	return { url, path, expiresAt };
}

export interface PhotoDownloadUrlInput {
	userId: string;
	orderId: string;
	photoId: string;
	ttlSeconds?: number;
}

/** URL de leitura de uma foto já enviada. Expira; não é link público permanente. */
export async function createPhotoDownloadUrl(
	{ userId, orderId, photoId, ttlSeconds }: PhotoDownloadUrlInput,
	bucket: SignableBucket = getPhotoBucket()
): Promise<{ url: string; path: string; expiresAt: number }> {
	const path = photoObjectPath(userId, orderId, photoId);
	const expiresAt = resolveExpiry(
		ttlSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS,
		DEFAULT_DOWNLOAD_TTL_SECONDS
	);

	const [url] = await bucket.file(path).getSignedUrl({
		version: 'v4',
		action: 'read',
		expires: expiresAt
	});

	return { url, path, expiresAt };
}
