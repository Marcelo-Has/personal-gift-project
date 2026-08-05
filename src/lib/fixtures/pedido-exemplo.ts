/**
 * Pedido de exemplo — insumo de desenvolvimento para rodar o pipeline de geração (FU-20).
 *
 * O motor de geração (F2-06) orquestra narrativa + foto + layout a partir de um `Order`.
 * Sem um `Order` completo à mão, cada teste monta o seu pedaço: o golden sample do
 * `narrative-style` traz só o `CoupleQuestionnaire`, os quatro `compose.test.ts` de
 * `layout-element` repetem a geometria do SKU mini, e ninguém produz foto em bytes.
 * Este módulo é o insumo único: um pedido fictício completo + a geometria e a resolução
 * do SKU mini derivadas (não copiadas) das constantes que já existem.
 *
 * NÃO é golden sample: golden sample trava a SAÍDA de uma skill contra regressão de estilo
 * (`.claude/rules/product-skills.md`); aqui é ENTRADA, e ninguém compara resultado com ela.
 *
 * O casal é inventado, e de propósito diferente do casal do golden sample do
 * `narrative-style/romantico` — assim uma narrativa gerada a partir daqui não pode passar
 * por acaso num teste de estilo que espera o outro casal.
 */
import type { CoupleQuestionnaire, Order } from '../order';
import type { SkuLayoutParams } from '../product-skills/layout-element/polaroid-com-texto/compose';
import type { PhotoStyleOrderParams } from '../product-skills/photo-style/provider';
import {
	PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX,
	PHOTO_STYLE_TARGET_DPI
} from '../product-skills/photo-style/resolution-config';

/** Converte milímetros em pixels no DPI dado. Arredonda para cima: faltar pixel corta arte. */
export function mmToPx(mm: number, dpi: number = PHOTO_STYLE_TARGET_DPI): number {
	return Math.ceil((mm / 25.4) * dpi);
}

/**
 * Geometria de página do SKU mini (`docs/PRODUCT.md` §5): 150 × 150 mm finais + 3 mm de
 * sangria por lado = página de produção de 156 × 156 mm. A margem de segurança de 5 mm é a
 * mesma que os `compose.test.ts` das quatro `layout-element` já usam.
 */
export const MINI_SKU_LAYOUT: SkuLayoutParams = {
	pageWidthMm: 156,
	pageHeightMm: 156,
	bleedMm: 3,
	safeMarginMm: 5
};

/**
 * Resolução alvo da foto estilizada para o SKU mini, a 300 DPI sobre a página de PRODUÇÃO
 * (com sangria) — uma foto que sangra precisa cobrir os 156 mm, não os 150 mm finais.
 * Mesma conta que a nota de `PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX` faz para o SKU de
 * 20 × 20 cm (206 mm ≈ 2400 px); por isso é derivada aqui, não digitada.
 */
export const MINI_SKU_PHOTO_PARAMS: PhotoStyleOrderParams = {
	sizeId: 'mini-15x15',
	targetWidthPx: mmToPx(MINI_SKU_LAYOUT.pageWidthMm),
	targetHeightPx: mmToPx(MINI_SKU_LAYOUT.pageHeightMm)
};

/**
 * Teto do pipeline (`resolution-config.ts`) medido contra o SKU mini: se um dia o mini pedir
 * mais que o maior SKU previsto, a conta acima está errada. Falha no import, não em runtime
 * no meio de uma geração paga.
 */
if (
	Math.max(MINI_SKU_PHOTO_PARAMS.targetWidthPx, MINI_SKU_PHOTO_PARAMS.targetHeightPx) >
	PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX
) {
	throw new Error(
		`pedido-exemplo: o SKU mini pede ${MINI_SKU_PHOTO_PARAMS.targetWidthPx} px, acima do teto de ` +
			`${PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX} px de PHOTO_STYLE_OUTPUT_TARGET_MAX_SIDE_PX`
	);
}

/**
 * Questionário fictício, farto o bastante para exercitar as 16 spreads do SKU mini:
 * 8 fotos, 6 marcos, 3 viagens e material para todos os `layout-element`.
 *
 * `caption` aqui descreve O QUE a foto mostra — é entrada para a narrativa escolher a
 * legenda, não a legenda final (essa sai de `narrative-style`, campo `polaroidCaptions`).
 */
