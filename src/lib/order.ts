/**
 * Modelo de domínio do Pedido do produto "Nossa História" (ver docs/PRODUCT.md, seção 2).
 * Modelagem de dados apenas — sem persistência real (isso é F1-05/F1-06/Fase 2).
 */

export interface Person {
	name: string;
	traits: string[];
}

export interface PhotoReference {
	url: string;
	/**
	 * Caminho no Storage (`photoObjectPath`, `src/lib/server/signed-url.ts`), aditivo
	 * (F1-05c, issue #33): `url` assinada expira em minutos e não deve ser persistida;
	 * o rascunho grava `path` e gera a URL de download sob demanda.
	 */
	path?: string;
	caption?: string;
}

export interface Milestone {
	title: string;
	description: string;
}

export interface Trip {
	destination: string;
	description?: string;
}

export interface CoupleQuestionnaire {
	people: [Person, Person];
	photos: PhotoReference[];
	howTheyMet: string;
	milestones: Milestone[];
	insideJokes: string[];
	trips: Trip[];
	challenges: string[];
	futurePlans: string[];
	specialMessage: string;
}

/** IDs referenciam entradas `published` do registry (ver `src/lib/registry.ts`). */
export interface StyleAndSizeChoice {
	narrativeStyleId: string;
	photoStyleId: string;
	sizeId: string;
}

export interface Order {
	questionnaire: CoupleQuestionnaire;
	choice: StyleAndSizeChoice;
}

/**
 * Rascunho persistido em `users/<uid>/orders/<orderId>` (F1-05c, issue #33).
 * Só `'rascunho'` é escrito por esta issue; os demais valores existem no tipo
 * para F1-07 (checkout/pagamento) não precisar alterar o modelo.
 */
export type OrderStatus = 'rascunho' | 'aguardando_pagamento' | 'pago';

/**
 * Rascunho é preenchido etapa a etapa (`merge: true`), então cada parte do
 * pedido é opcional até o questionário/escolha estarem completos.
 */
export interface OrderDraft {
	id: string;
	ownerId: string;
	status: OrderStatus;
	createdAt: string;
	updatedAt: string;
	questionnaire?: Partial<CoupleQuestionnaire>;
	choice?: Partial<StyleAndSizeChoice>;
}
