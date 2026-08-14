import { describe, expect, it } from 'vitest';
import { homeContent } from './home-content';

// A tabela "O que este produto NUNCA diz" da §9 do `DESIGN.md` é checklist de reprovação —
// nenhuma dessas palavras, nem "nós"/"nossa plataforma"/"nosso sistema", pode aparecer em
// nenhum texto voltado ao comprador.
const PROIBIDAS =
	/\b(nós|nossa plataforma|nosso sistema|jornada|experiência única|eternize|surpreenda quem você ama|momentos inesquecíveis|feito com inteligência artificial)\b/i;

function textosVoltadosAoComprador(): string[] {
	return [
		homeContent.pageTitle,
		homeContent.pageDescription,
		homeContent.ctaLabel,
		homeContent.sistemaPrecoPrazo,
		homeContent.hero.promise,
		homeContent.hero.lead,
		homeContent.hero.fotoAusente,
		homeContent.impresso.heading,
		homeContent.impresso.intro,
		homeContent.impresso.excerptNote,
		homeContent.cincoMinutos.heading,
		...homeContent.cincoMinutos.steps.flatMap((passo) => [passo.title, passo.description]),
		homeContent.precoPrazo.heading,
		homeContent.precoPrazo.texto,
		homeContent.quemEscreve.heading,
		homeContent.quemEscreve.texto,
		homeContent.prova.heading,
		homeContent.prova.texto,
		homeContent.fechamento.heading,
		homeContent.fechamento.texto
	];
}

describe('homeContent', () => {
	it('deve ter a promessa da primeira dobra (LCP, §6) definida', () => {
		expect(homeContent.hero.promise.length).toBeGreaterThan(0);
	});

	it('deve ter as 7 seções da §6 com conteúdo não vazio', () => {
		expect(homeContent.hero.promise.length).toBeGreaterThan(0);
		expect(homeContent.impresso.excerpt.length).toBeGreaterThan(0);
		expect(homeContent.cincoMinutos.steps).toHaveLength(3);
		expect(homeContent.precoPrazo.texto.length).toBeGreaterThan(0);
		expect(homeContent.quemEscreve.texto.length).toBeGreaterThan(0);
		expect(homeContent.prova.texto.length).toBeGreaterThan(0);
		expect(homeContent.fechamento.texto.length).toBeGreaterThan(0);
	});

	it('deve manter o preço na faixa registrada em PRODUCT.md §8.2 (R$80–130), sem número exato', () => {
		expect(homeContent.precoPrazo.texto).toContain('R$80');
		expect(homeContent.precoPrazo.texto).toContain('R$130');
		// D-101 (preço exato) e D-104 (prazo) são decisões pendentes — o texto precisa dizer isso.
		expect(homeContent.precoPrazo.texto).toMatch(/ainda est(ão|á)/);
	});

	it('deve entregar a seção 6 (Prova) vazia e marcada, sem depoimento nem número', () => {
		expect(homeContent.prova.texto).not.toMatch(/\d+%|\d+x\b/i);
		expect(homeContent.prova.texto.toLowerCase()).toContain('ainda não existe');
	});

	it('deve ter um único CTA, com o mesmo rótulo usado nas seções 1 e 7, apontando para o questionário', () => {
		expect(homeContent.ctaHref).toBe('/questionario');
		expect(homeContent.ctaLabel.length).toBeGreaterThan(0);
	});

	it('deve ter metadados de SEO não vazios para title e description', () => {
		expect(homeContent.pageTitle.length).toBeGreaterThan(0);
		expect(homeContent.pageDescription.length).toBeGreaterThan(0);
	});

	it('nunca deve usar "nós"/"nossa plataforma" nem qualquer item da tabela "NUNCA diz" (§9)', () => {
		for (const texto of textosVoltadosAoComprador()) {
			expect(texto, `"${texto}" contém termo proibido pela §9`).not.toMatch(PROIBIDAS);
		}
	});

	it('nunca deve usar exclamação nem travessão como pontuação de interface (anti-pattern 69)', () => {
		for (const texto of textosVoltadosAoComprador()) {
			expect(texto, `"${texto}" usa exclamação`).not.toContain('!');
			expect(texto, `"${texto}" usa travessão`).not.toContain('—');
		}
	});
});
