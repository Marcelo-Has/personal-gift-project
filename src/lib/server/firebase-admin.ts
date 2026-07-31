import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from '$env/dynamic/private';

/**
 * Firebase Admin SDK — operações privilegiadas do servidor (F1-04, issue #22).
 *
 * Mora em `src/lib/server/` de propósito: o SvelteKit **recusa o build** se algum
 * módulo de cliente importar daqui. É a garantia mecânica de que a chave privada
 * da service account nunca entra no bundle do navegador — mais forte que uma
 * convenção de nome.
 *
 * Credenciais só por variável de ambiente (ver `.env.example`); nada commitado.
 * O `$env/dynamic/private` (em vez do estático) evita que `npm run build` exija
 * as variáveis existirem — ver a explicação em `src/lib/firebase/client.ts`.
 *
 * Atenção: o Admin SDK **ignora** `firestore.rules`/`storage.rules`. Toda rota que
 * usar este módulo precisa checar autorização por conta própria (o dono do dado é
 * quem pede) antes de tocar em qualquer documento ou arquivo.
 */
const ADMIN_APP_NAME = 'personal-gift-admin';

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(
			`Variável de ambiente ${name} ausente: o Firebase Admin não pode ser inicializado. Ver .env.example.`
		);
	}
	return value;
}

export function getAdminApp(): App {
	const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
	if (existing) return existing as App;

	return initializeApp(
		{
			credential: cert({
				projectId: requireEnv('FIREBASE_PROJECT_ID'),
				clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
				// Chave PEM não sobrevive a uma variável de ambiente de uma linha:
				// o padrão é guardá-la com `\n` escapado e desescapar aqui.
				privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n')
			}),
			storageBucket: requireEnv('FIREBASE_STORAGE_BUCKET')
		},
		ADMIN_APP_NAME
	);
}

/** Bucket onde ficam as fotos enviadas pelo casal. Fechado por `storage.rules`. */
export function getPhotoBucket() {
	return getStorage(getAdminApp()).bucket();
}

/** Verificação de ID token da sessão anônima (F1-05a2, issue #31). */
export function getAdminAuth() {
	return getAuth(getAdminApp());
}

/** Firestore do servidor — rascunho de pedido (F1-05c, issue #33). Fechado por `firestore.rules`. */
export function getAdminFirestore() {
	return getFirestore(getAdminApp());
}
