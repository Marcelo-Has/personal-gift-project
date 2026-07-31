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
 * servidor (`crypto.randomUUID()` na rota de upload). Guardar o CAMINHO inteiro seria um
 * IDOR esperando acontecer: ele viria pronto do cliente e nada impediria
 * `users/<uid-de-outro>/...`. O invariante de `$lib/server/signed-url.ts` é explícito — "o
 * caminho do objeto é sempre montado aqui, a partir de ids validados, nunca recebido
 * pronto" —, e quem for gerar a URL de leitura remonta com o `uid` da SESSÃO
 * (achado MÉDIO da revisão de segurança do PR #67, aplicado aqui antes de existir dado
 * persistido).
 *
 * `url` é assinada e EXPIRA (10 min, `DEFAULT_DOWNLOAD_TTL_SECONDS` em
 * `$lib/server/signed-url.ts`) — por exigência de `.claude/rules/security.md`, foto nunca
 * fica pública. Por isso ela é estado efêmero de UI: serve para o preview da sessão atual e
 * é renovada sob demanda a partir do `path`. Guardá-la como identificador da foto daria um
 * `<img>` quebrado em qualquer fluxo que passe de 10 minutos — e o questionário tem 9 etapas
 * (achado da revisão do PR #66).
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
