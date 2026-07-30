/**
 * Lista ordenada das etapas do questionário `/questionario/[etapa]`.
 * Cada etapa cobre exatamente uma chave de `CoupleQuestionnaire` (ver `src/lib/order.ts`)
 * e reusa o schema correspondente de `src/lib/order-schema.ts`. Copy separada do
 * markup, espelhando `src/lib/home-content.ts`.
 */
import type { z } from 'zod';
import type { CoupleQuestionnaire } from './order';
import {
	challengesSchema,
	futurePlansSchema,
	howTheyMetSchema,
	insideJokesSchema,
	milestonesSchema,
	peopleSchema,
	photosSchema,
	specialMessageSchema,
	tripsSchema
} from './order-schema';

type EtapaFor<K extends keyof CoupleQuestionnaire> = {
	slug: string;
	title: string;
	intro: string;
	key: K;
	schema: z.ZodType<CoupleQuestionnaire[K]>;
	/** Rótulos de campo usados pela página da etapa (evita copy inline no .svelte). */
	fields?: Record<string, string>;
};

export type QuestionarioEtapa = {
	[K in keyof CoupleQuestionnaire]: EtapaFor<K>;
}[keyof CoupleQuestionnaire];

export const questionarioEtapas: QuestionarioEtapa[] = [
	{
		slug: 'pessoas',
		title: 'Quem são vocês',
		intro: 'Conte o nome e as características de cada um.',
		key: 'people',
		schema: peopleSchema,
		fields: {
			name: 'Nome',
			traits: 'Características (uma por linha)'
		}
	},
	{
		slug: 'fotos',
		title: 'Fotos do casal',
		intro: 'O envio de fotos chega em breve — por enquanto esta etapa é só um espaço reservado.',
		key: 'photos',
		schema: photosSchema
	},
	{
		slug: 'como-se-conheceram',
		title: 'Como vocês se conheceram',
		intro: 'Conte, com suas palavras, a história de como vocês se conheceram.',
		key: 'howTheyMet',
		schema: howTheyMetSchema,
		fields: {
			text: 'Como vocês se conheceram'
		}
	},
	{
		slug: 'momentos',
		title: 'Momentos importantes',
		intro: 'Liste os momentos marcantes da relação de vocês.',
		key: 'milestones',
		schema: milestonesSchema,
		fields: {
			title: 'Título',
			description: 'Descrição',
			add: 'Adicionar momento',
			remove: 'Remover momento'
		}
	},
	{
		slug: 'piadas',
		title: 'Piadas internas',
		intro: 'Escreva uma piada interna por linha.',
		key: 'insideJokes',
		schema: insideJokesSchema,
		fields: {
			text: 'Piadas internas'
		}
	},
	{
		slug: 'viagens',
		title: 'Viagens',
		intro: 'Liste as viagens que vocês fizeram juntos.',
		key: 'trips',
		schema: tripsSchema,
		fields: {
			destination: 'Destino',
			description: 'Descrição (opcional)',
			add: 'Adicionar viagem',
			remove: 'Remover viagem'
		}
	},
	{
		slug: 'dificuldades',
		title: 'Dificuldades superadas',
		intro: 'Escreva uma dificuldade superada por linha.',
		key: 'challenges',
		schema: challengesSchema,
		fields: {
			text: 'Dificuldades superadas'
		}
	},
	{
		slug: 'planos',
		title: 'Planos futuros',
		intro: 'Escreva um plano futuro por linha.',
		key: 'futurePlans',
		schema: futurePlansSchema,
		fields: {
			text: 'Planos futuros'
		}
	},
	{
		slug: 'mensagem',
		title: 'Uma mensagem especial',
		intro: 'Escreva uma mensagem especial para fechar a história de vocês.',
		key: 'specialMessage',
		schema: specialMessageSchema,
		fields: {
			text: 'Mensagem especial'
		}
	}
];

export function getEtapaBySlug(slug: string): QuestionarioEtapa | undefined {
	return questionarioEtapas.find((etapa) => etapa.slug === slug);
}

export function getEtapaIndex(slug: string): number {
	return questionarioEtapas.findIndex((etapa) => etapa.slug === slug);
}
