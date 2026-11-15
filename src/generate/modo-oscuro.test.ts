// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, expect, it } from 'vitest';
import { compile, type ContentFile } from './compile';
import { buildResetCSS } from './emit-reset';
import { buildTokensCSS, materialDeSecciones, resolveThemeTokens } from './emit-tokens';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { buildThemeCss } from '../lib/theme/createTheme';
import { bloqueSinLightDark, brazoDeModo, SIN_LIGHT_DARK } from '../lib/theme/sin-light-dark';
import type { ThemeDef } from '../lib/theme/theme-def';

const config = (extra: Partial<TaishoConfig> = {}, tema: Partial<ThemeDef> = {}): TaishoConfig => ({
    themes: { demo: { colors: { brand: '#4F46E5' }, ...tema } },
    fontFaces: [],
    ...extra,
});
const html = (clases: string): ContentFile[] => [{ file: 'a.html', content: `<div class="${clases}"></div>` }];
const demanda = (c: TaishoConfig, clases: string) => compile(c, html(clases), { onDemand: true }).css;
const tokens = (c: TaishoConfig) => {
    const t = deriveThemeVocabulary(c);
    return resolveThemeTokens(t.themeEntries[0], t.userFonts, t.defaultStates, t.userScales);
};
const MEDIA = '@media (prefers-color-scheme: dark)';
const material = { material: { light: { bg: 'var(--color-gray-100)' }, dark: { bg: 'var(--color-gray-300)' } } };

describe('darkMode', () => {
    it("sin la opción es 'class': nada mira al sistema", () => {
        const m = tokens(config({}, material));
        expect(demanda(config({ darkMode: 'class' }), 'ts toggle')).toBe(demanda(config(), 'ts toggle'));
        expect(buildResetCSS('class')).toBe(buildResetCSS());
        expect(buildTokensCSS(m, 'class')).toBe(buildTokensCSS(m));
        expect(demanda(config(), 'ts toggle')).not.toContain('prefers-color-scheme');
        expect(buildTokensCSS(m)).not.toContain('prefers-color-scheme');
    });

    it("'media' pone el reset en oscuro según el sistema, salvo con la clase light", () => {
        const css = buildResetCSS('media');
        expect(css).toContain(`${MEDIA} {\n  :root:not(.light) { color-scheme: dark; }\n}`);
        expect(css).toContain('.dark { color-scheme: dark; }');
    });

    it("'media' también alcanza los materiales propios del tema", () => {
        const css = buildTokensCSS(tokens(config({}, material)), 'media');
        expect(css).toContain(`${MEDIA} {\n  :root:not(.light) {\n  --ts-material-bg: var(--color-gray-300);\n  }\n}`);
    });

    it('los componentes no dependen del modo elegido: salen iguales', () => {
        const sinReset = (css: string) => css.replace(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\.light\) \{ color-scheme: dark; \}\s*\}\s*/, '');
        expect(sinReset(demanda(config({ darkMode: 'media' }), 'ts toggle tabs variant-secondary'))).toBe(demanda(config(), 'ts toggle tabs variant-secondary'));
    });

    it('un valor que no es class ni media corta la generación', () => {
        expect(() => compile(config({ darkMode: 'auto' as never }), [])).toThrow(/darkMode/);
    });
});

