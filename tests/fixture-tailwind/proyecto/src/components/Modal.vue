<script setup lang="ts">
defineProps<{ abierto: boolean }>();
</script>

<template>
	<div :class="['fixed inset-0 flex items-center justify-center', abierto ? 'opacity-100' : 'opacity-0']">
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
			<h2 :class="{ 'text-xl font-bold': abierto }">Título</h2>
			<input type="hidden" name="id" value="1" />
			<button class="mt-4 rounded bg-brand-500 px-4 py-2 text-white" type="button">Cerrar</button>
		</div>
	</div>
</template>
