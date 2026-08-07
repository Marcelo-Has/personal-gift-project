import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Firebase Admin SDK — operações privilegiadas do servidor (F1-04, issue #22).
 *
 * Mora em `src/lib/server/` de propósito: o SvelteKit **recusa o build** se algum
 * módulo de cliente importar daqui. É a garantia mecânica de que a chave privada
 * da service account nunca entra no bundle do navegador — mais forte que uma
 * convenção de nome.
 *
 * Credenciais nunca commitadas. Lê de `process.env` direto (F2-07/D-067, não mais
 * `$env/dynamic/private`): este módulo também é importado pelo worker de geração
 * (`worker/`, [D-069]), que roda em container fora do build do Vite/SvelteKit, onde o
 * alias `$env` não resolve (mesmo motivo de `claude.ts`/`openai-image.ts`) —
 * `$env/dynamic/private` já era um wrapper de `process.env` em runtime nos adapters
 * Node, então o valor lido não muda. A guarda de "nunca entra no bundle do
 * navegador" continua sendo o caminho `src/lib/server/`, não o alias `$env`.
 *
 * Atenção: o Admin SDK **ignora** `firestore.rules`/`storage.rules`. Toda rota que
 * usar este módulo precisa checar autorização por conta própria (o dono do dado é
 * quem pede) antes de tocar em qualquer documento ou arquivo.
 */
const ADMIN_APP_NAME = 'personal-gift-admin';

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`Variável de ambiente ${name} ausente: o Firebase Admin não pode ser inicializado. Ver .env.example.`
		);
	}
	return value;
}

/**
 * Credencial do Admin SDK, nas duas formas que este projeto usa:
 *
 * - **Chave explícita** (`FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`): como o app
 *   SvelteKit roda na Netlify, que não tem identidade do Google, lá não há alternativa.
 * - **Application Default Credentials**: no worker de geração (Cloud Run, [D-069]) a
 *   identidade vem da service account ANEXADA ao serviço, injetada pela plataforma. Não
 *   precisa — e não deve — existir chave privada em variável de ambiente ali: chave de
 *   longa duração é passivo permanente, e a identidade anexada não vaza nem expira.
 *
 * A escolha é pela presença das variáveis, não por uma flag: se a chave está configurada,
 * usa a chave; se não está, usa a identidade do ambiente. Isso mantém o comportamento
 * atual do app intacto e faz o worker funcionar sem nenhum `if (isCloudRun)`.
 *
 * Sem teste dedicado de propósito: cobrir esta função exigiria exportá-la só para isso,
 * alargando a superfície do módulo por uma checagem de três linhas cujo comportamento é
 * verificável por leitura (achado M-1 da revisão de segurança da PR #150).
 */
function resolveCredential() {
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY;

	// Meia configuração é sempre engano, nunca intenção — e o engano é plausível: rotação de
	// chave, deploy-preview sem herdar as variáveis, `FIREBASE_PRIVATE_KEY` que virou string
	// vazia. Sem esta guarda, o app "inicializa com sucesso" e cai em ADC, que na Netlify não
	// acha credencial nenhuma: a falha reaparece depois, dispersa, como erro opaco de SDK no
	// meio de um pedido, em vez de erro nomeado no arranque. As duas juntas ou nenhuma.
	if (Boolean(clientEmail) !== Boolean(privateKey)) {
		throw new Error(
			'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY devem estar ambas definidas ou ambas ausentes: ' +
				'meia configuração de credencial não degrada para Application Default Credentials. Ver .env.example.'
		);
	}

	if (!clientEmail || !privateKey) {
		return applicationDefault();
	}

	return cert({
		projectId: requireEnv('FIREBASE_PROJECT_ID'),
		clientEmail,
		// Chave PEM não sobrevive a uma variável de ambiente de uma linha:
		// o padrão é guardá-la com `\n` escapado e desescapar aqui.
		privateKey: privateKey.replace(/\\n/g, '\n')
	});
}

export function getAdminApp(): App {
	const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
	if (existing) return existing as App;

	return initializeApp(
		{
			credential: resolveCredential(),
			projectId: requireEnv('FIREBASE_PROJECT_ID'),
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
