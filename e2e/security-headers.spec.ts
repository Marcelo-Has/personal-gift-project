import { expect, test } from '@playwright/test';

test('deve incluir os cabeçalhos de segurança quando a home responde', async ({ page }) => {
	const response = await page.goto('/');
	expect(response).not.toBeNull();

	const headers = response!.headers();

	expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
	expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
	expect(headers['cross-origin-resource-policy']).toBe('same-origin');
});

test('deve incluir uma Content-Security-Policy restritiva quando a home responde', async ({
	page
}) => {
	const response = await page.goto('/');
	expect(response).not.toBeNull();

	const csp = response!.headers()['content-security-policy'];
	expect(csp).toBeTruthy();
	expect(csp).toContain("default-src 'self'");
	expect(csp).toContain("object-src 'none'");
	expect(csp).toContain("frame-ancestors 'none'");
});
