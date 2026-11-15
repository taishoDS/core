// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildTokensDTCG } from './emit-dtcg';
import { buildThemeCss } from '../lib/theme/createTheme';
import { buildRepoConfig } from '../config/pipeline';
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
const tokensDe = (config: TaishoConfig, nombre = 'mio') => {
    const v = deriveThemeVocabulary(config);
    return buildTokensCSS(resolveThemeTokens(v.themeEntries.find((e) => e.name === nombre)!, v.userFonts, v.defaultStates, v.userScales));
};
const bloque = (css: string, selector: string) => {
    const i = css.indexOf(`${selector} {`);
    return i < 0 ? '' : css.slice(i, css.indexOf('\n}', i));
};

const DENSIDAD: ThemeDef['density'] = {
    comfortable: { 'control-h': { md: 37 }, 'badge-px': { sm: 9 } },
    compact: { 'control-h': { sm: 26 }, spacing: { gaps: { half: 'var(--ts-sizing-10)' }, spaces: { base: 'var(--ts-sizing-20)' } } },
};

describe('tramo 3: themes.<t>.density en el tokens', () => {
    const t = tokensDe(conTema({ density: DENSIDAD }));

    it('comfortable cambia el :root, y sólo lo que el tema define', () => {
        const raiz = bloque(t, ':root');
        expect(raiz).toContain('--ts-control-h-md: 37px;');
        expect(raiz).toContain('--ts-badge-px-sm: 9px;');
        expect(raiz).toContain('--ts-control-h-sm: 32px;');
    });
    it('compact cambia el bloque compact, con sus gaps y spaces', () => {
        const compact = bloque(t, ':where(.ts).compact');
        expect(compact).toContain('--ts-control-h-sm: 26px;');
        expect(compact).toContain('--ts-control-h-md: 32px;');
        expect(compact).toContain('--ts-gap-half: var(--ts-sizing-10);');
        expect(compact).toContain('--ts-space-half: var(--ts-sizing-8);');
        expect(compact).toContain('--ts-space-base: var(--ts-sizing-20);');
        expect(compact).toContain('--ts-gap-base: var(--ts-sizing-18);');
    });
    it('el valor por modo queda en variables propias para el override local, sólo lo que el tema define', () => {
        expect(t).toContain('--ts-density-comfortable-control-h-md: 37px;');
        expect(t).toContain('--ts-density-comfortable-badge-px-sm: 9px;');
        expect(t).toContain('--ts-density-compact-control-h-sm: 26px;');
        expect(t).not.toContain('--ts-density-compact-control-h-md');
    });
    it('el DTCG lleva los valores del tema; compactSpaces sólo cuando difiere de los gaps', () => {
        const v = deriveThemeVocabulary(conTema({ density: DENSIDAD }));
        const entry = v.themeEntries.find((e) => e.name === 'mio')!;
        const arbol = JSON.parse(buildTokensDTCG(entry, resolveThemeTokens(entry, v.userFonts, v.defaultStates, v.userScales)));
        expect(arbol.density.comfortable['control-h'].md.$value).toEqual({ value: 37, unit: 'px' });
        expect(arbol.density.compact['control-h'].sm.$value).toEqual({ value: 26, unit: 'px' });
        expect(arbol.density.compactSpacing.half.$value).toBe('{sizing.10}');
        expect(arbol.density.compactSpaces.base.$value).toBe('{sizing.20}');
        const sin = JSON.parse(buildTokensDTCG(entry, resolveThemeTokens({ ...entry, def: MIO }, v.userFonts, v.defaultStates, v.userScales)));
        expect(sin.density).not.toHaveProperty('compactSpaces');
    });
    it('un tema locked ignora la densidad', () => {
        const c: TaishoConfig = { ...repo, themes: { ...repo.themes, taisho: { ...repo.themes.taisho, density: DENSIDAD } } };
        const tl = tokensDe(c, 'taisho');
        expect(tl).not.toContain('37px');
        expect(tl).not.toContain('--ts-density-');
    });
    it('sin density el tokens no trae variables de densidad por modo', () => {
        expect(tokensDe(conTema({}))).not.toContain('--ts-density-');
    });
});

