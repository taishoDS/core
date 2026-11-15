// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { themeList, userFonts, defaultStates } from '../config/taisho.user';

describe('resolveThemeTokens', () => {
  for (const entry of themeList) {
    describe(`tema "${entry.name}"`, () => {
      const t = resolveThemeTokens(entry, userFonts, defaultStates);

      it('resuelve la paleta de neutros (gray) con sus shades', () => {
        expect(t.colors.gray).toBeDefined();
        expect(t.colors.gray['500']).toMatchObject({ light: expect.any(String) });
        expect(t.colors.gray['500'].dark).toBeTypeOf('string');
      });

      it('marca los estados STATUS como alias de paleta', () => {
        expect(t.states.success).toEqual({ kind: 'status' });
      });

      it('puebla semantic, escalas y densidad', () => {
        for (const k of ['heading', 'copy', 'subtle', 'label', 'btn'] as const) {
          expect(t.semantic[k]).toBeTypeOf('string');
        }
        for (const scale of [t.fonts, t.radius, t.gaps, t.spaces, t.shadows] as const) {
          expect(Object.keys(scale).length).toBeGreaterThan(0);
        }
        expect(Object.keys(t.densityComfortable).length).toBeGreaterThan(0);
        expect(Object.keys(t.densityCompact).length).toBeGreaterThan(0);
      });

      it('es una función pura (mismo entry → modelo deep-equal)', () => {
        expect(resolveThemeTokens(entry, userFonts, defaultStates)).toEqual(t);
      });

      it('el modelo resuelto es lo que serializa buildTokensCSS', () => {
        const css = buildTokensCSS(t);
        expect(css).toContain(':root {');
        expect(css).toContain(':where(.ts).compact {');
        expect(css).not.toContain('density-compact');
        expect(css).toContain('--color-gray-500:');
        expect(css).toContain(t.colors.gray['500'].light);
      });
    });
  }

  it('un tema locked ignora sus overrides (usa solo defaults)', () => {
    const locked = themeList.find((e) => e.def.locked);
    if (!locked) return;
    const t = resolveThemeTokens(locked, userFonts, defaultStates);
    expect(Object.keys(t.fonts).length).toBeGreaterThan(0);
  });
});
