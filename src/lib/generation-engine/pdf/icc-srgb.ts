/**
 * Perfil ICC sRGB mínimo (v2, matrix/TRC), construído a partir dos coeficientes públicos
 * de sRGB IEC61966-2.1 — usado como `DestOutputProfile` do `OutputIntent` PDF/X-4 em
 * `render-book.ts` (F2-08c2, issue #139).
 *
 * Por quê construir em vez de embutir um `.icc` binário externo. `.claude/rules/
 * right-sizing.md`: nenhum pacote npm do projeto (nem os já instalados, ex. `pdf-lib`,
 * `jimp`, `pdfjs-dist`) traz um perfil sRGB pronto, e o sandbox de desenvolvimento não
 * enxerga o filesystem fora do repo (sem `/usr/share/color`), então "baixar um .icc
 * conhecido" exigiria confiar num binário de origem externa versionado no repo sem forma
 * de auditar o conteúdo por diff. Construir a partir de números publicamente documentados
 * (primárias/whitepoint) é auditável como qualquer outro código e não precisa de
 * dependência nova.
 *
 * Simplificação assumida — curva tonal (TRC) como gama simples 2.2. A curva real de sRGB
 * IEC61966-2.1 é segmentada (trecho linear perto do preto + potência ~2.4 com offset), mas
 * um perfil ICC v2 do tipo `curv` com um único valor já é uma aproximação padrão amplamente
 * usada (é o que vários perfis "Generic RGB"/"sGray" simplificados fazem). Documentado em
 * `docs/DECISIONS.md` (D-067): é a opção mais simples que ainda produz um perfil ICC
 * estruturalmente válido (checado por `render-book.test.ts` e, no protótipo desta issue,
 * por reconhecimento de assinatura via `file-type`) — trocar por uma curva `para`/LUT
 * fiel só se algum RIP de print-on-demand real (F3-01, D-104 PENDENTE) rejeitar este
 * perfil, o que hoje não tem como ser medido (sem provedor definido).
 *
 * Primárias e whitepoint (D50-adaptado) são os coeficientes clássicos publicados para o
 * perfil sRGB IEC61966-2.1 (mesmos usados por implementações de referência como o perfil
 * sRGB embutido do Little CMS).
 */

function s15Fixed16(value: number): Uint8Array {
	const buf = new Uint8Array(4);
	const view = new DataView(buf.buffer);
	view.setInt32(0, Math.round(value * 65536), false);
	return buf;
}

function u32(value: number): Uint8Array {
	const buf = new Uint8Array(4);
	new DataView(buf.buffer).setUint32(0, value, false);
	return buf;
}

function u16(value: number): Uint8Array {
	const buf = new Uint8Array(2);
	new DataView(buf.buffer).setUint16(0, value, false);
	return buf;
}

function ascii(text: string): Uint8Array {
	return new Uint8Array([...text].map((char) => char.charCodeAt(0)));
}

function concat(chunks: Uint8Array[]): Uint8Array {
	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}

/** Alinha o tamanho de um elemento de tag ao próximo múltiplo de 4 bytes (ICC.1:2001-04
 * §6.2: tag data elements devem começar em offset múltiplo de 4). */
function pad4(data: Uint8Array): Uint8Array {
	const remainder = data.length % 4;
	if (remainder === 0) return data;
	return concat([data, new Uint8Array(4 - remainder)]);
}

/** `textDescriptionType` (ICC.1:2001-04 §6.5.17) — só a parte ASCII invariante é usada; os
 * campos Unicode/Macintosh ficam vazios (zerados), como permitido pela spec. */
function textDescriptionType(text: string): Uint8Array {
	const textBytes = ascii(text + '\0');
	return concat([
		ascii('desc'),
		u32(0), // reserved
		u32(textBytes.length), // ascii count, incluindo o NUL final
		textBytes,
		u32(0), // unicode language code
		u32(0), // unicode count (nenhum texto unicode)
		u16(0), // scriptcode code
		new Uint8Array([0]), // macintosh description count
		new Uint8Array(67) // macintosh description (67 bytes reservados, zerados)
	]);
}

/** `textType` (ICC.1:2001-04 §6.5.18) — string ASCII terminada em NUL. */
function textType(text: string): Uint8Array {
	return concat([ascii('text'), u32(0), ascii(text + '\0')]);
}

