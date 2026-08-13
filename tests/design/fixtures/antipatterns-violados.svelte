<script lang="ts">
	let aberto = $state(false);
</script>

<section class="hero">
	<h1>Bem-vindo à sua jornada</h1>
	<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
	<p>Escrito por João Silva — usuario@email.com</p>
	<p>Revolucione a forma como você presenteia. Role para explorar.</p>
	<button type="button" onclick={() => (aberto = !aberto)}>Comece agora</button>
	<ol><li>Etapa 1</li><li>Etapa 2</li></ol>
	<img src="/x.png" alt="imagem" />
</section>

<style>
	.hero {
		height: 100vh;
		background: linear-gradient(135deg, #7c3aed, #22d3ee);
		backdrop-filter: blur(12px);
		border-radius: 32px;
		box-shadow: 0 1px 2px #111, 0 4px 8px #222, 0 16px 32px #333;
		font-family: Inter, sans-serif;
		color: #000;
		cursor: url('/cursor.png'), auto;
		transition: width 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.hero h1 {
		background-clip: text;
	}

	.hero button:focus {
		outline: none;
	}
</style>
