/**
 * Fotos do pedido de exemplo (FU-20) — os bytes que faltavam para rodar o pipeline.
 *
 * `SourcePhoto.data` é `Uint8Array` e nada no repositório produzia uma imagem, então o motor
 * (F2-06) não tinha o que estilizar. Aqui há duas fontes, nesta ordem:
 *
 * 1. **Fotos suas**, se existir a pasta `photos-locais/` ao lado deste arquivo (gitignorada,
 *    ver o `README.md` da pasta). É o modo que vale para julgar se a aquarela ficou boa —
 *    estilo de foto só se avalia em rosto de gente de verdade.
 * 2. **Placeholders sintéticos**, gerados com `jimp` (já é dependência do projeto), quando
 *    a pasta não existe. Rodam sem nenhum setup e sem rede, o que mantém o pipeline
 *    testável em qualquer máquina e no CI.
 *
 * Foto real de pessoa NUNCA entra no repositório: são dados pessoais sensíveis
 * (`docs/PRODUCT.md` §10) e commitá-las contradiria a própria regra de que foto de usuário
 * só vive atrás de URL assinada e expirável.
 *
 * O `id` da `SourcePhoto` vem SEMPRE do pedido (`PEDIDO_EXEMPLO_PHOTO_IDS`), nunca do nome do
 * arquivo: é a chave que junta a foto estilizada (`StylizedPhoto.sourcePhotoId`) com a
 * legenda que a narrativa escreveu (`polaroidCaptions[].photoId`). Arquivo local é mapeado
 * por POSIÇÃO (ordem alfabética) sobre essa lista.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';
import type { SourcePhoto } from '../product-skills/photo-style/provider';
import { PHOTO_STYLE_INPUT_MAX_SIDE_PX } from '../product-skills/photo-style/resolution-config';
import { PEDIDO_EXEMPLO_PHOTO_IDS } from './pedido-exemplo';

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Pasta opcional e gitignorada com as suas fotos de teste. */
export const LOCAL_PHOTOS_DIR = path.join(FIXTURES_DIR, 'photos-locais');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif']);

/** `SourcePhoto` + o que o chamador precisa saber sobre a origem antes de tirar conclusão. */
export interface FixturePhoto extends SourcePhoto {
	/** `true` = placeholder gerado; não serve para julgar qualidade de estilização. */
	synthetic: boolean;
	widthPx: number;
	heightPx: number;
}

/**
 * Formatos dos placeholders, ciclados pelo índice da foto. Cobrem os três ramos de escolha
 * de proporção do `HttpPhotoStyleProvider` (paisagem, retrato, quadrado), e o primeiro passa
 * do teto de entrada de `resolution-config.ts` de propósito, para o caminho de
 * redimensionamento (`resizeToMaxSide`) ser exercitado e não só o caminho feliz.
 */
export const SYNTHETIC_SHAPES: ReadonlyArray<{ widthPx: number; heightPx: number }> = [
	{ widthPx: PHOTO_STYLE_INPUT_MAX_SIDE_PX + 352, heightPx: PHOTO_STYLE_INPUT_MAX_SIDE_PX - 248 },
	{ widthPx: 1200, heightPx: 1600 },
	{ widthPx: 1024, heightPx: 1024 },
	{ widthPx: 1600, heightPx: 1200 }
];

export interface LoadFixturePhotosOptions {
	/**
	 * Reduz proporcionalmente os placeholders para que o maior lado não passe disto.
	 * Existe para teste: codificar 2400 × 1800 em PNG custa segundos que um teste unitário
	 * não deveria gastar. Não afeta foto local.
	 */
	syntheticMaxSidePx?: number;
	/** Pasta de fotos locais. Default: `LOCAL_PHOTOS_DIR`. Injeção para teste. */
	localDir?: string;
}

/** FNV-1a de 32 bits — hash determinístico e estável entre execuções (nada de `Math.random`). */
function hashId(id: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < id.length; i += 1) {
		hash ^= id.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash;
}

