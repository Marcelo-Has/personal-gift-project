import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		// Valores de mentira, só para `readConfig()` em `src/lib/firebase/client.ts` não lançar
		// "Configuração do Firebase incompleta" no E2E. NÃO são segredo e não apontam para
		// projeto nenhum: o SDK cliente expõe esses campos no bundle por design, e quem protege
		// o dado são as regras do Firebase. Nos testes que exercitam a etapa de fotos, a rede do
		// Firebase é interceptada com `page.route(...)` — nada sai do runner (F1-05b, issue #32).
		env: {
			PUBLIC_FIREBASE_API_KEY: 'chave-de-teste-e2e',
			PUBLIC_FIREBASE_AUTH_DOMAIN: 'teste-e2e.firebaseapp.com',
			PUBLIC_FIREBASE_PROJECT_ID: 'teste-e2e',
			PUBLIC_FIREBASE_STORAGE_BUCKET: 'teste-e2e.appspot.com',
			PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
			PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000'
		}
	},
	testDir: 'e2e',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
});
