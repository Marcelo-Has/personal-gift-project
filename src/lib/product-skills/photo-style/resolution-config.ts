/**
 * Teto de resolução único para todo o pipeline de `photo-style` (F2-04, [D-056]).
 *
 * Constante de configuração única — trocar o teto é mudar um número aqui, não caçar
 * valores espalhados pelo código. Ver `docs/DECISIONS.md` ([D-056]) para o racional.
 */

/**
 * Maior lado aceito, em px, para a foto de ENTRADA enviada ao provedor. Fotos maiores são
 * redimensionadas proporcionalmente (sem crop) antes do upload; o original no Storage não
 * é alterado.
 */
export const PHOTO_STYLE_INPUT_MAX_SIDE_PX = 2048;

/**
 * Maior lado, em px, que a SAÍDA estilizada deveria ter para atender 300 DPI no maior SKU
 * previsto (`docs/PRODUCT.md` §5: 20×20 cm + 3 mm de sangria ≈ 2400 px). Não se pede ao
 * provedor mais resolução que isto "por garantia".
 *
 * Este é o requisito de IMPRESSÃO — não uma garantia de que o provedor entrega esse
 * tanto. Quando o teto do provedor concreto é menor (caso do `HttpPhotoStyleProvider`
 * atual, ver seu arquivo), a saída real fica abaixo disto e o DPI efetivo é reportado
 * nos metadados, sem upscaling artificial.
 */
export const PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX = 2400;

/** DPI de referência do requisito de impressão (`docs/PRODUCT.md` §5). */
export const PHOTO_STYLE_TARGET_DPI = 300;
