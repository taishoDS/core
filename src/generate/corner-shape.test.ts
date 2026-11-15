// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildTokensDTCG } from './emit-dtcg';
import { compile } from './compile';
import { buildThemeCss } from '../lib/theme/createTheme';
import { buildRepoConfig } from '../config/pipeline';
import { defaultStates } from '../config/taisho.user';
import { ConfigError } from './errores-config';
import { configErrorLine } from './mensajes-errores';
import type { ThemeDef } from '../config/taisho.types';

const repo = buildRepoConfig();
const MIO: ThemeDef = { colors: { brand: '#3b82f6' } };
const conTema = (def: Partial<ThemeDef>, extra: Partial<TaishoConfig> = {}): TaishoConfig => ({
    ...repo, ...extra, themes: { ...repo.themes, mio: { ...MIO, ...def } },
});
const tokensDe = (config: TaishoConfig, nombre = 'mio') => {
    const v = deriveThemeVocabulary(config);
    const entry = v.themeEntries.find((e) => e.name === nombre)!;
    return buildTokensCSS(resolveThemeTokens(entry, v.userFonts, v.defaultStates, v.userScales));
};
const bloqueSquircle = (css: string) => /@supports \(corner-shape: squircle\) \{\n {2}:root \{\n([\s\S]*?) {2}\}\n\}/.exec(css)?.[1];

describe('cornerShape en el build (tokens/{tema}.css)', () => {
    it('sin la opción, el token vale round y no hay bloque @supports', () => {
        const css = tokensDe(conTema({}));
        expect(css).toContain('  --ts-corner-shape: round;\n');
        expect(css).not.toContain('@supports (corner-shape');
    });
    it("'round' explícito sale igual que sin la opción", () => {
        expect(tokensDe(conTema({ cornerShape: 'round' }))).toBe(tokensDe(conTema({})));
    });
    it('el token va después de los radios y antes de los anchos de borde', () => {
        const css = tokensDe(conTema({}));
        expect(css.indexOf('--ts-radius-full:')).toBeLessThan(css.indexOf('--ts-corner-shape:'));
        expect(css.indexOf('--ts-corner-shape:')).toBeLessThan(css.indexOf('--ts-border-width-1:'));
    });
    it('squircle: bloque aparte con el token y cada radio subido un paso (3xl, none y full no se mueven)', () => {
        const css = tokensDe(conTema({ cornerShape: 'squircle' }));
        expect(css).toContain('  --ts-corner-shape: round;\n');
        expect(bloqueSquircle(css)).toBe([
            '    --ts-corner-shape: squircle;',
            '    --ts-radius-xs: var(--ts-sizing-4);',
            '    --ts-radius-sm: var(--ts-sizing-6);',
            '    --ts-radius-md: var(--ts-sizing-8);',
            '    --ts-radius-lg: var(--ts-sizing-12);',
            '    --ts-radius-xl: var(--ts-sizing-16);',
            '    --ts-radius-2xl: var(--ts-sizing-24);',
            '',
        ].join('\n'));
    });
    it('un radio que el tema cambia sube con su valor; extend.radius toma la forma pero no sube', () => {
        const css = tokensDe(conTema({ cornerShape: 'squircle', radius: { md: '10px' } }, { extend: { radius: { card: '30px' } } }));
        const b = bloqueSquircle(css)!;
        expect(b).toContain('--ts-radius-sm: 10px;');
        expect(b).not.toContain('--ts-radius-card');
        expect(css).toContain('--ts-radius-card: 30px;');
    });
    it('un tema locked ignora cornerShape', () => {
        const c: TaishoConfig = { ...repo, themes: { ...repo.themes, taisho: { ...repo.themes.taisho, cornerShape: 'squircle' } } };
        expect(tokensDe(c, 'taisho')).not.toContain('@supports (corner-shape');
    });
    it('el tema de fábrica taisho sigue en round', () => {
        expect(tokensDe(repo, 'taisho')).not.toContain('squircle');
    });
});

