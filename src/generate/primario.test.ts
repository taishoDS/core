// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildTokensCSS, resolveThemeTokens, avisosMarcaVsEstado } from './emit-tokens';
import { buildDtcg, varToAlias } from './emit-dtcg';
import { compile } from './compile';
import { deriveThemeVocabulary, DEFAULT_STATES, type TaishoConfig } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';
import { defaultStates, themeList } from '../config/taisho.user';
import { buildThemeCss } from '../lib/theme/createTheme';
import { createPaletteFromHex, solidoPrimario } from '../lib/theme/palette';
import { effectiveNeutrals } from '../lib/theme/neutrals';
import { luzOscuro } from '../lib/theme/opciones';
import type { ThemeDef, ThemeEntry } from '../config/taisho.types';

const VARS = ['solid', 'solid-contrast', 'solid-hover', 'solid-hover-contrast', 'solid-active', 'solid-active-contrast'];
const entrada = (def: ThemeDef, name = 'principal'): ThemeEntry => ({ name, group: 'root', def });
const modelo = (def: ThemeDef) => resolveThemeTokens(entrada(def), {}, defaultStates);
type Arbol = { color: { primary: Record<string, { $value: string }> } };
const taisho = themeList.find((t) => t.name === 'taisho')!;

describe('solidoPrimario', () => {
    it('oklch(0.15 0 0): L 0,15 en claro y 0,9587 en oscuro, pasos 1000/900/800 = el brand-solid de antes', () => {
        const s = solidoPrimario('oklch(0.15 0 0)', effectiveNeutrals(undefined), 'srgb');
        expect(s.light.solid).toBe('oklch(0.1500 0.0000 0.00)');
        expect(s.dark.solid).toBe('oklch(0.9587 0.0000 0.00)');
        const claro = createPaletteFromHex('oklch(0.15 0 0)', false);
        const oscuro = createPaletteFromHex('oklch(0.15 0 0)', true);
        expect(s.light['solid']).toBe(claro['1000']);
        expect(s.light['solid-hover']).toBe(claro['900']);
        expect(s.light['solid-active']).toBe(claro['800']);
        expect(s.dark['solid']).toBe(oscuro['1000']);
        expect(s.dark['solid-hover']).toBe(oscuro['900']);
        expect(s.dark['solid-active']).toBe(oscuro['800']);
        expect(s.light['solid-contrast']).toBe(claro['1000-contrast']);
    });
});

