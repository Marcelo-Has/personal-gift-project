import { readFileSync } from 'node:fs';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Testes de `firestore.rules` contra o Firebase Emulator (F1-04, issue #22).
 *
 * Provam o baseline de `.claude/rules/security.md`: cada usuário só acessa os
 * próprios dados, nada é público, e coleção não mapeada nasce fechada. Rodam sem
 * projeto Firebase real nem custo — ver `npm run test:rules`.
 */

const PROJECT_ID = 'demo-personal-gift';
const ALICE = 'uid-alice';
const BOB = 'uid-bob';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		firestore: { rules: readFileSync('firestore.rules', 'utf8') }
	});
});

afterAll(async () => {
	await testEnv?.cleanup();
});

beforeEach(async () => {
	await testEnv.clearFirestore();

	// Semeia dados das duas pessoas ignorando as regras, para que as negações
	// abaixo sejam de autorização e não de "documento não existe".
	await testEnv.withSecurityRulesDisabled(async (ctx) => {
		const db = ctx.firestore();
		await setDoc(doc(db, `users/${ALICE}`), { nome: 'Alice' });
		await setDoc(doc(db, `users/${BOB}`), { nome: 'Bob' });
		await setDoc(doc(db, `users/${ALICE}/orders/pedido-1`), { status: 'pago', total: 12900 });
		await setDoc(doc(db, `users/${BOB}/orders/pedido-2`), { status: 'pago', total: 9900 });
	});
});

describe('firestore.rules — perfil do usuário', () => {
	it('deve permitir que o dono leia e escreva o próprio perfil quando está autenticado', async () => {
		const db = testEnv.authenticatedContext(ALICE).firestore();

		await assertSucceeds(getDoc(doc(db, `users/${ALICE}`)));
		await assertSucceeds(setDoc(doc(db, `users/${ALICE}`), { nome: 'Alice N.' }));
	});

	it('deve negar leitura do perfil de outro usuário quando o pedido vem de terceiro', async () => {
		const db = testEnv.authenticatedContext(BOB).firestore();

		await assertFails(getDoc(doc(db, `users/${ALICE}`)));
	});

	it('deve negar escrita no perfil de outro usuário quando o pedido vem de terceiro', async () => {
		const db = testEnv.authenticatedContext(BOB).firestore();

		await assertFails(setDoc(doc(db, `users/${ALICE}`), { nome: 'invadido' }));
	});

	it('deve negar leitura e escrita quando o usuário não está autenticado', async () => {
		const db = testEnv.unauthenticatedContext().firestore();

		await assertFails(getDoc(doc(db, `users/${ALICE}`)));
		await assertFails(setDoc(doc(db, `users/${ALICE}`), { nome: 'anônimo' }));
	});
});

describe('firestore.rules — pedidos', () => {
	it('deve permitir que o dono leia o próprio pedido quando está autenticado', async () => {
		const db = testEnv.authenticatedContext(ALICE).firestore();

		await assertSucceeds(getDoc(doc(db, `users/${ALICE}/orders/pedido-1`)));
	});

	it('deve negar leitura do pedido de outro usuário quando o pedido vem de terceiro', async () => {
		const db = testEnv.authenticatedContext(BOB).firestore();

		await assertFails(getDoc(doc(db, `users/${ALICE}/orders/pedido-1`)));
	});

	it('deve negar escrita no próprio pedido quando vem do cliente, e não do servidor', async () => {
		const db = testEnv.authenticatedContext(ALICE).firestore();

		await assertFails(
			setDoc(doc(db, `users/${ALICE}/orders/pedido-1`), { status: 'pago', total: 1 })
		);
	});

	it('deve negar leitura de pedido quando o usuário não está autenticado', async () => {
		const db = testEnv.unauthenticatedContext().firestore();

		await assertFails(getDoc(doc(db, `users/${ALICE}/orders/pedido-1`)));
	});
});

describe('firestore.rules — default de negar tudo', () => {
	it('deve negar acesso a uma coleção não mapeada mesmo com usuário autenticado', async () => {
		const db = testEnv.authenticatedContext(ALICE).firestore();

		await assertFails(getDoc(doc(db, 'admin/config')));
		await assertFails(setDoc(doc(db, 'admin/config'), { qualquer: true }));
		await assertFails(getDoc(doc(db, 'orders/pedido-solto')));
	});
});
