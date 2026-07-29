import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { env } from '$env/dynamic/public';

/**
 * Configuração do Firebase para o SDK **cliente** (F1-04, issue #22).
 *
 * Nada é hardcoded: tudo vem de variáveis `PUBLIC_FIREBASE_*` (ver `.env.example`).
 * Esses valores não são segredo — o SDK cliente os expõe no bundle por design, e
 * quem protege os dados são as regras de `firestore.rules`/`storage.rules`. O que
 * NÃO pode aparecer aqui é credencial de servidor: essa vive em `$lib/server/`,
 * onde o SvelteKit proíbe import a partir de código de cliente.
 *
 * Usamos `$env/dynamic/public` e não `$env/static/public` por um motivo concreto:
 * a variante estática é resolvida em tempo de build e o build QUEBRA se a variável
 * não existir. Como ainda não há projeto Firebase criado (passo humano, fora do
 * escopo desta issue), `npm run build` no CI ficaria vermelho sem nenhum ganho de
 * segurança. A dinâmica lê no runtime e falha com mensagem clara só quando o app
 * realmente tenta usar o Firebase. Migrar para a estática é trivial depois que as
 * variáveis existirem no ambiente — a única contrapartida é que a dinâmica não
 * funciona em rota pré-renderizada (hoje não há nenhuma).
 */
function readConfig() {
	const config = {
		apiKey: env.PUBLIC_FIREBASE_API_KEY,
		authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId: env.PUBLIC_FIREBASE_APP_ID
	};

	const missing = Object.entries(config)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		throw new Error(
			`Configuração do Firebase incompleta: faltam as variáveis PUBLIC_FIREBASE_* para ${missing.join(', ')}. Ver .env.example.`
		);
	}

	return config as Required<typeof config>;
}

/** App do Firebase, criado sob demanda e reaproveitado (HMR reexecuta o módulo). */
export function getFirebaseApp(): FirebaseApp {
	return getApps().length > 0 ? getApp() : initializeApp(readConfig());
}

export function getFirebaseAuth(): Auth {
	return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore(): Firestore {
	return getFirestore(getFirebaseApp());
}
