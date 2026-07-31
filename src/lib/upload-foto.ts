/**
 * Upload de fotos por URL assinada, do navegador direto ao Google Cloud Storage
 * (F1-05b, issue #32). Isolado do componente Svelte para ser testável sem montar UI
 * (`.claude/rules/testing.md`).
 *
 * `MAX_PHOTO_BYTES`/`ALLOWED_PHOTO_CONTENT_TYPES` repetem os valores de
 * `$lib/server/signed-url.ts`: o SvelteKit recusa o build se código de cliente importar
 * de `$lib/server`, então este módulo (que roda no navegador) não pode importar de lá.
 * `upload-foto.test.ts` assegura que os dois pares de valores não divergem.
 */

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type PhotoContentType = (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number];

/** Valida o arquivo antes de gastar uma requisição; `null` quando está tudo certo. */
export function validarArquivoFoto(file: File): string | null {
	if (!(ALLOWED_PHOTO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
		return `Tipo de arquivo não permitido. Aceitos: ${ALLOWED_PHOTO_CONTENT_TYPES.join(', ')}.`;
	}
	if (file.size > MAX_PHOTO_BYTES) {
		return `Arquivo muito grande. O máximo é ${Math.floor(MAX_PHOTO_BYTES / (1024 * 1024))} MB.`;
	}
	return null;
}

export interface UrlAssinada {
	url: string;
	path: string;
	expiresAt: number;
}

async function mensagemDeErro(resposta: Response): Promise<string> {
	if (resposta.status === 401) return 'Sessão expirada. Recarregue a página e tente de novo.';
	if (resposta.status === 429) {
		return 'Muitas fotos em pouco tempo. Aguarde um instante e tente de novo.';
	}
	const corpo: unknown = await resposta.json().catch(() => null);
	const mensagem = (corpo as { message?: string } | null)?.message;
	return mensagem ?? 'Não foi possível preparar o envio da foto.';
}

export interface SolicitarUrlDeUploadInput {
	contentType: PhotoContentType;
	orderId: string;
	idToken: string;
}

/** Pede ao servidor uma URL assinada de upload (`POST /api/fotos/url-de-upload`). */
export async function solicitarUrlDeUpload(
	{ contentType, orderId, idToken }: SolicitarUrlDeUploadInput,
	fetchFn: typeof fetch = fetch
): Promise<UrlAssinada> {
	const resposta = await fetchFn('/api/fotos/url-de-upload', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${idToken}`
		},
		body: JSON.stringify({ contentType, orderId })
	});

	if (!resposta.ok) {
		throw new Error(await mensagemDeErro(resposta));
	}

	return resposta.json();
}

export interface SolicitarUrlDeDownloadInput {
	orderId: string;
	photoId: string;
	idToken: string;
}

/** Pede ao servidor uma URL assinada de leitura (`GET /api/fotos/url-de-upload`). */
export async function solicitarUrlDeDownload(
	{ orderId, photoId, idToken }: SolicitarUrlDeDownloadInput,
	fetchFn: typeof fetch = fetch
): Promise<UrlAssinada> {
	const parametros = new URLSearchParams({ orderId, photoId });
	const resposta = await fetchFn(`/api/fotos/url-de-upload?${parametros.toString()}`, {
		headers: { Authorization: `Bearer ${idToken}` }
	});

	if (!resposta.ok) {
		throw new Error(await mensagemDeErro(resposta));
	}

	return resposta.json();
}

/**
 * Envia o arquivo por `PUT` à URL assinada. Repete, fora da assinatura V4, os mesmos
 * headers que entraram nela (`Content-Type`, `x-goog-content-length-range`) — se
 * divergirem, o Google Cloud Storage responde 403 `SignatureDoesNotMatch`, e o sintoma
 * parece "URL errada" quando na verdade é "header faltando".
 */
export async function enviarArquivoParaUrlAssinada(
	url: string,
	file: File,
	contentType: PhotoContentType,
	fetchFn: typeof fetch = fetch
): Promise<void> {
	const resposta = await fetchFn(url, {
		method: 'PUT',
		headers: {
			'Content-Type': contentType,
			'x-goog-content-length-range': `0,${MAX_PHOTO_BYTES}`
		},
		body: file
	});

	if (!resposta.ok) {
		throw new Error('Falha ao enviar a foto. Verifique sua conexão e tente de novo.');
	}
}

/** Extrai o `photoId` (último segmento) de um `path` no formato de `photoObjectPath`. */
export function extrairPhotoId(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}