export const QUESTIONARIO_EXEMPLO: CoupleQuestionnaire = {
	people: [
		{
			name: 'Helena',
			traits: ['teimosa do jeito bom', 'ri antes de terminar a piada', 'anota tudo em papel']
		},
		{
			name: 'Tomás',
			traits: ['calmo até demais', 'cozinha para pensar', 'guarda ingresso de cinema']
		}
	],
	photos: [
		{ photoId: 'foto-01-varanda', caption: 'Os dois na varanda da festa onde se conheceram.' },
		{ photoId: 'foto-02-feira', caption: 'Helena escolhendo manga na feira de domingo.' },
		{ photoId: 'foto-03-cozinha', caption: 'Tomás cozinhando de costas, panela fumegando.' },
		{ photoId: 'foto-04-mudanca', caption: 'A sala vazia no dia da mudança, caixas no chão.' },
		{ photoId: 'foto-05-praia', caption: 'Os dois na praia de Itamambuca, fim de tarde.' },
		{ photoId: 'foto-06-cachorro', caption: 'Primeiro dia da Vitória, a cachorra adotada.' },
		{ photoId: 'foto-07-hospital', caption: 'Tomás no hospital, Helena segurando a mão dele.' },
		{ photoId: 'foto-08-aniversario', caption: 'Bolo de aniversário improvisado, luz de vela.' }
	],
	howTheyMet:
		'Numa festa de aniversário de um amigo em comum, os dois foram os únicos que ficaram na ' +
		'varanda porque a música estava alta demais. Passaram três horas falando sobre nada e ' +
		'nenhum dos dois entrou de volta.',
	milestones: [
		{
			title: 'A primeira feira de domingo',
			description:
				'Duas semanas depois da festa, Tomás chamou Helena para ir à feira em vez de jantar. ' +
				'Viraram fregueses do mesmo barraquinho de pastel por seis anos.'
		},
		{
			title: 'O apartamento sem móveis',
			description:
				'Alugaram um apartamento pequeno em Pinheiros e passaram o primeiro mês dormindo em ' +
				'colchão no chão, comendo em caixas de papelão viradas.'
		},
		{
			title: 'Vitória',
			description:
				'Adotaram uma cachorra vira-lata de três anos que ninguém queria porque tinha medo de ' +
				'homem. Levou quatro meses até ela deitar perto do Tomás.'
		},
		{
			title: 'A cirurgia',
			description:
				'Tomás operou o joelho e ficou dois meses sem andar direito. Helena aprendeu a dirigir ' +
				'no carro dele, na marra, para levá-lo à fisioterapia.'
		},
		{
			title: 'O pedido na cozinha',
			description:
				'Sem plano nenhum, num sábado qualquer, Tomás pediu Helena em casamento enquanto ' +
				'esperavam a água ferver. Ela disse sim antes de ele terminar a frase.'
		},
		{
			title: 'A casa com quintal',
			description:
				'Depois de cinco anos no apartamento, se mudaram para uma casa em Cotia, com quintal ' +
				'de terra batida e uma mangueira velha no fundo.'
		}
	],
	insideJokes: [
		'Chamar qualquer plano furado de "projeto da varanda"',
		'Tomás dizer "já vai ficar pronto" quando faltam quarenta minutos',
		'Fingir que a Vitória tem opinião sobre política',
		'Contar a mesma história do pastel para toda visita nova'
	],
	trips: [
		{
			destination: 'Itamambuca',
			description:
				'Primeira viagem juntos. Esqueceram a barraca em casa e dormiram no carro, encolhidos, ' +
				'rindo do próprio despreparo.'
		},
		{
			destination: 'Tiradentes',
			description:
				'Foram para um casamento de terceiros e acabaram ficando mais três dias, sem roupa ' +
				'suficiente, comprando camiseta de feira.'
		},
		{
			destination: 'Buenos Aires',
			description:
				'Primeira viagem de avião do casal. Andaram tanto que Helena perdeu a unha do dedão e ' +
				'fez questão de mostrar a foto para todo mundo.'
		}
	],
	challenges: [
		'Um ano e meio em que Helena ficou desempregada e os dois viveram só do salário do Tomás, ' +
			'contando dinheiro no fim do mês.',
		'A recuperação da cirurgia do joelho, com Tomás dependente de tudo e péssimo em pedir ajuda.'
	],
	futurePlans: [
		'Plantar uma horta no quintal de Cotia, mesmo sabendo que os dois esquecem de regar',
		'Voltar para Itamambuca com barraca de verdade dessa vez',
		'Ter filhos, quando a casa parar de dar problema'
	],
	specialMessage:
		'Helena, eu não sei fazer discurso e você sabe disso. Só sei que a melhor coisa que já ' +
		'me aconteceu foi a música daquela festa estar alta demais. Obrigado por ficar na varanda.'
};

/** Pedido completo: questionário + estilo/tamanho escolhidos (ids do `registry.json`). */
export const PEDIDO_EXEMPLO: Order = {
	questionnaire: QUESTIONARIO_EXEMPLO,
	choice: {
		narrativeStyleId: 'romantico',
		photoStyleId: 'aquarela',
		sizeId: MINI_SKU_PHOTO_PARAMS.sizeId
	}
};

/** Ids das fotos do pedido, na ordem — chave de junção com `SourcePhoto.id` (ver `photos.ts`). */
export const PEDIDO_EXEMPLO_PHOTO_IDS: readonly string[] = QUESTIONARIO_EXEMPLO.photos.map(
	(photo) => photo.photoId
);
