import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from './rate-limit';

const AGORA = new Date('2026-07-31T12:00:00Z');

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(AGORA);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('checkRateLimit', () => {
	it('deve permitir requisições dentro do limite quando a janela não estourou', () => {
		const chave = 'uid-dentro-do-limite';
		const opcoes = { windowMs: 60_000, maxRequests: 3 };

		expect(checkRateLimit(chave, opcoes)).toBe(true);
		expect(checkRateLimit(chave, opcoes)).toBe(true);
		expect(checkRateLimit(chave, opcoes)).toBe(true);
	});

	it('deve bloquear a requisição quando o número de chamadas passa do limite na janela', () => {
		const chave = 'uid-acima-do-limite';
		const opcoes = { windowMs: 60_000, maxRequests: 2 };

		expect(checkRateLimit(chave, opcoes)).toBe(true);
		expect(checkRateLimit(chave, opcoes)).toBe(true);
		expect(checkRateLimit(chave, opcoes)).toBe(false);
	});

	it('deve liberar novamente depois que a janela desliza para além das chamadas antigas', () => {
		const chave = 'uid-libera-apos-janela';
		const opcoes = { windowMs: 60_000, maxRequests: 1 };

		expect(checkRateLimit(chave, opcoes)).toBe(true);
		expect(checkRateLimit(chave, opcoes)).toBe(false);

		vi.setSystemTime(new Date(AGORA.getTime() + 60_001));

		expect(checkRateLimit(chave, opcoes)).toBe(true);
	});

	it('deve manter contadores independentes para chaves diferentes', () => {
		const opcoes = { windowMs: 60_000, maxRequests: 1 };

		expect(checkRateLimit('uid-a', opcoes)).toBe(true);
		expect(checkRateLimit('uid-b', opcoes)).toBe(true);
		expect(checkRateLimit('uid-a', opcoes)).toBe(false);
	});
});
