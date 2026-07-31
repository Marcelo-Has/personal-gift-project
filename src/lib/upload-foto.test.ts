import { describe, expect, it, vi } from 'vitest';
import {
	ALLOWED_PHOTO_CONTENT_TYPES as ALLOWED_PHOTO_CONTENT_TYPES_SERVIDOR,
	MAX_PHOTO_BYTES as MAX_PHOTO_BYTES_SERVIDOR
} from './server/signed-url';
import {
	ALLOWED_PHOTO_CONTENT_TYPES,
	MAX_PHOTO_BYTES,
	enviarArquivoParaUrlAssinada,
	extrairPhotoId,
	solicitarUrlDeDownload,
	solicitarUrlDeUpload,
	validarArquivoFoto
} from './upload-foto';

describe('constantes repetidas de $lib/server/signed-url', () => {
	it('MAX_PHOTO_BYTES não pode divergir do valor do servidor', () => {
		expect(MAX_PHOTO_BYTES).toBe(MAX_PHOTO_BYTES_SERVIDOR);
	});

	it('ALLOWED_PHOTO_CONTENT_TYPES não pode divergir do valor do servidor', () => {
		expect(ALLOWED_PHOTO_CONTENT_TYPES).toEqual(ALLOWED_PHOTO_CONTENT_TYPES_SERVIDOR);
	});
});

function criarArquivo(tamanhoBytes: number, type = 'image/jpeg'): File {
	return new File([new Uint8Array(tamanhoBytes)], 'foto.jpg', { type });
}

describe('validarArquivoFoto', () => {
	it('deve aceitar um arquivo dentro do teto e de tipo permitido', () => {
		expect(validarArquivoFoto(criarArquivo(1024))).toBeNull();
	});

	it('deve recusar um tipo de arquivo fora da allow-list', () => {
		expect(validarArquivoFoto(criarArquivo(1024, 'text/html'))).toMatch(/não permitido/);
	});

	it('deve recusar um arquivo acima do teto de tamanho', () => {
		expect(validarArquivoFoto(criarArquivo(MAX_PHOTO_BYTES + 1))).toMatch(/muito grande/);
	});
});

describe('solicitarUrlDeUpload', () => {
	it('deve enviar Authorization Bearer e o corpo com contentType e orderId', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(
					JSON.stringify({ url: 'https://storage.googleapis.com/x', path: 'x', expiresAt: 1 }),
					{ status: 200 }
				)
		);

		await solicitarUrlDeUpload(
			{ contentType: 'image/jpeg', orderId: 'pedido-9', idToken: 'token-abc' },
			fetchFn
		);

		expect(fetchFn).toHaveBeenCalledWith(
			'/api/fotos/url-de-upload',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
					Authorization: 'Bearer token-abc'
				}),
				body: JSON.stringify({ contentType: 'image/jpeg', orderId: 'pedido-9' })
			})
		);
	});

	it('deve traduzir 401 em mensagem de sessão expirada', async () => {
		const fetchFn = vi.fn(async () => new Response(null, { status: 401 }));

		await expect(
			solicitarUrlDeUpload({ contentType: 'image/jpeg', orderId: 'p', idToken: 't' }, fetchFn)
		).rejects.toThrow(/[Ss]essão expirada/);
	});

	it('deve traduzir 429 em mensagem de limite de envios', async () => {
		const fetchFn = vi.fn(async () => new Response(null, { status: 429 }));

		await expect(
			solicitarUrlDeUpload({ contentType: 'image/jpeg', orderId: 'p', idToken: 't' }, fetchFn)
		).rejects.toThrow(/[Mm]uitas fotos/);
	});

	it('deve usar a mensagem do servidor quando o erro traz uma', async () => {
		const fetchFn = vi.fn(
			async () => new Response(JSON.stringify({ message: 'Pedido inválido.' }), { status: 400 })
		);

		await expect(
			solicitarUrlDeUpload({ contentType: 'image/jpeg', orderId: 'p', idToken: 't' }, fetchFn)
		).rejects.toThrow('Pedido inválido.');
	});
});

describe('solicitarUrlDeDownload', () => {
	it('deve mandar orderId e photoId como query string com Authorization Bearer', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(
					JSON.stringify({ url: 'https://storage.googleapis.com/x', path: 'x', expiresAt: 1 }),
					{ status: 200 }
				)
		);

		await solicitarUrlDeDownload(
			{ orderId: 'pedido-9', photoId: 'foto-3', idToken: 'token-abc' },
			fetchFn
		);

		expect(fetchFn).toHaveBeenCalledWith(
			'/api/fotos/url-de-upload?orderId=pedido-9&photoId=foto-3',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer token-abc' })
			})
		);
	});
});

describe('enviarArquivoParaUrlAssinada', () => {
	it('deve enviar PUT com Content-Type e x-goog-content-length-range', async () => {
		const fetchFn = vi.fn(async () => new Response(null, { status: 200 }));
		const arquivo = criarArquivo(1024);

		await enviarArquivoParaUrlAssinada(
			'https://storage.googleapis.com/x?assinado=1',
			arquivo,
			'image/jpeg',
			fetchFn
		);

		expect(fetchFn).toHaveBeenCalledWith(
			'https://storage.googleapis.com/x?assinado=1',
			expect.objectContaining({
				method: 'PUT',
				headers: {
					'Content-Type': 'image/jpeg',
					'x-goog-content-length-range': `0,${MAX_PHOTO_BYTES}`
				},
				body: arquivo
			})
		);
	});

	it('deve virar mensagem tratada quando o Storage recusa o PUT', async () => {
		const fetchFn = vi.fn(async () => new Response(null, { status: 403 }));

		await expect(
			enviarArquivoParaUrlAssinada('https://storage.googleapis.com/x', criarArquivo(1024), 'image/jpeg', fetchFn)
		).rejects.toThrow(/[Ff]alha ao enviar/);
	});
});

describe('extrairPhotoId', () => {
	it('deve devolver o último segmento do path', () => {
		expect(extrairPhotoId('users/uid-1/orders/pedido-9/photos/foto-3')).toBe('foto-3');
	});
});
