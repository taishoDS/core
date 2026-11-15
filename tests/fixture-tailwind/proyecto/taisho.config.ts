import type { TaishoConfig } from '@taishods/core/generate';

// Lo que deja `taisho init` con una semilla propia (`brand`). `blue`, `emerald` y `sunset` no son semillas:
// esas clases quedan sin convertir a propósito.
export default {
	themes: { principal: { colors: { brand: '#4F46E5' } } },
	content: ['src/**/*.{html,svelte,jsx,tsx,vue}'],
	fontFaces: [],
	fonts: { sans: 'system-ui, sans-serif' },
	defaultStates: { success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#DC2626' },
} satisfies TaishoConfig;
