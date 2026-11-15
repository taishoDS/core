// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, vi } from 'vitest';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildTokensDTCG } from './emit-dtcg';
import { buildThemeCss } from '../lib/theme/createTheme';
import { buildRepoConfig } from '../config/pipeline';
import { defaultStates } from '../config/taisho.user';
import { ConfigError } from './errores-config';
import type { ThemeDef } from '../config/taisho.types';

const repo = buildRepoConfig();
const MIO: ThemeDef = { colors: { brand: '#3b82f6' } };
const conTema = (def: Partial<ThemeDef>, extra: Partial<TaishoConfig> = {}): TaishoConfig => ({
    ...repo, ...extra, themes: { ...repo.themes, mio: { ...MIO, ...def } },
});
const errores = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { if (e instanceof ConfigError) return e.errors; throw e; }
    return [];
};
const mensaje = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { return (e as Error).message; }
    return '';
};
const malo = (def: unknown) => def as Partial<ThemeDef>;

describe('themes.<t>: clave desconocida', () => {
    it('una clave que un tema no tiene es un Error con la ruta exacta', () => {
        const e = errores(conTema(malo({ bogus: { '36': '36' } })));
        expect(e).toHaveLength(1);
        expect(e[0]).toMatchObject({ path: 'themes.mio.bogus', code: 'theme-key-unknown' });
    });
    it('una errata de una clave real sugiere la clave', () => {
        expect(mensaje(conTema(malo({ radiuss: { md: '1px' } })))).toContain('¿Se quiso decir "radius"?');
    });
    it('una subclave desconocida de motion o spacing también', () => {
        expect(errores(conTema(malo({ motion: { delays: {} } })))[0].path).toBe('themes.mio.motion.delays');
        expect(errores(conTema(malo({ spacing: { rows: {} } })))[0].path).toBe('themes.mio.spacing.rows');
    });
});

describe('themes.<t>: nombre desconocido (un tema sólo cambia valores)', () => {
    it('radius: un nombre nuevo da la pista extend.radius.<nombre>', () => {
        const e = errores(conTema({ radius: { huge: '99px' } }));
        expect(e[0]).toMatchObject({ path: 'themes.mio.radius.huge', code: 'theme-name-unknown', params: { extendPath: 'extend.radius' } });
        expect(mensaje(conTema({ radius: { huge: '99px' } }))).toContain('extend.radius.huge');
    });
    it('un nombre sumado en extend sí se puede cambiar desde el tema', () => {
        expect(errores(conTema({ radius: { card: '30px' } }, { extend: { radius: { card: '20px' } } }))).toEqual([]);
    });
    it('zIndex: un nombre nuevo no se puede sumar (la escala no se amplía)', () => {
        const e = errores(conTema({ zIndex: { mio: '5' } }));
        expect(e[0]).toMatchObject({ code: 'theme-name-unknown', params: { scale: 'zIndex' } });
        expect(e[0].params).not.toHaveProperty('extendPath');
    });
});

