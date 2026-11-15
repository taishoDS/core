<script>
  // El Core como lo deja `taisho generate`: taisho/{fonts,theme,taisho}.css
  import '../../taisho/fonts.css';
  import '../../taisho/theme.css';
  import '../../taisho/taisho.css';
  let { children } = $props();
</script>

<div class="ts flex flex-col items-start gap-base p-double">
  {@render children()}
</div>
