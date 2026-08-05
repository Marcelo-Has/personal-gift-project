/**
 * Redimensionamento proporcional (sem crop) do maior lado de uma foto, usado no teto de
 * ENTRADA do F2-04 ([D-056]). Puro JS (`jimp`) — sem binário nativo — para evitar
 * divergência de binding entre a máquina que builda e a função serverless que roda
 * (Netlify), diferente de libs como `sharp`.
 */
import { Jimp } from 'jimp';

export interface ResizedImage {
	data: Uint8Array;
	width: number;
	height: number;
}

/**
 * Se o maior lado de `data` passar de `maxSidePx`, redimensiona proporcionalmente (sem
 * crop) até que o maior lado seja `maxSidePx`. Se já estiver dentro do teto, devolve a
 * imagem original sem reprocessar (evita perda de qualidade por recompressão à toa).
 */
export async function resizeToMaxSide(data: Uint8Array, maxSidePx: number): Promise<ResizedImage> {
	const image = await Jimp.read(Buffer.from(data));
	const { width, height } = image.bitmap;
	const longestSide = Math.max(width, height);

	if (longestSide <= maxSidePx) {
		return { data, width, height };
	}

	const scale = maxSidePx / longestSide;
	const targetWidth = Math.round(width * scale);
	const targetHeight = Math.round(height * scale);

	image.resize({ w: targetWidth, h: targetHeight });
	const resized = await image.getBuffer('image/png');

	return { data: new Uint8Array(resized), width: image.bitmap.width, height: image.bitmap.height };
}
