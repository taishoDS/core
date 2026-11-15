// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ThemeDef } from '../taisho.types';

export default {
    locked: true,
    colors: {
        brand: '#3b82f6',
        'brand-secondary': '#84cc16',
        accent: '#f59e0b',
    },
    primary: 'oklch(0.15 0 0)',
    focusRing: 'light-dark(var(--color-grayAlpha-700), var(--color-grayAlpha-600))',
} satisfies ThemeDef;
