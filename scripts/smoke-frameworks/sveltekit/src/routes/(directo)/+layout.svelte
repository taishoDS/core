<script>
  // El camino ingenuo: un import estático arriba de todo. El layout también se evalúa en el servidor
  // al renderizar, y el Core toca `document` al cargarse.
  import '../../../taisho/taisho.core.js';
  import Estilos from '../../lib/estilos-generados.svelte';
  let { children } = $props();
</script>

<Estilos>{@render children()}</Estilos>
