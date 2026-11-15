// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { parseUtilities } from './emit-flat';
import { buildAtomicCSS } from './emit-atomic';
import { buildVocabularyColors } from '../config/scales';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildTokensDTCG } from './emit-dtcg';
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
const mensaje = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { return (e as Error).message; }
    return '';
};
const tokensDe = (config: TaishoConfig, nombre = 'mio') => {
    const v = deriveThemeVocabulary(config);
    return buildTokensCSS(resolveThemeTokens(v.themeEntries.find((e) => e.name === nombre)!, v.userFonts, v.defaultStates, v.userScales));
};

// Compila el CSS atómico completo dos veces: con la máquina cargada pasa los 5 s por defecto sin que nada esté mal.
describe('tramo 4: extend.sizing', { timeout: 60_000 }, () => {
    const config = conTema({}, { extend: { sizing: [30, 100] } });
    const css = compile(config, []).css;

    it('genera el token en todos los temas, también los locked', () => {
        const v = deriveThemeVocabulary(config);
        expect(v.themeEntries.some((e) => e.def.locked)).toBe(true);
        for (const e of v.themeEntries) {
            const t = tokensDe(config, e.name);
            expect(t).toContain('--ts-sizing-30: 30px;');
            expect(t).toContain('--ts-sizing-100: 100px;');
        }
    });
    it('genera las clases de cada nivel (las mismas que un nivel de fábrica) y el modificador icon-N', () => {
        const nombres = (c: TaishoConfig) => parseUtilities(buildAtomicCSS(buildVocabularyColors({}, {}), {}, deriveThemeVocabulary(c).userScales)).map((b) => b.name);
        const sumadas = nombres(config).filter((n) => !nombres(repo).includes(n));
        expect(sumadas).toHaveLength(36 * 2);
        for (const clase of ['p-30', 'w-100', 'h-30', 'gap-30', 'size-100', 'top-30', 'mt-neg-30', 'translate-x-30']) expect(css, clase).toContain(`:where(.ts).${clase} {`);
        expect(css).toContain('&.icon-30');
        expect(css).toContain('width: var(--ts-sizing-30)');
    });
    it('un interlineado o un tamaño de texto pueden usar el nivel nuevo, también en la regla RTL (en px)', () => {
        const c = conTema({}, { extend: { sizing: [30], lineHeights: { '30': 'var(--ts-sizing-30)' }, fontSizes: { '30': 'var(--ts-sizing-30)' } } });
        const regla = compile(c, []).css.split('\n').find((l) => l.includes(':lang(ar)'))!;
        expect(regla).toContain('--ts-lh-30: max(1.35em, 30px);');
    });
    it('el DTCG trae el nivel', () => {
        const v = deriveThemeVocabulary(config);
        const entry = v.themeEntries.find((e) => e.name === 'mio')!;
        const arbol = JSON.parse(buildTokensDTCG(entry, resolveThemeTokens(entry, v.userFonts, v.defaultStates, v.userScales)));
        expect(arbol.sizing['30'].$value).toEqual({ value: 30, unit: 'px' });
    });
    it('sin extend.sizing no aparece ningún nivel nuevo', () => {
        expect(compile(repo, []).css).not.toContain('.p-30 {');
        expect(tokensDe(conTema({}))).not.toContain('--ts-sizing-30');
    });
    it('el nivel de la lista se ordena con los de fábrica', () => {
        const t = tokensDe(config);
        expect(t.indexOf('--ts-sizing-28:')).toBeLessThan(t.indexOf('--ts-sizing-30:'));
        expect(t.indexOf('--ts-sizing-30:')).toBeLessThan(t.indexOf('--ts-sizing-32:'));
    });
});

describe('tramo 4: validación de extend.sizing', () => {
    const e = (sizing: unknown) => errores(conTema({}, { extend: { sizing: sizing as number[] } }));

    it('un nivel que ya existe es un Error: el sizing es fijo', () => {
        expect(e([24])[0]).toMatchObject({ path: 'extend.sizing[0]', code: 'sizing-exists', params: { level: 24, repeated: false } });
        expect(mensaje(conTema({}, { extend: { sizing: [24] } }))).toContain('El sizing es fijo');
    });
    it('un nivel repetido en la lista es un Error', () => {
        expect(e([30, 30])[0]).toMatchObject({ path: 'extend.sizing[1]', code: 'sizing-exists', params: { repeated: true } });
    });
    it('sólo enteros de 1 a 999', () => {
        for (const n of [0, 1000, -4]) expect(e([n])[0], String(n)).toMatchObject({ code: 'scale-name-numeric' });
        for (const n of [1.5, '30', null, Number.NaN]) expect(e([n])[0], String(n)).toMatchObject({ code: 'value-type-invalid' });
    });
    it('los errores salen juntos, uno por nivel', () => {
        expect(e([24, 30, 0, 30]).map((x) => x.path)).toEqual(['extend.sizing[0]', 'extend.sizing[2]', 'extend.sizing[3]']);
    });
    it('themes.<t>.sizing es una clave desconocida, con la pista extend.sizing', () => {
        const config = conTema({ sizing: { '30': 30 } } as unknown as Partial<ThemeDef>);
        const [primero] = errores(config);
        expect(primero).toMatchObject({ path: 'themes.mio.sizing', code: 'theme-key-unknown', params: { key: 'sizing', extendPath: 'extend.sizing' } });
        expect(mensaje(config)).toContain('extend.sizing');
    });
    it('una errata de una clave de tema no manda a extend: sugiere la clave', () => {
        const [primero] = errores(conTema({ fontSize: { '30': '30px' } } as unknown as Partial<ThemeDef>));
        expect(primero.params).toMatchObject({ suggestion: 'fontSizes' });
        expect(primero.params).not.toHaveProperty('extendPath');
    });
    it('niveles sueltos válidos no dan errores', () => {
        expect(e([30, 100, 300, 999])).toEqual([]);
    });
});
