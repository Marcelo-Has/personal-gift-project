import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ALLOWED_PHOTO_CONTENT_TYPES,
	DEFAULT_DOWNLOAD_TTL_SECONDS,
	DEFAULT_UPLOAD_TTL_SECONDS,
	MAX_PHOTO_BYTES,
	MAX_TTL_SECONDS,
	createPhotoDownloadUrl,
	createPhotoUploadUrl,
	photoObjectPath,
	type SignableBucket
} from './signed-url';

/**
 * Bucket falso: o Storage é dependência externa, então é ele que se mocka
 * (`.claude/rules/testing.md`). Nenhum módulo interno é substituído — as funções
 * recebem o bucket por parâmetro.
 */
function fakeBucket() {
	const calls: { path: string; options: Record<string, unknown> }[] = [];
	const bucket: SignableBucket = {
		file(path) {
			return {
				async getSignedUrl(options) {
					calls.push({ path, options });
					return [`https://storage.googleapis.com/${path}?assinado=1`];
				}
			};
		}
	};
	return { bucket, calls };
}

const AGORA = new Date('2026-07-29T12:00:00Z');

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(AGORA);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('photoObjectPath', () => {
	it('deve montar o caminho dentro da pasta do dono quando os ids são válidos', () => {
		expect(photoObjectPath('uid-1', 'pedido-9', 'foto-3')).toBe(
			'users/uid-1/orders/pedido-9/photos/foto-3'
		);
	});

	it.each([
		['..', 'travessia de diretório'],
		['../../etc/passwd', 'travessia com barras'],
		['uid/../outro', 'travessia no meio'],
		['uid%2f..', 'barra codificada'],
		['', 'vazio'],
		['uid com espaco', 'espaço']
	])('deve recusar o id %j quando é %s', (idPerigoso) => {
		expect(() => photoObjectPath(idPerigoso, 'pedido-9', 'foto-3')).toThrow(/userId inválido/);
		expect(() => photoObjectPath('uid-1', idPerigoso, 'foto-3')).toThrow(/orderId inválido/);
		expect(() => photoObjectPath('uid-1', 'pedido-9', idPerigoso)).toThrow(/photoId inválido/);
	});

	it('deve recusar um id longo demais quando passa de 128 caracteres', () => {
		expect(() => photoObjectPath('a'.repeat(129), 'pedido-9', 'foto-3')).toThrow(/userId inválido/);
	});
});

describe('createPhotoUploadUrl', () => {
	const entrada = {
		userId: 'uid-1',
		orderId: 'pedido-9',
		photoId: 'foto-3',
		contentType: 'image/jpeg' as const
	};

	it('deve assinar uma URL de escrita no caminho do dono quando a entrada é válida', async () => {
		const { bucket, calls } = fakeBucket();

		const resultado = await createPhotoUploadUrl(entrada, bucket);

		expect(resultado.path).toBe('users/uid-1/orders/pedido-9/photos/foto-3');
		expect(resultado.url).toContain('assinado=1');
		expect(calls).toHaveLength(1);
		expect(calls[0].path).toBe(resultado.path);
		expect(calls[0].options).toMatchObject({ version: 'v4', action: 'write' });
	});

	it('deve prender a URL ao contentType quando o tipo é informado', async () => {
		const { bucket, calls } = fakeBucket();

		await createPhotoUploadUrl({ ...entrada, contentType: 'image/webp' }, bucket);

		expect(calls[0].options.contentType).toBe('image/webp');
	});

	it('deve assinar o teto de tamanho para o GCS recusar upload acima do limite', async () => {
		const { bucket, calls } = fakeBucket();

		await createPhotoUploadUrl(entrada, bucket);

		expect(calls[0].options.extensionHeaders).toEqual({
			'x-goog-content-length-range': `0,${MAX_PHOTO_BYTES}`
		});
	});

	it('deve expirar em 5 minutos quando nenhuma validade é informada', async () => {
		const { bucket, calls } = fakeBucket();

		const resultado = await createPhotoUploadUrl(entrada, bucket);

		expect(resultado.expiresAt).toBe(AGORA.getTime() + DEFAULT_UPLOAD_TTL_SECONDS * 1000);
		expect(calls[0].options.expires).toBe(resultado.expiresAt);
	});

	it('deve limitar a validade ao teto de 15 minutos quando pedem mais que isso', async () => {
		const { bucket } = fakeBucket();

		const resultado = await createPhotoUploadUrl({ ...entrada, ttlSeconds: 24 * 60 * 60 }, bucket);

		expect(resultado.expiresAt).toBe(AGORA.getTime() + MAX_TTL_SECONDS * 1000);
	});

	it('deve recusar uma validade zerada ou negativa quando o chamador erra o valor', async () => {
		const { bucket } = fakeBucket();

		await expect(createPhotoUploadUrl({ ...entrada, ttlSeconds: 0 }, bucket)).rejects.toThrow(
			/maior que zero/
		);
		await expect(createPhotoUploadUrl({ ...entrada, ttlSeconds: -60 }, bucket)).rejects.toThrow(
			/maior que zero/
		);
	});

	it('deve recusar um tipo de arquivo fora da allow-list quando tentam subir outra coisa', async () => {
		const { bucket, calls } = fakeBucket();

		await expect(
			createPhotoUploadUrl(
				{
					...entrada,
					contentType: 'text/html' as unknown as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number]
				},
				bucket
			)
		).rejects.toThrow(/não permitido/);
		expect(calls).toHaveLength(0);
	});

	it('deve recusar um id com travessia de caminho antes de assinar qualquer coisa', async () => {
		const { bucket, calls } = fakeBucket();

		await expect(
			createPhotoUploadUrl({ ...entrada, photoId: '../../outro-usuario/foto' }, bucket)
		).rejects.toThrow(/photoId inválido/);
		expect(calls).toHaveLength(0);
	});
});

describe('createPhotoDownloadUrl', () => {
	const entrada = { userId: 'uid-1', orderId: 'pedido-9', photoId: 'foto-3' };

	it('deve assinar uma URL de leitura, sem contentType, quando a entrada é válida', async () => {
		const { bucket, calls } = fakeBucket();

		const resultado = await createPhotoDownloadUrl(entrada, bucket);

		expect(resultado.path).toBe('users/uid-1/orders/pedido-9/photos/foto-3');
		expect(calls[0].options).toMatchObject({ version: 'v4', action: 'read' });
		expect(calls[0].options.contentType).toBeUndefined();
	});

	it('deve expirar em 10 minutos quando nenhuma validade é informada', async () => {
		const { bucket } = fakeBucket();

		const resultado = await createPhotoDownloadUrl(entrada, bucket);

		expect(resultado.expiresAt).toBe(AGORA.getTime() + DEFAULT_DOWNLOAD_TTL_SECONDS * 1000);
	});

	it('deve limitar a validade ao teto de 15 minutos quando pedem mais que isso', async () => {
		const { bucket } = fakeBucket();

		const resultado = await createPhotoDownloadUrl({ ...entrada, ttlSeconds: 3600 }, bucket);

		expect(resultado.expiresAt).toBe(AGORA.getTime() + MAX_TTL_SECONDS * 1000);
	});

	it('deve recusar um id de outro usuário disfarçado de travessia', async () => {
		const { bucket, calls } = fakeBucket();

		await expect(
			createPhotoDownloadUrl({ ...entrada, userId: '../uid-2' }, bucket)
		).rejects.toThrow(/userId inválido/);
		expect(calls).toHaveLength(0);
	});
});