describe('secciones scheme-dark y scheme-light', () => {
    it('fijan el modo y reponen el color del texto, sin literales', () => {
        const css = demanda(config(), 'ts scheme-dark scheme-light');
        expect(css).toMatch(/:where\(\.ts\)\.scheme-dark \{\s*color-scheme: dark;\s*color: var\(--color-gray-1000\);/);
        expect(css).toMatch(/:where\(\.ts\)\.scheme-light \{\s*color-scheme: light;\s*color: var\(--color-gray-1000\);/);
    });

    it('el material propio del tema se redeclara en cada sección, sólo si hay', () => {
        expect(materialDeSecciones(tokens(config()))).toBe('');
        const css = materialDeSecciones(tokens(config({}, material)));
        expect(css).toContain('.scheme-dark {\n  --ts-material-bg: var(--color-gray-300);');
        expect(css).toContain('.scheme-light {\n  --ts-material-bg: var(--color-gray-100);');
    });
});

describe('light-dark()', () => {
    it('ningún componente ni regla mira un ancestro .dark', () => {
        expect(compile(config(), []).css).not.toMatch(/\.dark\s*&/);
    });

    it('elige el brazo, también con paréntesis y anidados', () => {
        expect(brazoDeModo('light-dark(var(--a, rgb(0, 0, 0)), oklch(1 0 0))', 0)).toBe('var(--a, rgb(0, 0, 0))');
        expect(brazoDeModo('light-dark(var(--a, rgb(0, 0, 0)), oklch(1 0 0))', 1)).toBe('oklch(1 0 0)');
        expect(brazoDeModo('0 1px light-dark(light-dark(a, b), c) x', 1)).toBe('0 1px c x');
        expect(brazoDeModo('light-dark(light-dark(a, b), c)', 0)).toBe('a');
    });

    it('el respaldo cubre cada token de dos modos, en claro y en oscuro', () => {
        const css = buildTokensCSS(tokens(config()));
        const raiz = css.slice(css.indexOf(':root {'), css.indexOf('}'));
        const deDosModos = [...raiz.matchAll(/^\s*(--[\w-]+): (light-dark\(.*\));$/gm)];
        expect(deDosModos.length).toBeGreaterThan(80);
        const bloque = css.slice(css.indexOf(SIN_LIGHT_DARK));
        const claro = bloque.slice(bloque.indexOf(':root, .scheme-light {'), bloque.indexOf('.dark, .scheme-dark {'));
        const oscuro = bloque.slice(bloque.indexOf('.dark, .scheme-dark {'));
        for (const [, nombre, valor] of deDosModos) {
            expect(claro).toContain(`    ${nombre}: ${brazoDeModo(valor, 0)};`);
            expect(oscuro).toContain(`    ${nombre}: ${brazoDeModo(valor, 1)};`);
        }
    });

    it('un alias se redeclara para que una sección tome sus colores', () => {
        const css = bloqueSinLightDark('--a: light-dark(red, blue);--b: var(--a);--c: var(--b);--d: var(--color-x);--e: 4px;');
        expect(css).toContain('  :root, .scheme-light {\n    --a: red;\n  }');
        expect(css).toContain('  .dark, .scheme-dark {\n    --a: blue;\n  }');
        expect(css).toContain('  .scheme-light, .dark, .scheme-dark {\n    --b: var(--a);\n    --c: var(--b);\n    --d: var(--color-x);\n  }');
        expect(css).not.toContain('--e');
    });

    describe('sin light-dark() cada token da el color del modo', () => {
        const css = buildTokensCSS(tokens(config()));
        const raiz = css.slice(css.indexOf(':root {') + 7, css.indexOf('}'));
        const bloque = css.slice(css.indexOf(SIN_LIGHT_DARK) + SIN_LIGHT_DARK.length).split('@media (color-gamut: p3)')[0];
        const decls = (cuerpo: string) => [...cuerpo.matchAll(/^\s*(--[\w-]+): (.+);$/gm)].map((m) => [m[1], m[2]] as const);
        const regla = (selector: string) => new RegExp(`^  ${selector.replace(/[.,]/g, '\\$&')} \\{\\n([\\s\\S]*?)^  \\}`, 'm').exec(bloque)?.[1] ?? '';
        const resolver = (mapa: Map<string, string>, valor: string): string =>
            valor.replace(/var\((--[\w-]+)\)/g, (m, n: string) => (mapa.has(n) ? resolver(mapa, mapa.get(n)!) : m));
        const baseDe = () => new Map(decls(raiz).filter(([, v]) => !v.includes('light-dark(')));
        const sin = (selectores: string[]) => { const m = baseDe(); for (const s of selectores) for (const [n, v] of decls(regla(s))) m.set(n, v); return m; };
        const con = (brazo: 0 | 1) => new Map(decls(raiz).map(([n, v]) => [n, brazoDeModo(v, brazo)]));
        const casos: Array<[string, 0 | 1, string[]]> = [
            ['claro', 0, [':root, .scheme-light']],
            ['oscuro', 1, [':root, .scheme-light', '.scheme-light, .dark, .scheme-dark', '.dark, .scheme-dark']],
            ['sección oscura', 1, ['.scheme-light, .dark, .scheme-dark', '.dark, .scheme-dark']],
            ['sección clara', 0, [':root, .scheme-light', '.scheme-light, .dark, .scheme-dark']],
        ];
        it.each(casos)('%s', (_, brazo, selectores) => {
            const nativo = con(brazo);
            const respaldo = sin(selectores);
            const nombres = decls(raiz).filter(([, v]) => v.includes('light-dark(') || v.includes('var(--color-')).map(([n]) => n);
            expect(nombres.length).toBeGreaterThan(80);
            for (const n of nombres) expect([n, resolver(respaldo, respaldo.get(n) ?? '')]).toEqual([n, resolver(nativo, nativo.get(n)!)]);
        });
    });

    it('va después de la capa P3 y no la repite: el respaldo es sRGB', () => {
        const css = buildTokensCSS(tokens(config()));
        expect(css.indexOf(SIN_LIGHT_DARK)).toBeGreaterThan(css.indexOf('@media (color-gamut: p3)'));
        expect(css.slice(css.indexOf(SIN_LIGHT_DARK))).not.toContain('color-gamut');
    });

    it("con 'media', el respaldo también sigue al sistema, y antes de la clase dark", () => {
        const bloque = bloqueSinLightDark('--a: light-dark(red, blue);', 'media');
        expect(bloque).toContain(`${MEDIA} {\n    :root:not(.light) {\n      --a: blue;`);
        expect(bloque.indexOf('prefers-color-scheme')).toBeLessThan(bloque.indexOf('.dark, .scheme-dark'));
    });

    it("con 'media', un alias llega a la raíz del sistema (si no, los tokens base le ganan a createTheme)", () => {
        expect(bloqueSinLightDark('--a: light-dark(red, blue);--b: var(--a);', 'media')).toContain('  .scheme-light, .dark, .scheme-dark, :root:not(.light) {\n    --b: var(--a);');
    });

    it('sin nada de dos modos no hay bloque', () => {
        expect(bloqueSinLightDark('--e: 4px;')).toBe('');
    });

    it('el halo del foco, que depende del componente, entra por elemento', () => {
        const css = buildTokensCSS(tokens(config()));
        expect(css).toMatch(/\* \{\s*--ts-focus-halo: color-mix\(in oklab, var\(--_focus[^;]*40%, transparent\);/);
        expect(css).toMatch(/\.dark \*, \.scheme-dark \* \{\s*--ts-focus-halo: color-mix\(in oklab, var\(--_focus[^;]*50%, transparent\);/);
    });

    it('createTheme emite cada color una sola vez, sin bloques por modo', () => {
        const css = buildThemeCss({ colors: { brand: '#22c55e' } });
        const nativo = css.slice(0, css.indexOf('@media (color-gamut:p3)'));
        expect(nativo.match(/--color-brand-100:/g)!.length).toBe(1);
        expect(nativo).toMatch(/--color-brand-100:light-dark\(/);
        expect(nativo).not.toContain('.dark');
        expect(nativo).not.toContain('.scheme-');
    });

    it('createTheme: respaldo por modo, sin P3 y con la variante del sistema', () => {
        const css = buildThemeCss({ colors: { brand: '#22c55e' } }, { darkMode: 'media' });
        const bloque = css.slice(css.indexOf(SIN_LIGHT_DARK) + SIN_LIGHT_DARK.length);
        expect(bloque).toMatch(/:root, \.scheme-light \{\s*--color-brand-100: oklch/);
        expect(bloque).toMatch(/\.dark, \.scheme-dark \{\s*--color-brand-100: oklch/);
        expect(bloque).not.toContain('color-gamut');
        expect(bloque).toContain('prefers-color-scheme: dark');
        expect(bloque).not.toContain('light-dark(');
    });

    it('createTheme: los materiales propios siguen por modo y sólo si existen', () => {
        expect(buildThemeCss({ colors: { brand: '#22c55e' } }).slice(0, 200)).not.toContain('--ts-material');
        const css = buildThemeCss({ colors: { brand: '#22c55e' }, ...material });
        expect(css).toContain('.dark,.scheme-dark{--ts-material-bg:var(--color-gray-300);}');
        expect(css).toContain('.scheme-light{--ts-material-bg:var(--color-gray-100);}');
    });
});
