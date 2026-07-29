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
