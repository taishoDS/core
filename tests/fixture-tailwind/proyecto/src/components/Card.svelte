<script>
	import clsx from 'clsx';
	let { activa = false, tono = 'info' } = $props();
	const tonos = { info: 'bg-blue-500 text-white', aviso: 'bg-yellow-500 text-gray-900' };
</script>

<article class={clsx('rounded-lg p-4 shadow-sm', activa && 'ring-2 ring-brand-500', tonos[tono])}>
	<h2 class="text-lg font-semibold text-gray-900">Tarjeta</h2>
	<button type="button" class="px-3 py-1 hover:bg-gray-100" class:opacity-50={!activa}>Abrir</button>
	<div class:hidden={activa}>Oculto</div>
	<div class="@container">
		<p class="@md:flex text-base">Contenedor</p>
	</div>
</article>

<style>
	article { border-radius: 4px; }
</style>
