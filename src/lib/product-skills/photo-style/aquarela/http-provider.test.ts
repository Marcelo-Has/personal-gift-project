import { Buffer } from 'node:buffer';
import { Jimp } from 'jimp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OpenAiImageEditParams, OpenAiImageEditResult } from '$lib/server/openai-image';
import type { PhotoStyleProvider } from '../provider';

/** `$env/dynamic/private` só é lido quando o cliente real é criado (mesma técnica de
 * `openai-image.test.ts`) — aqui usamos isso para simular "sem chave configurada" sem
 * precisar mexer em `process.env` de verdade. */
const mockEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

const { HttpPhotoStyleProvider } = await import('./http-provider');

async function makePng(width: number, height: number): Promise<Uint8Array> {
	const image = new Jimp({ width, height, color: 0x336699ff });
	return new Uint8Array(await image.getBuffer('image/png'));
}

const FAKE_OUTPUT_B64 = Buffer.from('saida-fake-da-api').toString('base64');

function stubClient(
	editImpl: (params: OpenAiImageEditParams) => Promise<OpenAiImageEditResult>
): { images: { edit: ReturnType<typeof vi.fn> } } {
	return { images: { edit: vi.fn(editImpl) } };
}

describe('HttpPhotoStyleProvider — fallback sem chave', () => {
	afterEach(() => {
		delete mockEnv.OPENAI_API_KEY;
	});

	it('cai para o fallback e não faz nenhuma chamada paga quando OPENAI_API_KEY está ausente', async () => {
		delete mockEnv.OPENAI_API_KEY;
		const fallbackStylize = vi.fn(async () => [
			{
				sourcePhotoId: 'foto-1',
				data: new Uint8Array([9, 9, 9]),
				metadata: { widthPx: 100, heightPx: 100, dpi: 300, format: 'png' as const }
			}
		]);
		const fallback: PhotoStyleProvider = {
			styleId: 'aquarela',
			styleVersion: '1.0.0',
			stylize: fallbackStylize
		};
		const provider = new HttpPhotoStyleProvider({ fallback });
		const photo = { id: 'foto-1', data: await makePng(500, 500) };
		const params = { sizeId: 'mini-15x15', targetWidthPx: 1772, targetHeightPx: 1772 };

		const result = await provider.stylize([photo], params);

		expect(fallbackStylize).toHaveBeenCalledWith([photo], params);
		expect(result[0].sourcePhotoId).toBe('foto-1');
	});
});

describe('HttpPhotoStyleProvider — com chave configurada', () => {
	afterEach(() => {
		delete mockEnv.OPENAI_API_KEY;
	});

	it('redimensiona a entrada proporcionalmente quando passa do teto, sem crop', async () => {
		const client = stubClient(async () => ({
			data: [{ b64_json: FAKE_OUTPUT_B64 }],
			usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 }
		}));
		const provider = new HttpPhotoStyleProvider({ client: client as never });
		const photo = { id: 'foto-grande', data: await makePng(4000, 2000) };
		const params = { sizeId: 'medio-20x20', targetWidthPx: 2400, targetHeightPx: 2400 };

		await provider.stylize([photo], params);

		expect(client.images.edit).toHaveBeenCalledTimes(1);
		const sentParams = client.images.edit.mock.calls[0][0] as OpenAiImageEditParams;
		const sentImage = await sentParams.image.arrayBuffer();
		const decoded = await Jimp.read(Buffer.from(sentImage));

		expect(Math.max(decoded.bitmap.width, decoded.bitmap.height)).toBe(2048);
		expect(decoded.bitmap.width / decoded.bitmap.height).toBeCloseTo(4000 / 2000, 1);
	});

	it('não redimensiona quando a entrada já está dentro do teto', async () => {
		const client = stubClient(async () => ({
			data: [{ b64_json: FAKE_OUTPUT_B64 }],
			usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 }
		}));
		const provider = new HttpPhotoStyleProvider({ client: client as never });
		const original = await makePng(800, 600);
		const photo = { id: 'foto-pequena', data: original };
		const params = { sizeId: 'mini-15x15', targetWidthPx: 1772, targetHeightPx: 1772 };

		await provider.stylize([photo], params);

		const sentParams = client.images.edit.mock.calls[0][0] as OpenAiImageEditParams;
		const sentImage = new Uint8Array(await sentParams.image.arrayBuffer());
		expect(Buffer.from(sentImage)).toEqual(Buffer.from(original));
	});

	it.each([
		['quadrado', 1772, 1772, '1024x1024'],
		['paisagem', 2400, 1600, '1536x1024'],
		['retrato', 1600, 2400, '1024x1536']
	])('pede o tamanho de saída %s suportado pelo provedor', async (_label, w, h, expectedSize) => {
		const client = stubClient(async () => ({
			data: [{ b64_json: FAKE_OUTPUT_B64 }]
		}));
		const provider = new HttpPhotoStyleProvider({ client: client as never });
		const photo = { id: 'foto-1', data: await makePng(1000, 1000) };
		const params = { sizeId: 'sku', targetWidthPx: w, targetHeightPx: h };

		const [output] = await provider.stylize([photo], params);

		const sentParams = client.images.edit.mock.calls[0][0] as OpenAiImageEditParams;
		expect(sentParams.size).toBe(expectedSize);
		expect(output.metadata.dpi).toBeLessThan(300);
		expect(output.metadata.dpi).toBeGreaterThan(0);
	});

	it('registra o custo real da chamada quando a API devolve `usage`', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		const client = stubClient(async () => ({
			data: [{ b64_json: FAKE_OUTPUT_B64 }],
			usage: { input_tokens: 1000, output_tokens: 2000, total_tokens: 3000 }
		}));
		const provider = new HttpPhotoStyleProvider({ client: client as never });
		const photo = { id: 'foto-1', data: await makePng(500, 500) };
		const params = { sizeId: 'mini-15x15', targetWidthPx: 1772, targetHeightPx: 1772 };

		await provider.stylize([photo], params);

		expect(consoleSpy).toHaveBeenCalledTimes(1);
		const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string);
		expect(logged).toMatchObject({
			event: 'photo_style_provider_call_cost',
			styleId: 'aquarela',
			sourcePhotoId: 'foto-1',
			inputTokens: 1000,
			outputTokens: 2000
		});
		expect(logged.estimatedCostUsd).toBeGreaterThan(0);
		consoleSpy.mockRestore();
	});

	it('trata o erro do provedor com uma mensagem clara, sem deixar a promise rejeitar sem contexto', async () => {
		const client = stubClient(async () => {
			throw new Error('API de imagens da OpenAI respondeu 500: erro interno');
		});
		const provider = new HttpPhotoStyleProvider({ client: client as never });
		const photo = { id: 'foto-1', data: await makePng(500, 500) };
		const params = { sizeId: 'mini-15x15', targetWidthPx: 1772, targetHeightPx: 1772 };

		await expect(provider.stylize([photo], params)).rejects.toThrow(/foto-1.*500/s);
	});
});
