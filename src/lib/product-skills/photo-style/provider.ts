/**
 * Contrato do provedor de estilização de foto (F2-03).
 *
 * Define entrada (foto(s) + parâmetros do pedido) e saída (imagem estilizada +
 * metadados de resolução/DPI) independente de QUEM estiliza a foto. Escolher/contratar
 * o provedor real é Decision Gate D-102 (custo recorrente por livro) — a integração
 * real só entra em F2-04, como uma nova implementação desta mesma interface, sem
 * redesenho. Até lá, quem chama (skill, motor F2-06) usa o provider fake
 * (`aquarela/fake-provider.ts`).
 */

/** Foto de origem enviada pelo casal. */
export interface SourcePhoto {
	/** Identificador estável da foto dentro do pedido (ex.: nome do arquivo enviado). */
	id: string;
	/** Conteúdo binário original da foto. */
	data: Uint8Array;
}

/** Parâmetros do pedido que afetam a estilização (tamanho/SKU escolhido). */
export interface PhotoStyleOrderParams {
	/** Id do tamanho escolhido (ver `registry.json` > `sizes[].id`). */
	sizeId: string;
	/** Largura alvo da saída, em pixels, compatível com 300 DPI no tamanho do SKU. */
	targetWidthPx: number;
	/** Altura alvo da saída, em pixels, compatível com 300 DPI no tamanho do SKU. */
	targetHeightPx: number;
}

/** Metadados de impressão da imagem estilizada. */
export interface StylizedPhotoMetadata {
	widthPx: number;
	heightPx: number;
	dpi: number;
	format: 'png' | 'jpeg';
}

/** Foto já estilizada, pronta para compor o layout. */
export interface StylizedPhoto {
	/** Id da `SourcePhoto` que originou esta saída — rastreabilidade 1:1. */
	sourcePhotoId: string;
	/** Conteúdo binário da imagem estilizada. */
	data: Uint8Array;
	metadata: StylizedPhotoMetadata;
}

/**
 * Contrato que toda implementação de estilização de um estilo de foto (ex.: aquarela)
 * precisa cumprir — provider fake (esta issue) ou provedor real (F2-04, gate D-102).
 */
export interface PhotoStyleProvider {
	readonly styleId: string;
	readonly styleVersion: string;
	stylize(photos: SourcePhoto[], params: PhotoStyleOrderParams): Promise<StylizedPhoto[]>;
}
