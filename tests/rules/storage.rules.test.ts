import { readFileSync } from 'node:fs';
import {
	assertFails,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Testes de `storage.rules` contra o Firebase Emulator (F1-04, issue #22).
 *
 * O que provam: o bucket é inalcançável pelo SDK cliente — anônimo, terceiro E
 * dono. As fotos só chegam ao usuário por URL assinada gerada no servidor
 * (`src/lib/server/signed-url.ts`), que passa pelo Google Cloud Storage e não
 * por estas regras. Um teste "dono consegue ler" aqui seria justamente o
 * vazamento que `.claude/rules/security.md` proíbe.
 */

const PROJECT_ID = 'demo-personal-gift';
const ALICE = 'uid-alice';
const BOB = 'uid-bob';
const FOTO_DA_ALICE = `users/${ALICE}/orders/pedido-1/photos/foto-1`;
const CONTEUDO = new Uint8Array([137, 80, 78, 71]);

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		storage: { rules: readFileSync('storage.rules', 'utf8') }
	});
});

afterAll(async () => {
	await testEnv?.cleanup();
});

beforeEach(async () => {
	await testEnv.clearStorage();

	// Objeto real no bucket: assim as negações abaixo são de autorização, e não
	// simplesmente "arquivo não existe".
	await testEnv.withSecurityRulesDisabled(async (ctx) => {
		await uploadBytes(ref(ctx.storage(), FOTO_DA_ALICE), CONTEUDO, { contentType: 'image/png' });
	});
});

describe('storage.rules — leitura', () => {
	it('deve negar leitura anônima de uma foto existente quando não há autenticação', async () => {
		const storage = testEnv.unauthenticatedContext().storage();

		await assertFails(getBytes(ref(storage, FOTO_DA_ALICE)));
	});

	it('deve negar leitura da foto de outro usuário quando o pedido vem de terceiro', async () => {
		const storage = testEnv.authenticatedContext(BOB).storage();

		await assertFails(getBytes(ref(storage, FOTO_DA_ALICE)));
	});

	it('deve negar leitura direta mesmo para o dono, que só acessa por URL assinada', async () => {
		const storage = testEnv.authenticatedContext(ALICE).storage();

		await assertFails(getBytes(ref(storage, FOTO_DA_ALICE)));
	});
});

describe('storage.rules — escrita', () => {
	it('deve negar upload direto do dono, que precisa passar pela URL assinada do servidor', async () => {
		const storage = testEnv.authenticatedContext(ALICE).storage();

		await assertFails(
			uploadBytes(ref(storage, `users/${ALICE}/orders/pedido-1/photos/nova`), CONTEUDO)
		);
	});

	it('deve negar escrita na pasta de outro usuário quando o pedido vem de terceiro', async () => {
		const storage = testEnv.authenticatedContext(BOB).storage();

		await assertFails(uploadBytes(ref(storage, FOTO_DA_ALICE), CONTEUDO));
	});

	it('deve negar escrita anônima em qualquer caminho quando não há autenticação', async () => {
		const storage = testEnv.unauthenticatedContext().storage();

		await assertFails(uploadBytes(ref(storage, 'publico/qualquer-coisa'), CONTEUDO));
	});
});
