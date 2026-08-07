/**
 * Companheira de `poc-render-background.js` (PoC de [F2-07], issue #135): função síncrona
 * só para LER `_system/poc-f2-07-render` e devolver como JSON — o jeito de observar o
 * resultado de uma Background Function por HTTP (a chamada a ela mesma só devolve 202
 * imediato, sem o resultado).
 *
 * Não expõe dado de pedido: o documento lido é exclusivo da PoC (`_system/`, fora da
 * árvore `users/<uid>/orders/`), sem PII.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ADMIN_APP_NAME = 'personal-gift-admin-poc-f2-07';
const RESULT_DOC_PATH = '_system/poc-f2-07-render';

function getAdminFirestore() {
	const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
	const app =
		existing ??
		initializeApp(
			{
				credential: cert({
					projectId: process.env.FIREBASE_PROJECT_ID,
					clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
					privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
				})
			},
			ADMIN_APP_NAME
		);
	return getFirestore(app);
}

export const handler = async () => {
	try {
		const snap = await getAdminFirestore().doc(RESULT_DOC_PATH).get();
		return {
			statusCode: 200,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ exists: snap.exists, data: snap.exists ? snap.data() : null })
		};
	} catch (erro) {
		return {
			statusCode: 500,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				exists: false,
				// Identificador do projeto, não credencial (mesma justificativa de
				// SECRETS_SCAN_OMIT_KEYS em netlify.toml / D-028): sem ele, um `5 NOT_FOUND`
				// vazio do Firestore não diz CONTRA QUAL projeto a function está falando, e
				// cada hipótese custa um ciclo de deploy + invocação manual.
				projectId: process.env.FIREBASE_PROJECT_ID ?? null,
				errorMessage: erro instanceof Error ? erro.message : String(erro)
			})
		};
	}
};
