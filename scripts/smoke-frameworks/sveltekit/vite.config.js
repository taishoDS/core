import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { defineConfig } from 'vite';

// Desde SvelteKit 3 la configuración va en el plugin, no en svelte.config.js.
export default defineConfig({ plugins: [sveltekit({ adapter: adapter() })] });