describe('themes.<t>: tipos de valor', () => {
    it.each([
        ['zIndex decimal', { zIndex: { sticky: '1.5' } }],
        ['zIndex palabra', { zIndex: { sticky: 'alto' } }],
        ['opacidad mayor que 1', { opacities: { '30': '1.5' } }],
        ['opacidad en %', { opacities: { '30': '30%' } }],
        ['duración sin unidad', { motion: { durations: { fast: '150' } } }],
        ['duración palabra', { motion: { durations: { fast: 'rápido' } } }],
    ])('%s es un Error', (_n, def) => {
        const e = errores(conTema(malo(def)));
        expect(e).toHaveLength(1);
        expect(e[0].code).toBe('value-type-invalid');
    });
    it.each([
        { zIndex: { sticky: '15' } },
        { opacities: { '30': '0.35', muted: 'var(--ts-opacity-50)' } },
        { motion: { durations: { fast: '0.2s', base: '250ms' } } },
    ])('valores válidos pasan: %j', (def) => {
        expect(errores(conTema(malo(def)))).toEqual([]);
    });
    it('un valor que podría cerrar la declaración es un Error en cualquier escala', () => {
        expect(errores(conTema({ blurs: { sm: '4px; color: red' } }))[0].code).toBe('unsafe-value');
        expect(errores(conTema({ fonts: { sans: 'x}' } }))[0].code).toBe('unsafe-value');
        expect(errores(conTema({ focusRing: '' }))[0].code).toBe('empty-value');
    });
    it('material: un valor que podría inyectar CSS es un Error con la ruta exacta', () => {
        const e = errores(conTema({ material: { light: { bg: 'red; color: blue' }, dark: { border: '1px}body{x:y', shadowRgb: '1 2 3' } } }));
        expect(e.map((x) => [x.path, x.code])).toEqual([['themes.mio.material.light.bg', 'unsafe-value'], ['themes.mio.material.dark.border', 'unsafe-value']]);
        expect(errores(conTema({ material: { light: { bg: 'var(--color-gray-100)', border: 'var(--color-brand-200)', shadowRgb: '116 23 67' } } }))).toEqual([]);
    });
    it('los errores de varias claves salen juntos, uno por clave', () => {
        const e = errores(conTema(malo({ zIndex: { sticky: 'x' }, radius: { huge: '1px' }, bogus: 1 })));
        expect(e.map((x) => x.path)).toEqual(['themes.mio.bogus', 'themes.mio.radius.huge', 'themes.mio.zIndex.sticky']);
    });
});

describe('sin claves nuevas la config se comporta igual', () => {
    it('la config del repo y un tema con las claves de siempre no dan errores', () => {
        expect(errores(repo)).toEqual([]);
        const completo: Partial<ThemeDef> = {
            radius: { md: '10px' }, borderWidths: { '2': '3px' }, blurs: { sm: '6px' }, zIndex: { toast: '60' }, opacities: { '60': '0.65' },
            screens: { md: '800px' }, shadows: { sm: 'none' }, spacing: { gaps: { base: '20px' }, spaces: { half: '10px' } },
            motion: { durations: { fast: '120ms' }, loops: { spin: '700ms' }, easings: { out: 'ease-out' } },
            semantic: { heading: 'var(--color-gray-900)' }, fonts: { sans: 'Inter' }, focusRing: 'var(--color-brand-300)', contrastThreshold: '0.6',
        };
        expect(errores(conTema(completo))).toEqual([]);
    });
});

describe('aviso border-width-zero (no bloquea)', () => {
    const modelo = (def: Partial<ThemeDef>) => resolveThemeTokens({ name: 'mio', group: 'root', def: { ...MIO, ...def } }, {}, defaultStates);
    it('borderWidths 1 o 4 en 0 avisa, sin lanzar; 2 y 3 no', () => {
        expect(modelo({ borderWidths: { '1': '0px', '4': '0' } }).warnings.map((a) => a.code)).toEqual(['border-width-zero', 'border-width-zero']);
        expect(modelo({ borderWidths: { '2': '0px', '3': '0px' } }).warnings).toEqual([]);
        expect(modelo({}).warnings).toEqual([]);
    });
    it('un tema locked ignora el valor y no avisa', () => {
        expect(modelo({ borderWidths: { '1': '0px' }, locked: true }).warnings).toEqual([]);
    });
});

describe('DTCG: un valor numérico que no es un número no sale como null', () => {
    it('opacidad y z-index con calc()/var() sin alias quedan crudos y marcados', () => {
        const entry = { name: 'mio', group: 'root' as const, def: { ...MIO, opacities: { '30': 'calc(0.3)' }, zIndex: { sticky: 'var(--z)' } } };
        const json = buildTokensDTCG(entry, resolveThemeTokens(entry, {}, defaultStates));
        expect(json).not.toContain('"$value": null');
        const arbol = JSON.parse(json);
        expect(arbol.opacity['30']).toMatchObject({ $type: 'number', $value: 'calc(0.3)', $extensions: { 'com.taishods': { raw: true } } });
        expect(arbol.zIndex.sticky.$value).toBe('var(--z)');
        expect(arbol.zIndex.base.$value).toBe(0);
    });
});