function scaleShape(
	shape: { widthPx: number; heightPx: number },
	maxSidePx: number | undefined
): { widthPx: number; heightPx: number } {
	const longestSide = Math.max(shape.widthPx, shape.heightPx);
	if (maxSidePx === undefined || longestSide <= maxSidePx) {
		return shape;
	}
	const scale = maxSidePx / longestSide;
	return {
		widthPx: Math.max(1, Math.round(shape.widthPx * scale)),
		heightPx: Math.max(1, Math.round(shape.heightPx * scale))
	};
}

/**
 * Desenha um placeholder determinístico para `photoId`: gradiente vertical + uma mancha
 * central mais clara, no lugar onde estaria o casal. Cores derivam do hash do id, então cada
 * foto sai diferente das outras e igual a si mesma em toda execução — dá para reconhecer a
 * foto no PDF de preview e para o teste comparar bytes.
 */
export async function renderSyntheticPhoto(
	photoId: string,
	widthPx: number,
	heightPx: number
): Promise<Uint8Array> {
	const hash = hashId(photoId);
	const topR = 40 + (hash & 0x3f);
	const topG = 60 + ((hash >>> 6) & 0x3f);
	const topB = 90 + ((hash >>> 12) & 0x3f);
	const bottomR = 150 + ((hash >>> 18) & 0x3f);
	const bottomG = 140 + ((hash >>> 24) & 0x3f);
	const bottomB = 120 + ((hash >>> 3) & 0x3f);

	const image = new Jimp({ width: widthPx, height: heightPx, color: 0x000000ff });
	const pixels = image.bitmap.data;

	const centerX = widthPx / 2;
	const centerY = heightPx * 0.55;
	const radius = Math.min(widthPx, heightPx) * 0.3;

	for (let y = 0; y < heightPx; y += 1) {
		const verticalRatio = heightPx === 1 ? 0 : y / (heightPx - 1);
		const baseR = topR + (bottomR - topR) * verticalRatio;
		const baseG = topG + (bottomG - topG) * verticalRatio;
		const baseB = topB + (bottomB - topB) * verticalRatio;

		for (let x = 0; x < widthPx; x += 1) {
			const dx = x - centerX;
			const dy = y - centerY;
			// Mancha suave: 1 no centro, 0 na borda do raio. Sem `sqrt` por pixel.
			const blob = Math.max(0, 1 - (dx * dx + dy * dy) / (radius * radius));
			const lift = blob * 70;

			const offset = (y * widthPx + x) * 4;
			pixels[offset] = Math.min(255, Math.round(baseR + lift));
			pixels[offset + 1] = Math.min(255, Math.round(baseG + lift * 0.9));
			pixels[offset + 2] = Math.min(255, Math.round(baseB + lift * 0.7));
			pixels[offset + 3] = 255;
		}
	}

	return new Uint8Array(await image.getBuffer('image/png'));
}

function listLocalImages(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}
	return readdirSync(dir)
		.filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
		.sort();
}

/**
 * Fotos do pedido de exemplo, prontas para `PhotoStyleProvider.stylize()`.
 *
 * Devolve uma foto por id de `PEDIDO_EXEMPLO_PHOTO_IDS`. Se houver menos arquivos locais que
 * ids, os ids restantes recebem placeholder — melhor um livro completo com parte das fotos
 * de verdade do que um erro no meio da geração.
 */
export async function loadFixturePhotos(
	options: LoadFixturePhotosOptions = {}
): Promise<FixturePhoto[]> {
	const dir = options.localDir ?? LOCAL_PHOTOS_DIR;
	const localFiles = listLocalImages(dir);

	return Promise.all(
		PEDIDO_EXEMPLO_PHOTO_IDS.map(async (photoId, index) => {
			const localFile = localFiles[index];
			if (localFile) {
				const data = new Uint8Array(readFileSync(path.join(dir, localFile)));
				const { bitmap } = await Jimp.read(Buffer.from(data));
				return {
					id: photoId,
					data,
					synthetic: false,
					widthPx: bitmap.width,
					heightPx: bitmap.height
				};
			}

			const shape = scaleShape(
				SYNTHETIC_SHAPES[index % SYNTHETIC_SHAPES.length],
				options.syntheticMaxSidePx
			);
			return {
				id: photoId,
				data: await renderSyntheticPhoto(photoId, shape.widthPx, shape.heightPx),
				synthetic: true,
				widthPx: shape.widthPx,
				heightPx: shape.heightPx
			};
		})
	);
}
