import { describe, expect, it } from 'vitest';
import { homeContent } from './home-content';

describe('homeContent', () => {
	it('deve usar o nome "Nossa História" como título quando o conteúdo é definido', () => {
		expect(homeContent.title).toBe('Nossa História');
	});

	it('deve reproduzir fielmente a promessa do produto definida em PRODUCT.md', () => {
		expect(homeContent.promise).toBe(
			'Um pequeno livro sobre tudo aquilo que fez vocês virarem vocês.'
		);
	});

	it('deve explicar o fluxo questionário → estilo e tamanho → livro impresso', () => {
		expect(homeContent.flowIntro).toContain('questionário guiado');
		expect(homeContent.flowIntro).toContain('escolhe um estilo visual e um tamanho');
		expect(homeContent.flowIntro).toContain('livro físico impresso');
	});

	it('deve listar as três etapas do fluxo na ordem questionário, estilo/tamanho, livro', () => {
		expect(homeContent.steps).toHaveLength(3);
		expect(homeContent.steps[0].title).toBe('Responda o questionário');
		expect(homeContent.steps[1].title).toBe('Escolha estilo e tamanho');
		expect(homeContent.steps[2].title).toBe('Receba o livro impresso');
	});

	it('deve ter um único CTA apontando para o questionário', () => {
		expect(homeContent.ctaHref).toBe('/questionario');
		expect(homeContent.ctaLabel.length).toBeGreaterThan(0);
	});

	it('deve ter metadados de SEO não vazios para title e description', () => {
		expect(homeContent.pageTitle.length).toBeGreaterThan(0);
		expect(homeContent.pageDescription.length).toBeGreaterThan(0);
	});
});
