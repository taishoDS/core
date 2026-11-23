// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildThemeCss, createTheme } from './createTheme';
import { buildTokensCSS, resolveThemeTokens } from '../../generate/emit-tokens';
import { defaultStates } from '../../config/taisho.user';
import { DEFAULT_STATES } from './default-states';
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

describe('createTheme: color entre dos pasos (seedFit)', () => {
    it('sin elegir: seed-low-contrast por console.warn (una vez por modo) y seed-exact por console.info', async () => {
        const { vi } = await import('vitest');
        const { warningText } = await import('../../generate-cli/mensajes-avisos');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        createTheme({ colors: { brand: '#767676', accent: '#2563EB' } });
        createTheme({ colors: { brand: '#767676', accent: '#2563EB' } });
        const medidas = { theme: 'runtime', color: 'brand', seed: '#767676', step: '600', text: 4.33, bg: 4.54, textShifted: 4.72, bgShifted: 5.3 };
        expect(warn).toHaveBeenCalledTimes(2);
        const textos = warn.mock.calls.map((c) => String(c[0]));
        expect(textos[0]).toContain('[TaishoDS] Tema "runtime": el color "brand" (#767676) no llega a AA en el modo claro');
        expect(textos[0]).toContain(warningText({ code: 'seed-low-contrast', params: { ...medidas, mode: 'light', deltaL: 0 } }, 'es').slice(0, 60));
        expect(textos[1]).toContain('en el modo oscuro');
        expect(info).toHaveBeenCalledTimes(1);
        expect(String(info.mock.calls[0][0])).toContain('el color "accent" (#2563EB) queda exacto en el modo claro');
        warn.mockRestore();
        info.mockRestore();
    });
    it('un estado con el valor de fábrica no avisa, como en el build; con otro valor sí', async () => {
        const { vi } = await import('vitest');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        createTheme({ colors: { brand: '#4F46E5' }, states: { info: DEFAULT_STATES.info.toLowerCase(), danger: DEFAULT_STATES.danger } });
        expect(warn).not.toHaveBeenCalled();
        expect(info).not.toHaveBeenCalled();
        createTheme({ colors: { brand: '#4F46E5' }, states: { danger: '#DC2626' } });
        expect(warn).toHaveBeenCalledTimes(2);
        warn.mockRestore();
        info.mockRestore();
    });
    it("con seedFit no avisa, y 'keep' y 'shift' dan CSS distinto del que da el motor sin elegir", async () => {
        const { vi } = await import('vitest');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const def: ThemeDef = { colors: { brand: '#7a7a7b', accent: '#2563EC' } };
        createTheme({ ...def, seedFit: { brand: 'keep', accent: 'shift' } });
        expect(warn).not.toHaveBeenCalled();
        expect(info).not.toHaveBeenCalled();
        const css = (seedFit?: ThemeDef['seedFit']) => buildThemeCss({ ...def, seedFit });
        expect(css({ brand: 'keep' })).not.toBe(css({ brand: 'shift' }));
        expect(css()).toBe(css({ brand: 'shift' }));
        expect(css({ accent: 'shift' })).not.toBe(css({ accent: 'keep' }));
        warn.mockRestore();
        info.mockRestore();
    });
    it('el CSS del navegador es el del build con la misma elección', () => {
        const def: ThemeDef = { colors: { brand: '#767676' }, seedFit: { brand: 'keep' } };
        const build = buildTokensCSS(resolveThemeTokens({ name: 't', group: 'frontend', def }, {}, defaultStates));
        const paso = (css: string) => new RegExp('--color-brand-500:\\s*([^;]+);').exec(css)![1].replace(/\s+/g, '');
        expect(paso(buildThemeCss(def))).toBe(paso(build));
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
