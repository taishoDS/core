// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildThemeCss } from './createTheme';
import { effectiveNeutrals } from './neutrals';
import { esSemillaBlanca, paletasDeSemillas } from './palette';
import type { Mode } from './palette';
import { defaultStates } from '../../config/taisho.user';
import { resolveThemeTokens } from '../../generate/emit-tokens';

const eff = effectiveNeutrals();
const MODES: Mode[] = ['light', 'dark'];
const TRIO = ['solid', 'solid-hover', 'solid-active'] as const;
const paso = (v: string): string => /^var\(--color-.+-(\d+)\)$/.exec(v)![1];

const SEMILLAS: Record<string, { hex: string; light: [string, string, string]; dark: [string, string, string] }> = {
    negro: { hex: '#000000', light: ['1000', '900', '800'], dark: ['1000', '900', '800'] },
    taisho: { hex: 'oklch(0.15 0 0)', light: ['1000', '900', '800'], dark: ['1000', '900', '800'] },
    blanco: { hex: '#ffffff', light: ['600', '700', '800'], dark: ['600', '700', '800'] },
    marino: { hex: '#1e3a5f', light: ['800', '900', '1000'], dark: ['600', '700', '800'] },
    verde: { hex: '#14532d', light: ['700', '800', '900'], dark: ['600', '700', '800'] },
    bordo: { hex: '#7f1d1d', light: ['800', '900', '1000'], dark: ['600', '700', '800'] },
    azul: { hex: '#3b82f6', light: ['600', '700', '800'], dark: ['600', '700', '800'] },
    bermellon: { hex: '#e34234', light: ['600', '700', '800'], dark: ['600', '700', '800'] },
};

describe('paso del sólido por modo', () => {
    for (const [nombre, esperado] of Object.entries(SEMILLAS)) {
        it(`${nombre} (${esperado.hex})`, () => {
            const r = paletasDeSemillas({ brand: esperado.hex }, eff, 'srgb');
            for (const m of MODES) expect(TRIO.map((k) => paso(r[m].brand[k]))).toEqual(esperado[m]);
        });
    }

    it('un gris neutro (zinc) se invierte como el negro; uno con tinte (gray) queda en 600 en oscuro', () => {
        const r = paletasDeSemillas({ zinc: '#27272a', gray: '#374151' }, eff, 'srgb');
        expect(paso(r.dark.zinc.solid)).toBe(paso(r.light.zinc.solid));
        expect(paso(r.dark.gray.solid)).toBe('600');
    });

    it('hover/active van N−1/N−2 desde 900 y N+1/N+2 por debajo', () => {
        const r = paletasDeSemillas({ a: '#000000', b: '#1e3a5f' }, eff, 'srgb');
        expect(TRIO.map((k) => paso(r.light.a[k]))).toEqual(['1000', '900', '800']);
        expect(TRIO.map((k) => paso(r.light.b[k]))).toEqual(['800', '900', '1000']);
    });

    it('el aviso (warning) con su semilla de fábrica: reposo en la semilla y hover/active un paso más oscuro (claro 400/500/500, oscuro 700/600/600)', () => {
        const r = paletasDeSemillas({ warning: defaultStates.warning }, eff, 'srgb');
        expect(TRIO.map((k) => paso(r.light.warning[k]))).toEqual(['400', '500', '500']);
        expect(TRIO.map((k) => paso(r.dark.warning[k]))).toEqual(['700', '600', '600']);
        for (const m of MODES) for (const k of TRIO) expect(r[m].warning[`${k}-contrast`]).toBe(r[m].warning['solid-contrast']);
    });

    it('un aviso cuyo paso más oscuro cambia el color del texto: el hover aclara un paso, así el texto no cambia', () => {
        const r = paletasDeSemillas({ warning: 'oklch(0.6 0.12 0)' }, eff, 'srgb');
        for (const m of MODES) expect(r[m].warning['solid-hover-contrast']).toBe(r[m].warning['solid-contrast']);
    });
});

describe('contraste del sólido', () => {
    const todas = { ...Object.fromEntries(Object.entries(SEMILLAS).map(([n, s]) => [n, s.hex])), ...defaultStates };
    for (const gamut of ['srgb', 'p3'] as const) {
        it(`el -contrast de solid/hover/active es el del paso y llega a 4,5:1 (${gamut})`, () => {
            const r = paletasDeSemillas(todas, gamut === 'p3' ? effectiveNeutrals(undefined, 'p3') : eff, gamut);
            const mal: string[] = [];
            for (const nombre of Object.keys(todas)) for (const m of MODES) for (const k of TRIO) {
                const step = r.escalas[nombre][m].steps.find((s) => s.shade === paso(r[m][nombre][k]))!;
                if (r[m][nombre][`${k}-contrast`] !== step.contrast || step.contrastRatio < 4.5) mal.push(`${nombre} ${m} ${k}`);
            }
            expect(mal).toEqual([]);
        });
    }
});

describe('paridad con el 600/700/800 de hoy', () => {
    it('los estados de fábrica y #3b82f6 dan los mismos pasos y los mismos -contrast que antes', () => {
        const r = paletasDeSemillas({ brand: '#3b82f6', ...defaultStates }, eff, 'srgb');
        for (const m of MODES) for (const nombre of ['brand', ...Object.keys(defaultStates)]) {
            if (nombre === 'warning') continue;
            const pasos = ['600', '700', '800'];
            TRIO.forEach((k, i) => {
                expect(r[m][nombre][k]).toBe(`var(--color-${nombre}-${pasos[i]})`);
                expect(r[m][nombre][`${k}-contrast`]).toBe(r[m][nombre][`${pasos[i]}-contrast`]);
            });
        }
    });
});

describe('emisión en runtime (createTheme)', () => {
    it('un tema con marca negra emite el sólido por modo con los mismos nombres que el build', () => {
        const css = buildThemeCss({ colors: { brand: '#000000' }, states: { danger: defaultStates.danger } });
        expect(css).toContain('--color-brand-solid:var(--color-brand-1000);');
        expect(css).toContain('--color-brand-solid-hover:var(--color-brand-900);');
        expect(css).toContain('--color-brand-solid-active-contrast:var(--color-gray-100);');
        expect(css).toContain('--color-danger-solid:var(--color-danger-600);');
    });
});

describe('marca blanca', () => {
    it('avisa con #fff y #f7f7f7; no con un gris claro ni con un color', () => {
        expect(esSemillaBlanca('#ffffff')).toBe(true);
        expect(esSemillaBlanca('#f7f7f7')).toBe(true);
        expect(esSemillaBlanca('#e5e5e5')).toBe(false);
        expect(esSemillaBlanca('#3b82f6')).toBe(false);
    });

    it('el generador avisa `seed-white` con una marca blanca y no con una oscura', () => {
        const avisos = (brand: string) =>
            resolveThemeTokens({ name: 't', group: 'frontend', def: { colors: { brand } } }, {}, defaultStates).warnings.filter((a) => a.code === 'seed-white');
        expect(avisos('#ffffff')).toEqual([{ code: 'seed-white', params: { theme: 't', color: 'brand', seed: '#ffffff' } }]);
        expect(avisos('#000000')).toEqual([]);
    });
});
