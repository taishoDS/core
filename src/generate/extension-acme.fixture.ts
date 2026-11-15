// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { defineExtension } from './extension';
import type { TaishoConfig } from './vocabulary';

export const acme = defineExtension({
    components: {
        'acme-card': {
            roots: ['acme-card', 'acme-tile'],
            css: `
@utility ts-acme-card {
  display: flex;
  gap: var(--ts-gap-half);
  padding: var(--ts-acme-card-pad);
  border-radius: var(--ts-radius-md);
  background: var(--color-background-100);
  @apply ts-focus-ring;
  &:hover { background: var(--ts-acme-card-hover); }
  @media (prefers-reduced-motion: reduce) { transition: none; }
}
@utility ts-acme-card-title {
  color: var(--ts-acme-card-accent);
  font-weight: var(--ts-fw-normal);
}
@utility ts-acme-tile {
  width: var(--ts-sizing-32);
}
`,
            tokens: { pad: '12px', hover: 'var(--color-gray-100)', accent: '#ff00aa' },
        },
    },
    roots: ['acme-glow'],
    utilities: `
@utility ts-acme-glow {
  box-shadow: var(--ts-shadow-md);
}
`,
});

export const configMinima = (extra: Partial<TaishoConfig> = {}): TaishoConfig => ({
    themes: { taisho: { colors: { brand: '#4F46E5' } } },
    fontFaces: [],
    ...extra,
});