describe('cornerShape: validación', () => {
    const errores = (def: unknown) => {
        try { deriveThemeVocabulary(conTema(def as Partial<ThemeDef>)); } catch (e) { if (e instanceof ConfigError) return e.errors; throw e; }
        return [];
    };
    it('un valor que no es round ni squircle corta el build con corner-shape-invalid y la ruta exacta', () => {
        const e = errores({ cornerShape: 'bevel' });
        expect(e).toHaveLength(1);
        expect(e[0]).toMatchObject({ path: 'themes.mio.cornerShape', code: 'corner-shape-invalid', params: { value: 'bevel' } });
        expect(configErrorLine(e[0], 'es')).toContain("tiene que ser 'round' o 'squircle'");
        expect(configErrorLine(e[0], 'en')).toContain("must be 'round' or 'squircle'");
    });
    it('un valor que no es texto también', () => {
        expect(errores({ cornerShape: true })[0]).toMatchObject({ code: 'corner-shape-invalid' });
    });
    it('round y squircle son claves y valores válidos', () => {
        expect(errores({ cornerShape: 'round' })).toEqual([]);
        expect(errores({ cornerShape: 'squircle' })).toEqual([]);
    });
});

describe('cornerShape en el CSS compilado', () => {
    it('las utilidades de escala leen el token; full y none quedan en round', () => {
        const css = compile(conTema({ cornerShape: 'squircle' }, { content: ['x'], safelist: ['radius-md', 'radius-full', 'radius-none'] }), [{ file: 'a.html', content: '<div class="ts">' }], { onDemand: true }).css;
        expect(css).toMatch(/\.radius-md \{[^}]*corner-shape: var\(--ts-corner-shape\)/);
        expect(css).toMatch(/\.radius-full \{[^}]*corner-shape: round/);
        expect(css).toMatch(/\.radius-none \{[^}]*corner-shape: round/);
    });
});

describe('cornerShape: createTheme a la par del build', () => {
    const def: ThemeDef = { ...MIO, cornerShape: 'squircle' };
    const build = tokensDe(conTema({ cornerShape: 'squircle' }));

    it('emite el mismo bloque @supports: el token y los radios subidos', () => {
        const runtime = buildThemeCss(def);
        expect(runtime).toContain('@supports (corner-shape:squircle){:root{--ts-corner-shape:squircle;');
        for (const [k, v] of Object.entries(Object.fromEntries(bloqueSquircle(build)!.trim().split('\n').map((l) => l.trim().replace(/;$/, '').split(': '))))) {
            expect(runtime).toContain(`${k}:${v};`);
        }
    });
    it("con 'round' explícito emite --ts-corner-shape:round en :root (pisa una base compilada con squircle)", () => {
        const css = buildThemeCss({ ...MIO, cornerShape: 'round' });
        expect(css).toMatch(/^:root\{[^}]*--ts-corner-shape:round;/);
        expect(css).not.toContain('@supports (corner-shape');
    });
    it('sin la opción no emite nada de la forma (hereda la de la base)', () => {
        expect(buildThemeCss(MIO)).not.toContain('corner-shape');
    });
    it('el bloque va después del :root y toma los radios que el tema cambia', () => {
        const css = buildThemeCss({ ...def, radius: { md: '10px' } });
        expect(css.indexOf(':root{')).toBeLessThan(css.indexOf('@supports (corner-shape'));
        expect(css).toContain('--ts-radius-sm:10px;');
    });
    it('un tema locked ignora cornerShape', () => {
        expect(buildThemeCss({ ...def, locked: true })).not.toContain('corner-shape');
    });
});

describe('cornerShape en DTCG', () => {
    it('sale en $extensions, con round por defecto', () => {
        const dtcg = (def: Partial<ThemeDef>) => {
            const entry = { name: 'mio', group: 'root' as const, def: { ...MIO, ...def } };
            return JSON.parse(buildTokensDTCG(entry, resolveThemeTokens(entry, {}, defaultStates))).$extensions['com.taishods'];
        };
        expect(dtcg({ cornerShape: 'squircle' }).cornerShape).toBe('squircle');
        expect(dtcg({}).cornerShape).toBe('round');
    });
});
