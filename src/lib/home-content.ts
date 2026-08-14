/**
 * Conteúdo da landing page (`/`) — as 7 seções da §6 do `DESIGN.md`, na voz da §9.
 *
 * Posicionamento/nome/tom são Decision Gate e continuam sendo ([D-080]); o que muda aqui é
 * REDAÇÃO dentro do tom já aprovado — não posicionamento novo. Preço e prazo seguem a faixa
 * registrada em `docs/PRODUCT.md` §8.2 (R$80–130); o valor exato por tamanho (D-101) e o prazo
 * (D-104) são decisões PENDENTES — o texto abaixo é honesto sobre isso, nunca inventa um número.
 */

export const homeContent = {
	pageTitle: 'Nossa História: o livro sobre a história de vocês, em cinco minutos',
	pageDescription:
		'Você escreve como se conheceram, as fotos e as piadas de vocês. Em cinco minutos, tudo vira um livro impresso pronto para presentear.',

	ctaLabel: 'Começar o meu livro',
	ctaHref: '/questionario',

	/**
	 * Voz do sistema da home — vive na `.margem` (§3), nunca na `.folha`. É o RÓTULO do wireframe
	 * da §6 ("quanto custa · quando chega"), não o valor: o valor (a faixa R$80–130 e a pendência
	 * honesta) já mora na seção 4, à direita da régua. Rótulo é o que cabe nos 64px da `.margem` —
	 * o texto completo do valor não cabia (achado do dono na rodada 5 do PR #178).
	 */
	sistemaPrecoPrazo: 'quanto custa · quando chega',

	hero: {
		promise: 'Você já tem a história de vocês. Em cinco minutos, ela vira um livro.',
		lead: 'Você escreve como se conheceram, as fotos e as piadas de vocês, e o livro sai pronto para presentear.'
	},

	impresso: {
		heading: 'O que está impresso',
		intro:
			'Não é uma foto aplicada num objeto: é um texto escrito sobre vocês dois, do jeito que só quem viveu a história contaria.',
		excerpt:
			'Foi num sábado qualquer, numa sala cheia de gente querendo aprender fotografia, que Marina e Rafael se sentaram lado a lado. Depois da aula, foram tomar sorvete e a conversa esticou até o parque fechar, e não parou mais.',
		excerptNote:
			'Página de exemplo, gerada pelo produto com nomes fictícios. Ainda não existe um livro real impresso para fotografar.'
	},

	cincoMinutos: {
		heading: 'Em cinco minutos',
		steps: [
			{
				title: 'Você responde o questionário',
				description: 'Nomes, fotos, como se conheceram, piadas, viagens e uma mensagem especial.'
			},
			{
				title: 'Você escolhe estilo e tamanho',
				description: 'Um estilo visual e um tamanho para o livro impresso.'
			},
			{
				title: 'Você vê a prévia e paga',
				description: 'O livro é montado na hora; você confere antes de fechar.'
			}
		]
	},

	precoPrazo: {
		heading: 'Quanto custa e quando chega',
		texto:
			'O livro custa entre R$80 e R$130, dependendo do tamanho. O valor exato de cada tamanho e o prazo de impressão e envio ainda estão sendo fechados: você vê os dois, com clareza, antes de pagar.'
	},

	quemEscreve: {
		heading: 'Quem escreve é você',
		texto:
			'Você responde o questionário com o que só vocês dois sabem. A narrativa é montada a partir das suas respostas, e a impressão é automática, mas antes de fechar a compra você vê a prévia do livro inteiro.'
	},

	prova: {
		heading: 'Prova',
		texto:
			'Ainda não existe avaliação de cliente real para mostrar aqui: o produto acabou de nascer. Assim que os primeiros livros chegarem às mãos de quem comprou, esta seção passa a mostrá-las.'
	},

	fechamento: {
		heading: 'O primeiro passo é escrever',
		texto: 'Não precisa ter tudo pronto agora: você preenche o que souber e continua quando quiser.'
	}
} as const;
