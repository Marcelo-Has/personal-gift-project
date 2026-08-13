<script lang="ts">
	// A camada de tokens do `DESIGN.md` (§4/§5), global e única. Importada no layout raiz porque
	// é o único ponto por onde TODA rota passa: token que não chega a uma rota vira `var()` sem
	// valor, e `var()` sem valor é o pior modo de falha possível — silencioso e só no render.
	import '$lib/styles/tokens.css';

	let { children } = $props();
</script>

{@render children()}
