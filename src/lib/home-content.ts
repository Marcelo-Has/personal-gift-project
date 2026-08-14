/**
 * Conteúdo da landing page (`/`) — as 7 seções da §6 do `DESIGN.md`, na voz da §9.
 *
 * Posicionamento/nome/tom são Decision Gate e continuam sendo ([D-080]); o que muda aqui é
 * REDAÇÃO dentro do tom já aprovado — não posicionamento novo. Preço e prazo seguem a faixa
 * registrada em `docs/PRODUCT.md` §8.2 (R$80–130); o valor exato por tamanho (D-101) e o prazo
 * (D-104) são decisões PENDENTES — o texto abaixo é honesto sobre isso, nunca inventa um número.
 */

export const homeContent = {
	pageTitle: 'Nossa História — o livro sobre a história de vocês, em cinco minutos',
	pageDescription:
		'Você escreve como se conheceram, as fotos e as piadas de vocês. Em cinco minutos, tudo vira um livro impresso pronto para presentear.',

	ctaLabel: 'Começar o meu livro',
	ctaHref: '/questionario',

	/** Voz do sistema da home — vive na `.margem` (§3), nunca na `.folha`. */
	sistemaPrecoPrazo:
		'R$80 a R$130 · o valor do seu tamanho e o prazo de entrega ainda estão sendo definidos',

	hero: {
		promise: 'Você já tem a história de vocês. Em cinco minutos, ela vira um livro.',
		lead: 'Você escreve como se conheceram, as fotos e as piadas de vocês, e o livro sai pronto para presentear.',
		fotoAusente:
			'A foto de um livro impresso ainda não existe para mostrar aqui. Assim que o primeiro exemplar sair da gráfica, ela aparece.'
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