describe('tramo 3: el override local (density="compact") es condicional', () => {
    it('sin ningún tema con density, los componentes salen igual que siempre: valores fijos', () => {
        const css = compile(conTema({}), []).css;
        expect(css).toBe(compile(repo, []).css);
        expect(css).toContain('--ts-control-h-sm: 28px;');
        expect(css).not.toContain('--ts-density-');
    });
    it('con un tema que define density, el override lee la variable y cae al valor de fábrica', () => {
        const css = compile(conTema({ density: DENSIDAD }), []).css;
        expect(css).toContain('--ts-control-h-sm: var(--ts-density-compact-control-h-sm, 28px);');
        expect(css).toContain('--ts-control-h-md: var(--ts-density-comfortable-control-h-md, 40px);');
    });
    it('un tema locked que define density no cambia los componentes', () => {
        const c: TaishoConfig = { ...repo, themes: { ...repo.themes, taisho: { ...repo.themes.taisho, density: DENSIDAD } } };
        expect(compile(c, []).css).toBe(compile(repo, []).css);
    });
});

describe('tramo 3: validación de density', () => {
    const e = (density: unknown) => errores(conTema({ density } as Partial<ThemeDef>));

    it('una familia que no existe es un Error', () => {
        expect(e({ compact: { 'control-x': { md: 3 } } })[0]).toMatchObject({ path: 'themes.mio.density.compact.control-x', code: 'theme-name-unknown' });
    });
    it('un talle que la familia no tiene es un Error (xs sólo en control-h y button-px)', () => {
        expect(e({ comfortable: { 'field-px': { xs: 3 } } })[0]).toMatchObject({ path: 'themes.mio.density.comfortable.field-px.xs', code: 'theme-name-unknown' });
        expect(e({ comfortable: { 'control-h': { xs: 22, xl: 3 } } }).map((x) => x.path)).toEqual(['themes.mio.density.comfortable.control-h.xl']);
    });
    it('el valor es un número de px, 0 o más', () => {
        for (const px of ['32', -1, Number.NaN, null]) {
            expect(e({ comfortable: { 'control-h': { md: px } } })[0], String(px)).toMatchObject({ code: 'value-type-invalid', params: { kind: 'px' } });
        }
        expect(e({ comfortable: { 'control-h': { md: 0 } } })).toEqual([]);
    });
    it('spacing sólo existe en compact, y sólo con gaps/spaces de fábrica', () => {
        expect(e({ comfortable: { spacing: { gaps: { half: '1px' } } } })[0]).toMatchObject({ path: 'themes.mio.density.comfortable.spacing', code: 'theme-name-unknown' });
        expect(e({ compact: { spacing: { gaps: { loose: '1px' } } } })[0]).toMatchObject({ path: 'themes.mio.density.compact.spacing.gaps.loose', code: 'theme-name-unknown' });
        expect(e({ compact: { spacing: { rows: {} } } })[0]).toMatchObject({ path: 'themes.mio.density.compact.spacing.rows', code: 'theme-key-unknown' });
        expect(e({ compact: { spacing: { gaps: { half: '1px; x' } } } })[0].code).toBe('unsafe-value');
    });
    it('una clave de density que no es comfortable ni compact es un Error', () => {
        expect(errores(conTema({ density: { dense: {} } } as unknown as Partial<ThemeDef>))[0]).toMatchObject({ path: 'themes.mio.density.dense', code: 'theme-key-unknown' });
    });
    it('una densidad válida no da errores', () => {
        expect(e(DENSIDAD)).toEqual([]);
    });
});

describe('tramo 3: createTheme', () => {
    it('comfortable va al :root y compact a su bloque, con el compact de los gaps pisados', () => {
        const css = buildThemeCss({ ...MIO, density: DENSIDAD, spacing: { gaps: { half: '10px', base: '30px' } } });
        expect(css).toContain('--ts-control-h-md:37px;');
        const compact = css.slice(css.indexOf(':where(.ts).compact{'));
        expect(compact).toContain('--ts-control-h-sm:26px;');
        expect(compact).toContain('--ts-gap-half:var(--ts-sizing-10);');
        expect(compact).toContain('--ts-gap-base:var(--ts-sizing-18);');
        expect(compact).toContain('--ts-space-base:var(--ts-sizing-20);');
    });
    it('sin density ni spacing no emite bloque compact', () => {
        expect(buildThemeCss(MIO)).not.toContain('.compact');
    });
    it('un tema locked ignora la densidad', () => {
        expect(buildThemeCss({ ...MIO, locked: true, density: DENSIDAD })).not.toContain('37px');
    });
});
