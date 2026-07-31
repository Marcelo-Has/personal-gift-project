import { describe, expect, it } from 'vitest';
import type { SignableBucket } from '$lib/server/signed-url';
import { handleUrlDeUpload } from './+server';

/**
 * Bucket falso no mesmo padrão de `signed-url.test.ts`: dependência externa (Storage)
 * é o que se mocka, não módulo interno (`.claude/rules/testing.md`).
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

function fakeRequest(body: unknown): Request {
	return new Request('http://localhost/api/fotos/url-de-upload', {
		method: 'POST',
		body: JSON.stringify(body)
	});
}

const CORPO_VALIDO = { contentType: 'image/jpeg', orderId: 'pedido-9' };

// Cada teste usa um uid próprio: `rate-limit.ts` mantém estado em módulo, então uids
// repetidos vazariam contagem de um teste para o outro.
describe('POST /api/fotos/url-de-upload', () => {
	it('deve responder 401 quando não há sessão', async () => {
		const { bucket } = fakeBucket();

		await expect(
			handleUrlDeUpload({ request: fakeRequest(CORPO_VALIDO), locals: { uid: null } }, bucket)
		).rejects.toMatchObject({ status: 401 });
	});

	it('deve devolver url, path e expiresAt quando a sessão é válida', async () => {
		const { bucket } = fakeBucket();

		const resposta = await handleUrlDeUpload(
			{ request: fakeRequest(CORPO_VALIDO), locals: { uid: 'uid-401-1' } },
			bucket
		);

		expect(resposta.status).toBe(200);
		const corpo = await resposta.json();
		expect(corpo.path).toMatch(/^users\/uid-401-1\/orders\/pedido-9\/photos\/[A-Za-z0-9_-]+$/);
		expect(corpo.url).toContain('https://storage.googleapis.com/');
		expect(corpo.expiresAt).toEqual(expect.any(Number));
	});

	it('deve responder 400 em contentType fora da allow-list, sem assinar nenhuma URL', async () => {
		const { bucket, calls } = fakeBucket();

		await expect(
			handleUrlDeUpload(
				{
					request: fakeRequest({ contentType: 'text/html', orderId: 'pedido-9' }),
					locals: { uid: 'uid-400-1' }
				},
				bucket
			)
		).rejects.toMatchObject({ status: 400 });
		expect(calls).toHaveLength(0);
	});

	it('deve responder 400 quando o corpo não tem orderId, sem assinar nenhuma URL', async () => {
		const { bucket, calls } = fakeBucket();

		await expect(
			handleUrlDeUpload(
				{ request: fakeRequest({ contentType: 'image/jpeg' }), locals: { uid: 'uid-400-2' } },
				bucket
			)
		).rejects.toMatchObject({ status: 400 });
		expect(calls).toHaveLength(0);
	});

	it('deve responder 429 quando o uid estoura o rate limit', async () => {
		const { bucket } = fakeBucket();
		const uid = 'uid-429-1';

		for (let i = 0; i < 10; i++) {
			await handleUrlDeUpload({ request: fakeRequest(CORPO_VALIDO), locals: { uid } }, bucket);
		}

		await expect(
			handleUrlDeUpload({ request: fakeRequest(CORPO_VALIDO), locals: { uid } }, bucket)
		).rejects.toMatchObject({ status: 429 });
	});

	it('deve gerar o path sempre sob o uid da sessão, ignorando userId enviado no corpo', async () => {
		const { bucket, calls } = fakeBucket();

		const resposta = await handleUrlDeUpload(
			{
				request: fakeRequest({ ...CORPO_VALIDO, userId: 'uid-de-outro-usuario' }),
				locals: { uid: 'uid-dono-real' }
			},
			bucket
		);

		const corpo = await resposta.json();
		expect(corpo.path.startsWith('users/uid-dono-real/')).toBe(true);
		expect(calls[0].path.startsWith('users/uid-dono-real/')).toBe(true);
	});

	it('deve responder 400 quando o corpo tenta um path pronto com travessia de diretório', async () => {
		const { bucket, calls } = fakeBucket();

		await expect(
			handleUrlDeUpload(
				{
					request: fakeRequest({
						contentType: 'image/jpeg',
						orderId: '../../outro-usuario',
						path: 'users/outro/orders/x/photos/y'
					}),
					locals: { uid: 'uid-400-3' }
				},
				bucket
			)
		).rejects.toMatchObject({ status: 400 });
		expect(calls).toHaveLength(0);
	});

	it('deve gerar o photoId no servidor, ignorando qualquer photoId enviado no corpo', async () => {
		const { bucket, calls } = fakeBucket();

		const resposta = await handleUrlDeUpload(
			{
				request: fakeRequest({ ...CORPO_VALIDO, photoId: 'foto-forjada' }),
				locals: { uid: 'uid-photoid-1' }
			},
			bucket
		);

		const corpo = await resposta.json();
		expect(corpo.path).not.toContain('foto-forjada');
		expect(calls[0].path).not.toContain('foto-forjada');
	});
});
