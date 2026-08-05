/**
 * Helpers compartilhados entre os módulos de render de PDF de produção
 * (`generation-engine/pdf/`) — mecanismo escolhido em [D-062], usado pela primeira vez em
 * `render-dedicatoria.ts` (F2-08a, issue #125) e extraído aqui no segundo e terceiro uso
 * concreto (`render-carta.ts`, `render-timeline.ts`, F2-08b1, issue #127), conforme
 * `.claude/rules/right-sizing.md` (só extrair abstração compartilhada com pelo menos dois
 * usos reais).
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);

/** Família de fonte usada em todo render de PDF de produção — Lora (Google Fonts, SIL OFL 1.1). */
export const FONT_FAMILY = 'Lora';

/** Lê o arquivo woff2 do pacote `@fontsource/lora` e devolve o conteúdo em base64, para
 * incorporar como data URI no `@font-face` — sem depender de fonte instalada no SO. */
export function loadFontBase64(): string {
	const fontPath = require.resolve('@fontsource/lora/files/lora-latin-400-normal.woff2');
	return readFileSync(fontPath).toString('base64');
}

/** Escapa texto antes de embuti-lo em HTML — o texto vem de skills de narrativa (saída de
 * LLM) e pode conter caracteres especiais de HTML. */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Renderiza um documento HTML já pronto (com `@page { size }` definindo a dimensão física
 * da página de produção) para PDF, usando o Chrome instalado no ambiente
 * (`playwright-core`, `channel: 'chrome'`) — mesmo mecanismo de [D-062]. Lança e fecha um
 * processo de browser por chamada; não é livre de efeito colateral, mas é determinística
 * do lado do conteúdo (mesmo HTML de entrada → mesmo texto/geometria de saída).
 */
export async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
	// No `ubuntu-latest` (24.04) do GitHub Actions o AppArmor restringe user namespaces
	// sem privilégio por padrão, o que quebra o sandbox do Chrome do sistema (diferente do
	// Chromium empacotado pelo Playwright, que já vem ajustado para isso) — o launch trava
	// em vez de lançar um erro claro (actions/runner-images#9491). `--no-sandbox` só entra
	// em CI: o HTML renderizado aqui é sempre gerado pelos módulos deste diretório (texto
	// escapado, sem recurso externo, sem navegação para conteúdo de terceiros), então o
	// risco que o sandbox do Chrome mitiga (execução de conteúdo remoto não confiável) não
	// se aplica. Em produção o sandbox continua ativo.
	const launchArgs = process.env.CI ? ['--no-sandbox'] : [];
	const browser = await chromium.launch({ channel: 'chrome', args: launchArgs });
	try {
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: 'load' });
		const pdfBuffer = await page.pdf({ printBackground: true, preferCSSPageSize: true });
		return new Uint8Array(pdfBuffer);
	} finally {
		await browser.close();
	}
}
