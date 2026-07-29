/**
 * Conteúdo da landing page da home ("Nossa História").
 *
 * Texto extraído fielmente de `docs/PRODUCT.md` (seções 1, 2 e 7) — nome, promessa
 * e fluxo do produto já foram decididos (D-002, ACEITA). Não inventar aqui novo
 * posicionamento, nome ou tom de narrativa: isso é Decision Gate ("Identidade
 * visual e narrativa", ver `docs/AUTONOMY.md`).
 */

export const homeContent = {
	pageTitle: 'Nossa História — um mini livro sobre o casal de vocês',
	pageDescription:
		'Um pequeno livro sobre tudo aquilo que fez vocês virarem vocês. Responda um questionário guiado, escolha um estilo visual e um tamanho, e receba um livro físico impresso.',
	title: 'Nossa História',
	promise: 'Um pequeno livro sobre tudo aquilo que fez vocês virarem vocês.',
	flowIntro:
		'Você responde a um questionário guiado, escolhe um estilo visual e um tamanho, e recebe um livro físico impresso, com narrativa única, ilustrações, polaroids, linha do tempo e uma carta final.',
	steps: [
		{
			title: 'Responda o questionário',
			description:
				'Conte nomes, fotos, como se conheceram, características de cada um, momentos importantes, piadas, viagens, dificuldades, planos futuros e uma mensagem especial.'
		},
		{
			title: 'Escolha estilo e tamanho',
			description: 'Escolha um estilo visual e um tamanho para o seu livro.'
		},
		{
			title: 'Receba o livro impresso',
			description: 'Seu livro é gerado e impresso, e chega até vocês.'
		}
	],
	audienceNote: 'Um presente afetivo para namoro, casamento ou Dia dos Namorados.',
	ctaLabel: 'Começar meu livro',
	ctaHref: '/questionario'
} as const;
