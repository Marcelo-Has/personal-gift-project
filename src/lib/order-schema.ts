/**
 * Schemas Zod do questionário (`CoupleQuestionnaire`, ver `src/lib/order.ts`).
 * Um schema por etapa, reusado no cliente (validação por passo, esta issue) e no
 * servidor (revalidação, #33) — decisão D-022 em `docs/DECISIONS.md`.
 */
import { z } from 'zod';
import type { CoupleQuestionnaire } from './order';

export const personSchema = z.object({
	name: z.string().trim().min(1, 'Informe o nome.').max(80, 'Nome muito longo.'),
	traits: z
		.array(
			z
				.string()
				.trim()
				.min(1, 'Característica não pode ser vazia.')
				.max(40, 'Característica muito longa.')
		)
		.min(1, 'Informe ao menos uma característica.')
		.max(10, 'No máximo 10 características.')
});

export const peopleSchema = z.tuple([personSchema, personSchema]);

// `photoId` identifica a foto; `url` é assinada, expira em 10 min e só serve de preview
// (ver `PhotoReference` em `./order.ts`). Mesma allow-list de `orderIdSchema`/`signed-url.ts`,
// e não um `min(1)` qualquer: este id vem do cliente e vira segmento de caminho no Storage,
// então sem a âncora o `../` passaria — achado MÉDIO da revisão de segurança do PR #67.
export const photoSchema = z.object({
	photoId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, 'ID de foto inválido.'),
	url: z.string().trim().min(1).max(2048, 'URL muito longa.').optional(),
	caption: z.string().trim().max(200, 'Legenda muito longa.').optional()
});

// Teto explícito, como em todos os outros arrays deste arquivo. `photos` era a exceção, e
// esta issue é a primeira a levar o schema para uma rota de servidor que ESCREVE: sem o
// `.max()`, um único POST carregaria dezenas de milhares de entradas.
// Exigir ao menos 1 foto é decisão de produto ainda não tomada — lista vazia segue válida.
export const photosSchema = z.array(photoSchema).max(20, 'No máximo 20 fotos.');

export const howTheyMetSchema = z
	.string()
	.trim()
	.min(1, 'Conte como vocês se conheceram.')
	.max(2000, 'Texto muito longo (máximo 2000 caracteres).');

export const milestoneSchema = z.object({
	title: z.string().trim().min(1, 'Informe o título do momento.').max(120, 'Título muito longo.'),
	description: z
		.string()
		.trim()
		.min(1, 'Descreva esse momento.')
		.max(1000, 'Descrição muito longa.')
});

export const milestonesSchema = z
	.array(milestoneSchema)
	.min(1, 'Conte ao menos um momento importante.')
	.max(20, 'No máximo 20 momentos.');

export const insideJokesSchema = z
	.array(z.string().trim().min(1, 'A piada não pode ser vazia.').max(300, 'Texto muito longo.'))
	.min(1, 'Conte ao menos uma piada interna.')
	.max(20, 'No máximo 20 piadas.');

export const tripSchema = z.object({
	destination: z.string().trim().min(1, 'Informe o destino.').max(120, 'Destino muito longo.'),
	description: z.string().trim().max(500, 'Descrição muito longa.').optional()
});

export const tripsSchema = z
	.array(tripSchema)
	.min(1, 'Conte ao menos uma viagem.')
	.max(20, 'No máximo 20 viagens.');

export const challengesSchema = z
	.array(
		z.string().trim().min(1, 'A dificuldade não pode ser vazia.').max(300, 'Texto muito longo.')
	)
	.min(1, 'Conte ao menos uma dificuldade superada.')
	.max(20, 'No máximo 20 dificuldades.');

export const futurePlansSchema = z
	.array(z.string().trim().min(1, 'O plano não pode ser vazio.').max(300, 'Texto muito longo.'))
	.min(1, 'Conte ao menos um plano futuro.')
	.max(20, 'No máximo 20 planos.');

export const specialMessageSchema = z
	.string()
	.trim()
	.min(1, 'Escreva uma mensagem especial.')
	.max(2000, 'Texto muito longo (máximo 2000 caracteres).');

export const questionarioSchema = z.object({
	people: peopleSchema,
	photos: photosSchema,
	howTheyMet: howTheyMetSchema,
	milestones: milestonesSchema,
	insideJokes: insideJokesSchema,
	trips: tripsSchema,
	challenges: challengesSchema,
	futurePlans: futurePlansSchema,
	specialMessage: specialMessageSchema
});

export type QuestionarioInput = z.infer<typeof questionarioSchema>;

// Checagem em tempo de compilação (critério de aceite): o tipo inferido do schema
// completo tem de ser atribuível a CoupleQuestionnaire. Se divergirem, `npm run check` quebra
// porque `false` não é atribuível ao tipo declarado abaixo.
export const questionarioInputAssignableToModel: QuestionarioInput extends CoupleQuestionnaire
	? true
	: false = true;

/**
 * Schema do rascunho (F1-05c, issue #33): reusa os schemas de etapa acima, mas
 * cada etapa é opcional — o rascunho é salvo aos pedaços, etapa a etapa, então
 * nunca chega completo antes da última tela do questionário.
 */
export const rascunhoQuestionarioSchema = z
	.object({
		people: peopleSchema,
		photos: photosSchema,
		howTheyMet: howTheyMetSchema,
		milestones: milestonesSchema,
		insideJokes: insideJokesSchema,
		trips: tripsSchema,
		challenges: challengesSchema,
		futurePlans: futurePlansSchema,
		specialMessage: specialMessageSchema
	})
	.partial();

/** Sem schema próprio ainda (#30 cobriu só o questionário) — mínimo para o rascunho. */
export const rascunhoChoiceSchema = z
	.object({
		narrativeStyleId: z.string().trim().min(1, 'Selecione um estilo de narrativa.'),
		photoStyleId: z.string().trim().min(1, 'Selecione um estilo de foto.'),
		sizeId: z.string().trim().min(1, 'Selecione um tamanho.')
	})
	.partial();

/**
 * Id seguro para virar caminho de documento/foto — mesma allow-list de
 * `SAFE_ID`/`assertSafeId` em `src/lib/server/signed-url.ts:41`, para os dois
 * concordarem sobre o mesmo `orderId`.
 */
export const orderIdSchema = z
	.string()
	.regex(/^[A-Za-z0-9_-]{1,128}$/, 'ID de pedido inválido: use apenas letras, números, "-" e "_".');

/** Corpo aceito por `POST /api/pedidos/rascunho`. `ownerId`/`userId` não entram — o dono vem sempre de `locals.uid`. */
export const salvarRascunhoSchema = z.object({
	orderId: orderIdSchema,
	questionnaire: rascunhoQuestionarioSchema.optional(),
	choice: rascunhoChoiceSchema.optional()
});

export type SalvarRascunhoInput = z.infer<typeof salvarRascunhoSchema>;
