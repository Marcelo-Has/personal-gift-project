import { describe, expect, it } from 'vitest';
import { requireUid, verificarIdToken, type VerifiableAuth } from './auth';

/**
 * Auth falso: dependência externa (Admin SDK), então é ele que se mocka
 * (`.claude/rules/testing.md`) — sem `vi.mock()` de módulo interno.
 */
function fakeAuth(uidPorToken: Record<string, string> = { valido: 'uid-123' }): VerifiableAuth {
	return {
		async verifyIdToken(token) {
			const uid = uidPorToken[token];
			if (!uid) {
				throw new Error('Token inválido ou expirado');
			}
			return { uid };
		}
	};
}

describe('verificarIdToken', () => {
	it('deve devolver o uid quando o token é válido', async () => {
		const uid = await verificarIdToken('valido', fakeAuth());

		expect(uid).toBe('uid-123');
	});

	it('deve devolver null quando o token é inválido, sem lançar', async () => {
		const uid = await verificarIdToken('adulterado', fakeAuth());

		expect(uid).toBeNull();
	});

	it('deve devolver null quando o token está expirado, sem lançar', async () => {
		const auth: VerifiableAuth = {
			async verifyIdToken() {
				throw new Error('Firebase ID token has expired');
			}
		};

		const uid = await verificarIdToken('expirado', auth);

		expect(uid).toBeNull();
	});
});

describe('requireUid', () => {
	it('deve devolver o uid quando locals.uid está presente', () => {
		expect(requireUid({ uid: 'uid-123' })).toBe('uid-123');
	});

	it('deve lançar 401 quando locals.uid é null', () => {
		expect(() => requireUid({ uid: null })).toThrow();

		try {
			requireUid({ uid: null });
			throw new Error('deveria ter lançado');
		} catch (erro) {
			expect(erro).toMatchObject({ status: 401 });
		}
	});
});
