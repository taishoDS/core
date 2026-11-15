<script>
  // El JS del Core toca `document` al cargarse: se importa dentro de `onMount`, que corre sólo en el navegador.
  // Se auto-inicializa y usa delegación de eventos, así que sirve para todas las páginas que se navegan después.
  import { onMount } from 'svelte';
  import Estilos from '../../lib/estilos-generados.svelte';
  let { children } = $props();
  onMount(() => {
    import('../../../taisho/taisho.core.js');
  });
</script>

<Estilos>{@render children()}</Estilos>
