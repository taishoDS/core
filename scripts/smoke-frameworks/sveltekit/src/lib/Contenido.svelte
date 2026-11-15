<script>
  import modal from '../modal.html?raw';
  import select from '../select.html?raw';
  let { titulo, enlace, texto } = $props();
</script>

<h1 class="ts type-heading-36">{titulo}</h1>
<a href={enlace} class="ts link" id="ir-otra">{texto}</a>
<!-- eslint-disable svelte/no-at-html-tags -- son los fragmentos de prueba del repo, no entrada de personas -->
{@html modal}
{@html select}