describe('tokens del primario', () => {
    it('un tema SIN primary: exactamente seis alias al sólido de la marca', () => {
        const m = modelo({ colors: { brand: '#4F46E5' } });
        expect(Object.keys(m.colors.primary)).toEqual(VARS.map((v) => v).sort((a, b) => VARS.indexOf(a) - VARS.indexOf(b)));
        for (const v of VARS) expect(m.colors.primary[v]).toEqual({ light: `var(--color-brand-${v})`, dark: `var(--color-brand-${v})` });
    });

    it('un tema CON primary: seis literales y ninguna --color-primary-NNN', () => {
        const m = modelo({ colors: { brand: '#4F46E5' }, primary: '#0f766e' });
        expect(Object.keys(m.colors.primary)).toHaveLength(6);
        for (const v of VARS) expect(m.colors.primary[v].light).toMatch(v.endsWith('contrast') ? /^var\(--color-gray-/ : /^oklch\(/);
        const css = buildTokensCSS(m);
        expect(css).not.toMatch(/--color-primary-\d/);
        expect(css).toMatch(/--color-primary-solid: light-dark\(oklch\(/);
    });

    it('un tema locked toma su primary (los overrides del tema se ignoran, la semilla no)', () => {
        const m = modelo({ locked: true, colors: { brand: '#4F46E5' }, primary: '#0f766e', states: { danger: '#ff00ff' } });
        expect(m.colors.primary.solid.light).toMatch(/^oklch\(/);
        expect(m.states.danger).toEqual({ kind: 'status' });
    });

    it('paridad build/runtime, con y sin primary', () => {
        for (const def of [{ colors: { brand: '#4F46E5' } }, { colors: { brand: '#4F46E5' }, primary: '#0f766e' }] as ThemeDef[]) {
            const m = modelo(def);
            const runtime = buildThemeCss(def);
            const root = /^:root\{([^}]*)\}/.exec(runtime)![1];
            for (const v of VARS) {
                const valor = (bloque: string) => new RegExp(`--color-primary-${v}:([^;]+);`).exec(bloque)![1];
                expect(valor(root)).toBe(luzOscuro(m.colors.primary[v].light, m.colors.primary[v].dark!));
            }
        }
    });

    it('createTheme sin primary emite --color-primary-solid:var(--color-brand-solid)', () => {
        expect(buildThemeCss({ colors: { brand: '#4F46E5' } })).toContain('--color-primary-solid:var(--color-brand-solid);');
    });

    it('Taisho: brand-600 es el de v0.13.0 y el primary-solid es el brand-solid de antes (negro suave)', () => {
        const css = buildTokensCSS(modelo(taisho.def));
        expect(css).toContain('--color-brand-600: light-dark(oklch(0.5075 0.1880 259.81), oklch(0.6231 0.1880 259.81));');
        expect(css).toContain('--color-primary-solid: light-dark(oklch(0.1500 0.0000 0.00), oklch(0.9587 0.0000 0.00));');
    });
});

describe('validación', () => {
    const conPrimary = (primary: unknown): TaishoConfig =>
        ({ themes: { principal: { colors: { brand: '#4F46E5' }, primary } }, fontFaces: [] }) as unknown as TaishoConfig;
    const mensaje = (fn: () => unknown): string => {
        try { fn(); } catch (e) { return (e as Error).message; }
        throw new Error('no lanzó');
    };

    it('primary vacío o que no es string -> primary-invalid', () => {
        for (const p of ['', '   ', 5, null]) {
            expect(mensaje(() => deriveThemeVocabulary(conPrimary(p)))).toMatch(/^taisho config: themes\.principal\.primary tiene un valor inválido/);
        }
    });
    it('un primary válido no lanza', () => {
        expect(() => deriveThemeVocabulary(conPrimary('#0f766e'))).not.toThrow();
    });
    it('colors.primary es un error (primary-in-colors): va en themes.<tema>.primary', () => {
        const config = { themes: { principal: { colors: { brand: '#4F46E5', primary: '#0f766e' } } }, fontFaces: [] } as unknown as TaishoConfig;
        expect(mensaje(() => deriveThemeVocabulary(config))).toBe(
            'taisho config: themes.principal.colors.primary `primary` no es un color de paleta: va en `themes.<tema>.primary`, junto a `colors`, no adentro.',
        );
    });
});

describe('DTCG', () => {
    it('varToAlias acepta el sufijo del sólido', () => {
        expect(varToAlias('var(--color-brand-solid)')).toBe('{color.brand.solid}');
        expect(varToAlias('var(--color-brand-secondary-solid-hover-contrast)')).toBe('{color.brand-secondary.solid-hover-contrast}');
        expect(varToAlias('var(--color-brand-600)')).toBe('{color.brand.600}');
    });
    it('color.primary.solid: alias a la marca sin primary, literal con primary', () => {
        const sin = entrada({ colors: { brand: '#4F46E5' } });
        const t1 = buildDtcg(sin, resolveThemeTokens(sin, {}, defaultStates)) as unknown as Arbol;
        expect(t1.color.primary.solid.$value).toBe('{color.brand.solid}');
        expect(t1.color.primary['solid-active-contrast'].$value).toBe('{color.brand.solid-active-contrast}');
        const con = entrada({ colors: { brand: '#4F46E5' }, primary: 'oklch(0.15 0 0)' });
        const t2 = buildDtcg(con, resolveThemeTokens(con, {}, defaultStates)) as unknown as Arbol;
        expect(t2.color.primary.solid.$value).toBe('oklch(0.1500 0.0000 0.00)');
        expect(t2.color.primary['solid-contrast'].$value).toBe('{color.gray.100}');
    });
});

describe('aviso brand-like-status con el primario efectivo', () => {
    const avisos = (colors: Record<string, string>, primary?: string) => avisosMarcaVsEstado(entrada({ colors: { brand: '#3b82f6', ...colors } as ThemeDef['colors'], ...(primary === undefined ? {} : { primary }) }), { ...DEFAULT_STATES, danger: '#DC2626' });

    it('sin primary compara la marca', () => {
        expect(avisos({ brand: '#DC2626' })).toHaveLength(1);
    });
    it('con primary compara el primario, no la marca', () => {
        expect(avisos({ brand: '#DC2626' }, 'oklch(0.15 0 0)')).toEqual([]);
        const a = avisos({}, '#DC2626');
        expect(a).toHaveLength(1);
        expect(a[0].params).toMatchObject({ brand: '#DC2626', status: 'danger' });
    });
});

describe('`primary` es un rol: no genera paleta ni clases', () => {
    const repo = buildRepoConfig();
    const config: TaishoConfig = {
        ...repo,
        themes: { ...repo.themes, rol: { colors: { brand: '#4F46E5' }, primary: '#0f766e' } },
    };

    it('el vocabulario no lo trae como familia', () => {
        expect(Object.keys(deriveThemeVocabulary(config).userColors)).not.toContain('primary');
    });
    it('el CSS completo no emite paleta, utilidades ni variantes primary-N', () => {
        const css = compile(config, []).css;
        expect(css).not.toMatch(/primary-\d/);
        expect(css).not.toMatch(/variant-primary-/);
    });
    it('los tokens de cada tema sólo traen las seis variables del sólido', () => {
        for (const t of [...themeList, entrada(config.themes.rol, 'rol')]) {
            const css = buildTokensCSS(modelo(t.def));
            expect([...new Set([...css.matchAll(/--color-primary-([\w-]+):/g)].map((m) => m[1]))].sort()).toEqual([...VARS].sort());
        }
    });
    it('el runtime tampoco', () => {
        expect(buildThemeCss({ colors: { brand: '#4F46E5' }, primary: '#0f766e' })).not.toMatch(/--color-primary-\d/);
    });
});
