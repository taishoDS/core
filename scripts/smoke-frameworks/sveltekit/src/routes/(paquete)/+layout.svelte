<script>
  // El Core tal cual sale del paquete, sin `generate`: el tema y el CSS completos, y el JS con sus módulos.
  import '@taishods/core/css/tokens/taisho.css';
  import '@taishods/core/css/taisho.full.css';
  import { onMount } from 'svelte';
  let { children } = $props();
  onMount(() => {
    import('@taishods/core/core');
  });
</script>

<div class="ts flex flex-col items-start gap-base p-double">
  {@render children()}
</div>
