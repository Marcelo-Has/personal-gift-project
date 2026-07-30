import { describe, expect, it } from 'vitest';
import {
	challengesSchema,
	futurePlansSchema,
	howTheyMetSchema,
	insideJokesSchema,
	milestonesSchema,
	peopleSchema,
	photosSchema,
	questionarioSchema,
	specialMessageSchema,
	tripsSchema
} from './order-schema';

describe('peopleSchema', () => {
	it('deve aceitar quando a tupla tem exatamente 2 pessoas válidas', () => {
		const resultado = peopleSchema.safeParse([
			{ name: 'Ana', traits: ['gentil'] },
			{ name: 'Bia', traits: ['engraçada'] }
		]);

		expect(resultado.success).toBe(true);
	});

	it('deve rejeitar quando falta o nome da primeira pessoa', () => {
		const resultado = peopleSchema.safeParse([
			{ name: '', traits: ['gentil'] },
			{ name: 'Bia', traits: ['engraçada'] }
		]);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error.issues[0].message).toBe('Informe o nome.');
		}
	});

	it('deve rejeitar quando a pessoa não tem nenhuma característica', () => {
		const resultado = peopleSchema.safeParse([
			{ name: 'Ana', traits: [] },
			{ name: 'Bia', traits: ['engraçada'] }
		]);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error.issues[0].message).toBe('Informe ao menos uma característica.');
		}
	});

	it('deve rejeitar quando a tupla tem só 1 pessoa', () => {
		const resultado = peopleSchema.safeParse([{ name: 'Ana', traits: ['gentil'] }]);

		expect(resultado.success).toBe(false);
	});

	it('deve rejeitar quando o nome ultrapassa o tamanho máximo', () => {
		const resultado = peopleSchema.safeParse([
			{ name: 'A'.repeat(81), traits: ['gentil'] },
			{ name: 'Bia', traits: ['engraçada'] }
		]);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error.issues[0].message).toBe('Nome muito longo.');
		}
	});
});

describe('photosSchema', () => {
	it('deve aceitar lista vazia (upload chega em issue futura, F1-05b)', () => {
		expect(photosSchema.safeParse([]).success).toBe(true);
	});

	it('deve rejeitar foto sem url', () => {
		const resultado = photosSchema.safeParse([{ url: '' }]);
		expect(resultado.success).toBe(false);
	});
});

describe('howTheyMetSchema', () => {
	it('deve aceitar um texto não vazio', () => {
		expect(howTheyMetSchema.safeParse('Nos conhecemos na faculdade.').success).toBe(true);
	});

	it('deve rejeitar texto vazio', () => {
		const resultado = howTheyMetSchema.safeParse('   ');
		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error.issues[0].message).toBe('Conte como vocês se conheceram.');
		}
	});

	it('deve rejeitar texto acima do limite de tamanho', () => {
		const resultado = howTheyMetSchema.safeParse('a'.repeat(2001));
		expect(resultado.success).toBe(false);
	});
});

describe('milestonesSchema', () => {
	it('deve aceitar ao menos um momento com título e descrição', () => {
		const resultado = milestonesSchema.safeParse([
			{ title: 'Primeiro encontro', description: 'No parque, num domingo.' }
		]);
		expect(resultado.success).toBe(true);
	});

	it('deve rejeitar lista vazia de momentos', () => {
		const resultado = milestonesSchema.safeParse([]);
		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error.issues[0].message).toBe('Conte ao menos um momento importante.');
		}
	});

	it('deve rejeitar momento sem descrição', () => {
		const resultado = milestonesSchema.safeParse([{ title: 'Primeiro encontro', description: '' }]);
		expect(resultado.success).toBe(false);
	});
});

describe('insideJokesSchema', () => {
	it('deve aceitar ao menos uma piada', () => {
		expect(insideJokesSchema.safeParse(['pizza de sexta']).success).toBe(true);
	});

	it('deve rejeitar lista vazia', () => {
		const resultado = insideJokesSchema.safeParse([]);
		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.error.issues[0].message).toBe('Conte ao menos uma piada interna.');
		}
	});
});

describe('tripsSchema', () => {
	it('deve aceitar viagem só com destino (descrição é opcional)', () => {
		expect(tripsSchema.safeParse([{ destination: 'Bariloche' }]).success).toBe(true);
	});

	it('deve rejeitar viagem sem destino', () => {
		const resultado = tripsSchema.safeParse([{ destination: '' }]);
		expect(resultado.success).toBe(false);
	});

	it('deve rejeitar lista vazia de viagens', () => {
		expect(tripsSchema.safeParse([]).success).toBe(false);
	});
});

describe('challengesSchema e futurePlansSchema', () => {
	it('deve aceitar ao menos uma dificuldade', () => {
		expect(challengesSchema.safeParse(['distância']).success).toBe(true);
	});

	it('deve rejeitar lista vazia de dificuldades', () => {
		expect(challengesSchema.safeParse([]).success).toBe(false);
	});

	it('deve aceitar ao menos um plano futuro', () => {
		expect(futurePlansSchema.safeParse(['morar juntos']).success).toBe(true);
	});

	it('deve rejeitar lista vazia de planos futuros', () => {
		expect(futurePlansSchema.safeParse([]).success).toBe(false);
	});
});

describe('specialMessageSchema', () => {
	it('deve aceitar uma mensagem não vazia', () => {
		expect(specialMessageSchema.safeParse('Amo vocês dois.').success).toBe(true);
	});

	it('deve rejeitar mensagem vazia', () => {
		expect(specialMessageSchema.safeParse('').success).toBe(false);
	});
});

describe('questionarioSchema completo', () => {
	it('deve aceitar um questionário completo e válido', () => {
		const resultado = questionarioSchema.safeParse({
			people: [
				{ name: 'Ana', traits: ['gentil'] },
				{ name: 'Bia', traits: ['engraçada'] }
			],
			photos: [],
			howTheyMet: 'Nos conhecemos na faculdade.',
			milestones: [{ title: 'Primeiro encontro', description: 'No parque.' }],
			insideJokes: ['pizza de sexta'],
			trips: [{ destination: 'Bariloche' }],
			challenges: ['distância'],
			futurePlans: ['morar juntos'],
			specialMessage: 'Amo vocês dois.'
		});

		expect(resultado.success).toBe(true);
	});

	it('deve rejeitar um questionário incompleto', () => {
		const resultado = questionarioSchema.safeParse({});
		expect(resultado.success).toBe(false);
	});
});
