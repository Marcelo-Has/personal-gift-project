import { error } from '@sveltejs/kit';
import { getAdminAuth } from './firebase-admin';

/**
 * Verificação de identidade do comprador (F1-05a2, issue #31).
 *
 * `firebase-admin.ts` já avisa: o Admin SDK ignora `firestore.rules`/`storage.rules`, então
 * toda rota que usa este módulo precisa checar autorização por conta própria. `requireUid` é
 * o mecanismo padrão daqui em diante.
 */

/**
 * Interface mínima do Admin Auth usada aqui — permite o teste injetar um dublê sem
 * credencial nem emulador, no mesmo padrão de `SignableBucket` em `signed-url.ts`.
 */
export interface VerifiableAuth {
	verifyIdToken(token: string): Promise<{ uid: string }>;
}

/**
 * Verifica o ID token com o Admin SDK e devolve o `uid`. Token ausente, expirado ou
 * adulterado devolve `null` — nunca lança — para quem chama decidir se a rota exige sessão.
 */
export async function verificarIdToken(
	token: string,
	auth: VerifiableAuth = getAdminAuth()
): Promise<string | null> {
	try {
		const { uid } = await auth.verifyIdToken(token);
		return uid;
	} catch {
		return null;
	}
}

/** Exige uma sessão válida; lança 401 (nunca 500) quando não há `uid`. */
export function requireUid(locals: App.Locals): string {
	if (!locals.uid) {
		error(401, 'Sessão inválida ou expirada.');
	}
	return locals.uid;
}