/** `XYZType` (ICC.1:2001-04 §6.5.26) com um único triplo XYZ, formato usado por
 * `wtpt`/`rXYZ`/`gXYZ`/`bXYZ`. */
function xyzType(x: number, y: number, z: number): Uint8Array {
	return concat([ascii('XYZ '), u32(0), s15Fixed16(x), s15Fixed16(y), s15Fixed16(z)]);
}

/** `curveType` (ICC.1:2001-04 §6.5.3) com count=1: um único valor de gama, codificado como
 * `u8Fixed8Number` — forma mais simples de curva tonal válida (ver comentário do módulo). */
function curveTypeSingleGamma(gamma: number): Uint8Array {
	return concat([ascii('curv'), u32(0), u32(1), u16(Math.round(gamma * 256))]);
}

interface IccTag {
	signature: string;
	data: Uint8Array;
}

function buildSrgbIccProfile(): Uint8Array {
	const tags: IccTag[] = [
		{ signature: 'desc', data: textDescriptionType('sRGB IEC61966-2.1 (perfil simplificado)') },
		{ signature: 'cprt', data: textType('Public Domain') },
		{ signature: 'wtpt', data: xyzType(0.964203, 1.0, 0.824905) },
		{ signature: 'rXYZ', data: xyzType(0.436075, 0.222504, 0.013932) },
		{ signature: 'gXYZ', data: xyzType(0.385065, 0.716879, 0.097105) },
		{ signature: 'bXYZ', data: xyzType(0.14306, 0.060606, 0.713926) },
		{ signature: 'rTRC', data: curveTypeSingleGamma(2.2) },
		{ signature: 'gTRC', data: curveTypeSingleGamma(2.2) },
		{ signature: 'bTRC', data: curveTypeSingleGamma(2.2) }
	].map((tag) => ({ signature: tag.signature, data: pad4(tag.data) }));

	const headerSize = 128;
	const tagTableSize = 4 + tags.length * 12;
	let offset = headerSize + tagTableSize;
	const tagEntries = tags.map((tag) => {
		const entry = { signature: tag.signature, offset, size: tag.data.length };
		offset += tag.data.length;
		return entry;
	});
	const totalSize = offset;

	const header = new Uint8Array(128);
	const headerView = new DataView(header.buffer);
	headerView.setUint32(0, totalSize, false); // profile size
	header.set(ascii('    '), 4); // CMM type: não identificado
	headerView.setUint32(8, 0x02100000, false); // versão do perfil: 2.1.0
	header.set(ascii('mntr'), 12); // device class: display/monitor (mesma classe do sRGB IEC61966-2.1 de referência)
	header.set(ascii('RGB '), 16); // color space
	header.set(ascii('XYZ '), 20); // PCS
	// data/hora de criação: fixa (não afeta conformidade estrutural do perfil)
	headerView.setUint16(24, 2026, false);
	headerView.setUint16(26, 1, false);
	headerView.setUint16(28, 1, false);
	header.set(ascii('acsp'), 36); // profile file signature, obrigatório
	header.set(ascii('    '), 40); // primary platform: não identificado
	// flags (44-47), manufacturer (48-51), model (52-55), attributes (56-63) = 0
	header.set(ascii('    '), 48);
	header.set(ascii('    '), 52);
	headerView.setUint32(64, 0, false); // rendering intent: perceptual
	// PCS illuminant, sempre D50 por definição do formato ICC
	header.set(s15Fixed16(0.9642), 68);
	header.set(s15Fixed16(1.0), 72);
	header.set(s15Fixed16(0.8249), 76);
	header.set(ascii('PGPr'), 80); // profile creator: Personal Gift Project
	// profile ID (84-99) e reserved (100-127) ficam zerados — válido em ICC v2

	const tagTable = new Uint8Array(tagTableSize);
	const tagTableView = new DataView(tagTable.buffer);
	tagTableView.setUint32(0, tags.length, false);
	tagEntries.forEach((entry, index) => {
		const base = 4 + index * 12;
		tagTable.set(ascii(entry.signature), base);
		tagTableView.setUint32(base + 4, entry.offset, false);
		tagTableView.setUint32(base + 8, entry.size, false);
	});

	return concat([header, tagTable, ...tags.map((tag) => tag.data)]);
}

/** Perfil ICC sRGB simplificado, gerado uma única vez no carregamento do módulo. */
export const SRGB_ICC_PROFILE: Uint8Array = buildSrgbIccProfile();
