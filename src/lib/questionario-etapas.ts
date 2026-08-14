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
	/**
	 * Exemplo real e específico do que entra no campo (DESIGN.md §11, estado "vazio" do
	 * "Campo de escrita do questionário"): nunca "João Silva". Ausente na etapa `photos`, que
	 * não é campo de escrita.
	 */
	example?: string;
	/**
	 * Rótulo do botão "Avançar" desta etapa, nomeando o destino (DESIGN.md §9: nunca
	 * "Continuar" sozinho). Ausente na última etapa, que não tem botão de avançar.
	 */
	continuarPara?: string;
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
		},
		example: 'ex.: Marcela · teimosa, engraçada, organizada',
		continuarPara: 'Continuar para as fotos'
	},
	{
		slug: 'fotos',
		title: 'Fotos do casal',
		intro: 'O envio de fotos chega em breve — por enquanto esta etapa é só um espaço reservado.',
		key: 'photos',
		schema: photosSchema,
		continuarPara: 'Continuar para como vocês se conheceram'
	},
	{
		slug: 'como-se-conheceram',
		title: 'Como vocês se conheceram',
		intro: 'Conte, com suas palavras, a história de como vocês se conheceram.',
		key: 'howTheyMet',
		schema: howTheyMetSchema,
		fields: {
			text: 'Como vocês se conheceram'
		},
		example: 'ex.: nos conhecemos numa festa de aniversário em comum, em 2019',
		continuarPara: 'Continuar para os momentos importantes'
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
		},
		example: 'ex.: o dia em que se mudaram para o primeiro apartamento juntos',
		continuarPara: 'Continuar para as piadas internas'
	},
	{
		slug: 'piadas',
		title: 'Piadas internas',
		intro: 'Escreva uma piada interna por linha.',
		key: 'insideJokes',
		schema: insideJokesSchema,
		fields: {
			text: 'Piadas internas'
		},
		example: 'ex.: aquele apelido que só vocês dois entendem',
		continuarPara: 'Continuar para as viagens'
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
		},
		example: 'ex.: Paraty — o fim de semana em que perderam o ônibus de volta',
		continuarPara: 'Continuar para as dificuldades superadas'
	},
	{
		slug: 'dificuldades',
		title: 'Dificuldades superadas',
		intro: 'Escreva uma dificuldade superada por linha.',
		key: 'challenges',
		schema: challengesSchema,
		fields: {
			text: 'Dificuldades superadas'
		},
		example: 'ex.: a mudança de cidade que quase separou vocês',
		continuarPara: 'Continuar para os planos futuros'
	},
	{
		slug: 'planos',
		title: 'Planos futuros',
		intro: 'Escreva um plano futuro por linha.',
		key: 'futurePlans',
		schema: futurePlansSchema,
		fields: {
			text: 'Planos futuros'
		},
		example: 'ex.: morar juntos ano que vem',
		continuarPara: 'Continuar para a mensagem especial'
	},
	{
		slug: 'mensagem',
		title: 'Uma mensagem especial',
		intro: 'Escreva uma mensagem especial para fechar a história de vocês.',
		key: 'specialMessage',
		schema: specialMessageSchema,
		fields: {
			text: 'Mensagem especial'
		},
		example: 'ex.: o que você diria se estivesse com essa pessoa agora'
	}
];

export function getEtapaBySlug(slug: string): QuestionarioEtapa | undefined {
	return questionarioEtapas.find((etapa) => etapa.slug === slug);
}

export function getEtapaIndex(slug: string): number {
	return questionarioEtapas.findIndex((etapa) => etapa.slug === slug);
}
