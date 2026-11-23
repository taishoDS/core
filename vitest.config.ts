import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { aliasCore } from './src/core-subpaths';

export default defineConfig({
	resolve: { alias: aliasCore(fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '')) },
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.ts'],
		...(process.env.CI ? { testTimeout: 20_000 } : {}),
		exclude: ['node_modules/**', 'dist-core/**', 'dist-html/**', 'tests/fixture-*/**'],
	},
});