describe('createTheme a la par del build', () => {
    it('emite las escalas del tema con los mismos nombres de variable que el build', () => {
        const def: ThemeDef = {
            ...MIO, borderWidths: { '2': '3px' }, blurs: { sm: '6px' }, zIndex: { toast: '60' }, opacities: { '60': '0.65' }, screens: { md: '800px' },
            motion: { durations: { fast: '120ms' }, loops: { spin: '700ms' }, easings: { out: 'ease-out' } },
        };
        const build = buildTokensCSS(resolveThemeTokens({ name: 'mio', group: 'root', def }, {}, defaultStates));
        const runtime = buildThemeCss(def);
        for (const [k, v] of [['--ts-border-width-2', '3px'], ['--ts-blur-sm', '6px'], ['--ts-z-toast', '60'], ['--ts-opacity-60', '0.65'], ['--ts-screen-md', '800px'],
            ['--ts-duration-fast', '120ms'], ['--ts-duration-spin', '700ms'], ['--ts-ease-out', 'ease-out']]) {
            expect(build).toContain(`${k}: ${v};`);
            expect(runtime).toContain(`${k}:${v};`);
        }
    });
    it('repite el bloque de reduced-motion para las duraciones que define (los loops no)', () => {
        const css = buildThemeCss({ ...MIO, motion: { durations: { fast: '120ms' }, loops: { spin: '700ms' } } });
        expect(css).toContain('@media (prefers-reduced-motion:reduce){:root{--ts-duration-fast:1ms;}}');
        expect(css).not.toContain('--ts-duration-spin:1ms');
        expect(css.endsWith('}}')).toBe(true);
        expect(buildThemeCss(MIO)).not.toContain('prefers-reduced-motion');
    });
    it('un tema que pisa --ts-iterations-loop lo repite en 0 dentro de reduced-motion', () => {
        const css = buildThemeCss({ ...MIO, motion: { iterations: { loop: '3' } } });
        expect(css).toContain('--ts-iterations-loop:3;');
        expect(css).toContain('@media (prefers-reduced-motion:reduce){:root{--ts-iterations-loop:0;}}');
    });
    it('gaps/spaces pisados repiten su compact (el :root del tema le ganaría al del tokens base)', () => {
        const css = buildThemeCss({ ...MIO, spacing: { gaps: { half: '10px', loose: '40px' }, spaces: { base: '30px' } } });
        expect(css).toContain(':where(.ts).compact{--ts-gap-half:var(--ts-sizing-8);--ts-space-base:var(--ts-sizing-18);}');
        expect(css.indexOf(':root{')).toBeLessThan(css.indexOf(':where(.ts).compact{'));
        expect(buildThemeCss(MIO)).not.toContain('.compact');
    });
    it('un tema locked ignora los overrides y conserva colores, primario y foco', () => {
        const css = buildThemeCss({ ...MIO, locked: true, primary: '#111111', focusRing: 'var(--color-gray-500)', radius: { md: '99px' }, shadows: { sm: 'none' }, states: { danger: '#ff0000' }, neutral: { tint: { c: 0.02, h: 250 } } });
        expect(css).not.toContain('--ts-radius-md');
        expect(css).not.toContain('--ts-shadow-sm');
        expect(css).not.toContain('--color-danger-');
        expect(css).not.toContain('--color-gray-100:');
        expect(css).toContain('--ts-focus-ring-color:var(--color-gray-500)');
        expect(css).toContain('--color-brand-');
        expect(css).toContain('--color-primary-solid:');
    });
    it('avisa del ancho del foco en 0 por console.warn (dev) y no lanza', async () => {
        const { createTheme } = await import('../lib/theme/createTheme');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => createTheme({ ...MIO, borderWidths: { '4': '0px' } })).not.toThrow();
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });
});
