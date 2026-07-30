import { signInAnonymously, type Auth, type User } from 'firebase/auth';
import { getFirebaseAuth } from './client';

/**
 * Sessão anônima do comprador (F1-05a2, issue #31; decisão em `docs/DECISIONS.md` D-021).
 *
 * O `uid` desta sessão é o mesmo que sobrevive ao checkout (F1-07, `linkWithCredential`) —
 * é ele que vira dono em `firestore.rules` e prefixo `users/<uid>/` no Storage. Por isso o
 * ID token vai sempre no header `Authorization: Bearer <token>` das chamadas `fetch`, nunca
 * em cookie legível por JS.
 */

/** Garante uma sessão (cria uma anônima se ainda não houver) e devolve o usuário. */
export async function ensureAnonymousUser(auth: Auth = getFirebaseAuth()): Promise<User> {
	if (auth.currentUser) return auth.currentUser;
	const credential = await signInAnonymously(auth);
	return credential.user;
}

/** ID token pronto para o header `Authorization` das chamadas ao servidor. */
export async function getSessionIdToken(auth: Auth = getFirebaseAuth()): Promise<string> {
	const user = await ensureAnonymousUser(auth);
	return user.getIdToken();
}
