import { Jimp } from 'jimp';
import { describe, expect, it } from 'vitest';
import { resizeToMaxSide } from './resize';

async function makePng(width: number, height: number): Promise<Uint8Array> {
	const image = new Jimp({ width, height, color: 0xff0000ff });
	const buffer = await image.getBuffer('image/png');
	return new Uint8Array(buffer);
}

describe('resizeToMaxSide', () => {
	it('redimensiona proporcionalmente quando o maior lado passa do teto (paisagem)', async () => {
		const original = await makePng(4000, 2000);

		const result = await resizeToMaxSide(original, 2048);

		expect(result.width).toBe(2048);
		expect(result.height).toBe(1024);
	});

	it('redimensiona proporcionalmente quando o maior lado passa do teto (retrato)', async () => {
		const original = await makePng(1000, 3000);

		const result = await resizeToMaxSide(original, 2048);

		expect(result.width).toBe(683);
		expect(result.height).toBe(2048);
	});

	it('não reprocessa quando já está dentro do teto', async () => {
		const original = await makePng(800, 600);

		const result = await resizeToMaxSide(original, 2048);

		expect(result.data).toBe(original);
		expect(result.width).toBe(800);
		expect(result.height).toBe(600);
	});

	it('preserva a proporção original (sem crop)', async () => {
		const original = await makePng(3000, 1500);

		const result = await resizeToMaxSide(original, 2048);

		expect(result.width / result.height).toBeCloseTo(3000 / 1500, 1);
	});
});
