import { Buffer } from 'node:buffer';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PhotoStyleProvider } from '../provider';
import { AquarelaFakeProvider } from './fake-provider';

const GOLDEN_SAMPLES_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'golden-samples'
);

interface GoldenSample {
	description: string;
	input: {
		photoId: string;
		photoBase64: string;
		params: { sizeId: string; targetWidthPx: number; targetHeightPx: number };
	};
	expectedOutput: {
		sourcePhotoId: string;
		dataBase64: string;
		metadata: { widthPx: number; heightPx: number; dpi: number; format: string };
	};
}

function loadGoldenSamples(): { file: string; sample: GoldenSample }[] {
	return readdirSync(GOLDEN_SAMPLES_DIR)
		.filter((file) => file.endsWith('.json'))
		.map((file) => ({
			file,
			sample: JSON.parse(readFileSync(path.join(GOLDEN_SAMPLES_DIR, file), 'utf-8')) as GoldenSample
		}));
}

describe('AquarelaFakeProvider — contrato PhotoStyleProvider', () => {
	it('implementa a interface PhotoStyleProvider com styleId/styleVersion do registry', () => {
		const provider: PhotoStyleProvider = new AquarelaFakeProvider();

		expect(provider.styleId).toBe('aquarela');
		expect(provider.styleVersion).toBe('1.0.0');
	});
});

describe('AquarelaFakeProvider — golden samples', () => {
	const samples = loadGoldenSamples();

	it('tem pelo menos 2 golden samples versionados em golden-samples/', () => {
		expect(samples.length).toBeGreaterThanOrEqual(2);
	});

	for (const { file, sample } of samples) {
		it(`gera a saída fake determinística esperada para ${file}`, async () => {
			const provider = new AquarelaFakeProvider();
			const [output] = await provider.stylize(
				[{ id: sample.input.photoId, data: Buffer.from(sample.input.photoBase64, 'base64') }],
				sample.input.params
			);

			expect(output.sourcePhotoId).toBe(sample.expectedOutput.sourcePhotoId);
			expect(Buffer.from(output.data).toString('base64')).toBe(sample.expectedOutput.dataBase64);
			expect(output.metadata).toEqual(sample.expectedOutput.metadata);
		});
	}
});

describe('AquarelaFakeProvider — determinismo', () => {
	it('produz sempre a mesma saída para a mesma entrada (sem aleatoriedade, sem rede)', async () => {
		const provider = new AquarelaFakeProvider();
		const photo = { id: 'foto-repetibilidade', data: new TextEncoder().encode('conteudo-fixo') };
		const params = { sizeId: 'mini-15x15', targetWidthPx: 1772, targetHeightPx: 1772 };

		const [first] = await provider.stylize([photo], params);
		const [second] = await provider.stylize([photo], params);

		expect(Buffer.from(first.data)).toEqual(Buffer.from(second.data));
	});

	it('produz saídas diferentes para fotos de entrada diferentes', async () => {
		const provider = new AquarelaFakeProvider();
		const params = { sizeId: 'mini-15x15', targetWidthPx: 1772, targetHeightPx: 1772 };

		const [a] = await provider.stylize(
			[{ id: 'foto-a', data: new TextEncoder().encode('foto-a') }],
			params
		);
		const [b] = await provider.stylize(
			[{ id: 'foto-b', data: new TextEncoder().encode('foto-b') }],
			params
		);

		expect(Buffer.from(a.data)).not.toEqual(Buffer.from(b.data));
	});

	it('processa múltiplas fotos preservando a rastreabilidade sourcePhotoId', async () => {
		const provider = new AquarelaFakeProvider();
		const params = { sizeId: 'mini-15x15', targetWidthPx: 1772, targetHeightPx: 1772 };

		const outputs = await provider.stylize(
			[
				{ id: 'foto-1', data: new TextEncoder().encode('um') },
				{ id: 'foto-2', data: new TextEncoder().encode('dois') }
			],
			params
		);

		expect(outputs.map((output) => output.sourcePhotoId)).toEqual(['foto-1', 'foto-2']);
	});
});
