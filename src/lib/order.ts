/**
 * Modelo de domínio do Pedido do produto "Nossa História" (ver docs/PRODUCT.md, seção 2).
 * Modelagem de dados apenas — sem persistência real (isso é F1-05/F1-06/Fase 2).
 */

export interface Person {
	name: string;
	traits: string[];
}

/**
 * Referência a uma foto do casal.
 *
 * `photoId` é a referência DURÁVEL — só o último segmento do caminho no Storage, gerado no
 * SERVIDOR (`crypto.randomUUID()` na rota de upload, F1-05b). Guardar o caminho inteiro
 * seria IDOR esperando acontecer: viria pronto do cliente e nada impediria
 * `users/<uid-de-outro>/...`. O invariante de `$lib/server/signed-url.ts` é explícito — "o
 * caminho do objeto é sempre montado aqui, a partir de ids validados, nunca recebido
 * pronto" —, e quem gera a URL de leitura remonta com o `uid` da SESSÃO (achado MÉDIO da
 * revisão de segurança do PR #67).
 *
 * `url` é assinada e EXPIRA em 10 min (`.claude/rules/security.md`: foto nunca fica
 * pública), então é estado efêmero de UI — opcional, renovada sob demanda a partir do
 * `photoId`, e sem valor algum depois de persistida.
 */
export interface PhotoReference {
	photoId: string;
	url?: string;
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
