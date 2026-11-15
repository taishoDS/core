// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildThemeCss, createTheme } from './createTheme';
import { buildTokensCSS, resolveThemeTokens } from '../../generate/emit-tokens';
import { defaultStates } from '../../config/taisho.user';
import type { ThemeDef } from '../../config/taisho.types';

const MENSAJE = "[TaishoDS] createTheme: colors.brand es obligatorio. Se pasa un hex, p. ej. createTheme({ colors: { brand: '#4F46E5' } }).";

describe('createTheme: brand obligatorio', () => {
    it('sin brand -> error claro, literal', () => {
        expect(() => createTheme({ colors: {} } as never)).toThrow(MENSAJE);
        expect(() => createTheme({ colors: { brand: '' } })).toThrow(MENSAJE);
        expect(() => createTheme({ colors: { accent: '#ff6600' } } as unknown as ThemeDef)).toThrow(MENSAJE);
    });
    it('con brand no lanza', () => {
        expect(() => createTheme({ colors: { brand: '#4F46E5' } })).not.toThrow();
    });
});

describe('createTheme: focusRing, spotlight y contrastThreshold (mismo valor que el build)', () => {
    const def: ThemeDef = {
        colors: { brand: '#4F46E5' },
        focusRing: 'var(--color-brand-300)',
        spotlight: { light: 'oklch(0.9 0.05 280 / 0.4)', dark: 'oklch(0.8 0.05 280 / 0.3)' },
        contrastThreshold: '0.62',
    };
    const PROPS = ['--ts-contrast-threshold', '--ts-focus-ring-color', '--ts-spotlight-color'];
    const valores = (css: string) => Object.fromEntries(PROPS.map((p) => [p, new RegExp(`${p}:\\s*([^;]+);`).exec(css)?.[1].trim()]));

    it('un tema con las tres opciones: build y createTheme emiten el mismo valor', () => {
        const build = buildTokensCSS(resolveThemeTokens({ name: 't', group: 'frontend', def }, {}, defaultStates));
        const runtime = buildThemeCss(def);
        expect(valores(runtime)).toEqual(valores(build));
        expect(valores(runtime)).toEqual({
            '--ts-contrast-threshold': '0.62',
            '--ts-focus-ring-color': 'var(--color-brand-300)',
            '--ts-spotlight-color': 'light-dark(oklch(0.9 0.05 280 / 0.4), oklch(0.8 0.05 280 / 0.3))',
        });
    });

    it('un spotlight de un solo modo completa el otro con el valor por defecto, como el build', () => {
        const parcial: ThemeDef = { colors: { brand: '#4F46E5' }, spotlight: { dark: 'oklch(0.8 0 0 / 0.3)' } };
        const build = buildTokensCSS(resolveThemeTokens({ name: 't', group: 'frontend', def: parcial }, {}, defaultStates));
        expect(valores(buildThemeCss(parcial))['--ts-spotlight-color']).toBe(valores(build)['--ts-spotlight-color']);
    });

    it('sin las opciones no emite spotlight ni umbral (salen del tokens/{base}.css cargado); el foco sí: la marca', () => {
        const css = buildThemeCss({ colors: { brand: '#4F46E5' } });
        for (const p of PROPS.filter((x) => x !== '--ts-focus-ring-color')) expect(css).not.toContain(p);
        expect(css).toContain('--ts-focus-ring-color:var(--color-brand-solid)');
    });
});

describe('createTheme: aviso de marca blanca (sólo desarrollo, una vez por semilla)', () => {
    it('semilla casi blanca -> console.warn con el texto del aviso seed-white; no se repite', async () => {
        const { vi } = await import('vitest');
        const { warningText } = await import('../../generate-cli/mensajes-avisos');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        createTheme({ colors: { brand: '#fdfdfd' } });
        createTheme({ colors: { brand: '#fdfdfd' } });
        const esperado = warningText({ code: 'seed-white', params: { theme: 'runtime', color: 'brand', seed: '#fdfdfd' } }, 'es');
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(`[TaishoDS] ${esperado}`);
        warn.mockRestore();
    });
    it('una marca con color no avisa', async () => {
        const { vi } = await import('vitest');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        createTheme({ colors: { brand: '#4F46E5' } });
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('createTheme: sin aviso en producción', () => {
    it('con DEV en false (build de producción) no avisa', async () => {
        const { vi } = await import('vitest');
        vi.stubEnv('DEV', false);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        createTheme({ colors: { brand: '#ffffff' } });
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
        vi.unstubAllEnvs();
    });
});
