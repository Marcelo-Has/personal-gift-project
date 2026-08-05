import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Jimp } from 'jimp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PHOTO_STYLE_INPUT_MAX_SIDE_PX } from '../product-skills/photo-style/resolution-config';
import { resizeToMaxSide } from '../product-skills/photo-style/resize';
import { PEDIDO_EXEMPLO_PHOTO_IDS } from './pedido-exemplo';
import { SYNTHETIC_SHAPES, loadFixturePhotos, renderSyntheticPhoto } from './photos';

/** Pequeno o bastante para o teste não gastar segundos codificando PNG. */
const TAMANHO_DE_TESTE = 64;

/** Pasta que não existe — força o caminho sintético mesmo se alguém tiver fotos locais. */
const SEM_FOTOS_LOCAIS = path.join(tmpdir(), 'fixtures-sem-fotos-locais-inexistente');

let dirLocal: string;

beforeEach(() => {
	dirLocal = mkdtempSync(path.join(tmpdir(), 'fixture-photos-'));
});

afterEach(() => {
	rmSync(dirLocal, { recursive: true, force: true });
});

async function escreverImagem(dir: string, nome: string, width: number, height: number) {
	const image = new Jimp({ width, height, color: 0x00ff00ff });
	writeFileSync(path.join(dir, nome), await image.getBuffer('image/png'));
}

describe('loadFixturePhotos — sem fotos locais', () => {
	it('deve devolver uma foto por id do pedido, sem setup e sem rede', async () => {
		const photos = await loadFixturePhotos({
			localDir: SEM_FOTOS_LOCAIS,
			syntheticMaxSidePx: TAMANHO_DE_TESTE
		});

		expect(photos.map((photo) => photo.id)).toEqual([...PEDIDO_EXEMPLO_PHOTO_IDS]);
		expect(photos.every((photo) => photo.synthetic)).toBe(true);
		expect(photos.every((photo) => photo.data.byteLength > 0)).toBe(true);
	});

	it('deve produzir imagens que o pipeline de photo-style consegue ler', async () => {
		const [photo] = await loadFixturePhotos({
			localDir: SEM_FOTOS_LOCAIS,
			syntheticMaxSidePx: TAMANHO_DE_TESTE
		});

		const resized = await resizeToMaxSide(photo.data, 32);

		expect(Math.max(resized.width, resized.height)).toBe(32);
	});

	it('deve reduzir proporcionalmente quando `syntheticMaxSidePx` é dado', async () => {
		const photos = await loadFixturePhotos({
			localDir: SEM_FOTOS_LOCAIS,
			syntheticMaxSidePx: TAMANHO_DE_TESTE
		});

		for (const photo of photos) {
			expect(Math.max(photo.widthPx, photo.heightPx)).toBeLessThanOrEqual(TAMANHO_DE_TESTE);
		}
		const [primeira] = photos;
		const proporcaoOriginal = SYNTHETIC_SHAPES[0].widthPx / SYNTHETIC_SHAPES[0].heightPx;
		expect(primeira.widthPx / primeira.heightPx).toBeCloseTo(proporcaoOriginal, 1);
	});
});

describe('loadFixturePhotos — com fotos locais', () => {
	it('deve usar os arquivos locais em ordem alfabética, mantendo os ids do pedido', async () => {
		await escreverImagem(dirLocal, '02-feira.png', 40, 30);
		await escreverImagem(dirLocal, '01-varanda.png', 30, 40);

		const photos = await loadFixturePhotos({
			localDir: dirLocal,
			syntheticMaxSidePx: TAMANHO_DE_TESTE
		});

		expect(photos[0].id).toBe(PEDIDO_EXEMPLO_PHOTO_IDS[0]);
		expect(photos[0].synthetic).toBe(false);
		// `01-varanda.png` vem primeiro na ordem alfabética, então é o retrato 30 × 40.
		expect([photos[0].widthPx, photos[0].heightPx]).toEqual([30, 40]);
		expect([photos[1].widthPx, photos[1].heightPx]).toEqual([40, 30]);
	});

	it('deve completar com placeholder os ids que não têm arquivo local', async () => {
		await escreverImagem(dirLocal, '01-varanda.png', 30, 40);

		const photos = await loadFixturePhotos({
			localDir: dirLocal,
			syntheticMaxSidePx: TAMANHO_DE_TESTE
		});

		expect(photos).toHaveLength(PEDIDO_EXEMPLO_PHOTO_IDS.length);
		expect(photos[0].synthetic).toBe(false);
		expect(photos.slice(1).every((photo) => photo.synthetic)).toBe(true);
	});

	it('deve ignorar arquivos que não são imagem', async () => {
		writeFileSync(path.join(dirLocal, 'README.txt'), 'coloque suas fotos aqui');

		const photos = await loadFixturePhotos({
			localDir: dirLocal,
			syntheticMaxSidePx: TAMANHO_DE_TESTE
		});

		expect(photos.every((photo) => photo.synthetic)).toBe(true);
	});
});

describe('renderSyntheticPhoto', () => {
	it('deve ser determinístico: mesmo id e tamanho produzem os mesmos bytes', async () => {
		const primeira = await renderSyntheticPhoto('foto-01-varanda', 32, 24);
		const segunda = await renderSyntheticPhoto('foto-01-varanda', 32, 24);

		expect(Buffer.from(segunda)).toEqual(Buffer.from(primeira));
	});

	it('deve gerar imagens distinguíveis entre ids diferentes', async () => {
		const varanda = await renderSyntheticPhoto('foto-01-varanda', 32, 24);
		const feira = await renderSyntheticPhoto('foto-02-feira', 32, 24);

		expect(Buffer.from(feira)).not.toEqual(Buffer.from(varanda));
	});

	it('deve gerar um PNG com as dimensões pedidas', async () => {
		const data = await renderSyntheticPhoto('foto-03-cozinha', 40, 20);

		const { bitmap } = await Jimp.read(Buffer.from(data));

		expect([bitmap.width, bitmap.height]).toEqual([40, 20]);
	});
});

describe('SYNTHETIC_SHAPES', () => {
	it('deve começar acima do teto de entrada, para exercitar o redimensionamento', () => {
		const maiorLado = Math.max(SYNTHETIC_SHAPES[0].widthPx, SYNTHETIC_SHAPES[0].heightPx);

		expect(maiorLado).toBeGreaterThan(PHOTO_STYLE_INPUT_MAX_SIDE_PX);
	});

	it('deve cobrir paisagem, retrato e quadrado — os três ramos de proporção do provider', () => {
		const proporcoes = SYNTHETIC_SHAPES.map(({ widthPx, heightPx }) => widthPx / heightPx);

		expect(proporcoes.some((r) => r > 1.1)).toBe(true);
		expect(proporcoes.some((r) => r < 0.9)).toBe(true);
		expect(proporcoes.some((r) => r >= 0.9 && r <= 1.1)).toBe(true);
	});
});
