// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
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
const mensaje = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { return (e as Error).message; }
    return '';
};
const tokensDe = (config: TaishoConfig, nombre = 'mio') => {
    const v = deriveThemeVocabulary(config);
    return buildTokensCSS(resolveThemeTokens(v.themeEntries.find((e) => e.name === nombre)!, v.userFonts, v.defaultStates, v.userScales));
};
const reglaRtl = (css: string) => css.split(/\n|\}/).find((l) => l.includes(':lang(ar)'))!;

describe('tramo 1: extend.fontSizes / lineHeights / letterSpacing / fontWeights', () => {
    const extend = {
        fontSizes: { '30': 'clamp(var(--ts-sizing-24), 3vw, var(--ts-sizing-32))' },
        lineHeights: { '30': 'var(--ts-sizing-36)' },
        letterSpacing: { loose: '0.2em' },
        fontWeights: { heavy: '850' },
    };
    const config = conTema({}, { extend });
    const css = compile(config, []).css;

    it('genera las clases de cada familia', () => {
        for (const clase of ['text-30', 'leading-30', 'tracking-loose', 'weight-heavy', 'type-heading-30']) expect(css).toContain(`:where(.ts).${clase} {`);
        expect(css).not.toContain(':where(.ts).type-copy-30 {');
    });
    it('un tamaño dentro de 12 a 24 también genera type-copy', () => {
        const c = compile(conTema({}, { extend: { fontSizes: { '22': '22px' }, lineHeights: { '22': '30px' } } }), []).css;
        expect(c).toContain(':where(.ts).type-copy-22 {');
        expect(c).toContain(':where(.ts).type-heading-22 {');
    });
    it('los tokens salen en todos los temas, también los locked', () => {
        const v = deriveThemeVocabulary(config);
        expect(v.themeEntries.some((e) => e.def.locked)).toBe(true);
        for (const e of v.themeEntries) {
            const t = tokensDe(config, e.name);
            for (const linea of ['--ts-fontsize-30: clamp(', '--ts-lh-30: var(--ts-sizing-36);', '--ts-ls-loose: 0.2em;', '--ts-fw-heavy: 850;']) expect(t).toContain(linea);
        }
    });
    it('el reset trae los interlineados y el tracking sumados, para los idiomas RTL', () => {
        const regla = reglaRtl(css);
        expect(regla).toContain('--ts-lh-30: max(1.35em, 36px);');
        expect(regla).toContain('--ts-ls-loose: 0em;');
    });
    it('sin extend la regla RTL es la de siempre', () => {
        const regla = reglaRtl(compile(repo, []).css);
        expect(regla).not.toContain('--ts-lh-30');
        expect(regla).toContain('--ts-lh-16: max(1.35em, 24px);');
    });
    it('un tamaño sin interlineado con su nombre es un Error', () => {
        const e = errores(conTema({}, { extend: { fontSizes: { '30': '30px' } } }));
        expect(e).toHaveLength(1);
        expect(e[0]).toMatchObject({ path: 'extend.fontSizes.30', code: 'font-size-needs-line-height' });
        expect(mensaje(conTema({}, { extend: { fontSizes: { '30': '30px' } } }))).toContain('extend.lineHeights.30');
    });
    it('un tamaño puede usar el interlineado de fábrica del mismo nombre', () => {
        expect(errores(conTema({}, { extend: { fontSizes: { '96': '96px' } } }))).toEqual([]);
    });
    it('nombres numéricos: un nombre que no es un entero de 1 a 999 es un Error', () => {
        for (const nombre of ['big', '0', '1.5', '1000', '-3']) {
            const e = errores(conTema({}, { extend: { lineHeights: { [nombre]: '20px' } } }));
            expect(e[0], nombre).toMatchObject({ code: 'scale-name-numeric' });
        }
    });
    it('extend que pisa un nombre del DS es un Error y manda a themes', () => {
        const e = errores(conTema({}, { extend: { fontSizes: { '24': '24px' }, fontWeights: { bold: '800' }, letterSpacing: { tight: '0' } } }));
        expect(e.map((x) => [x.path, x.code])).toEqual([
            ['extend.fontSizes.24', 'scale-exists'], ['extend.letterSpacing.tight', 'scale-exists'], ['extend.fontWeights.bold', 'scale-exists'],
        ]);
        expect(mensaje(conTema({}, { extend: { fontWeights: { bold: '800' } } }))).toContain('themes.<tema>.fontWeights.bold');
    });
    it('el peso va de 1 a 1000, y un valor CSS inseguro es un Error', () => {
        for (const peso of ['0', '1001', 'bold', '5.5']) expect(errores(conTema({}, { extend: { fontWeights: { heavy: peso } } }))[0].code, peso).toBe('value-type-invalid');
        expect(errores(conTema({}, { extend: { letterSpacing: { loose: '1em; x' } } }))[0].code).toBe('unsafe-value');
    });
    it('un nombre que no es de escala (mayúsculas, guion bajo) es un Error', () => {
        expect(errores(conTema({}, { extend: { letterSpacing: { Loose: '1em' } } }))[0].code).toBe('scale-name-invalid');
    });
});

describe('tramo 1: themes.<t>.fontSizes / lineHeights / letterSpacing / fontWeights', () => {
    it('cambia el valor de un nombre existente y de uno sumado en extend', () => {
        const t = tokensDe(conTema(
            { fontSizes: { '16': '17px', '30': '31px' }, fontWeights: { bold: '650' } },
            { extend: { fontSizes: { '30': '30px' }, lineHeights: { '30': '36px' } } },
        ));
        expect(t).toContain('--ts-fontsize-16: 17px;');
        expect(t).toContain('--ts-fontsize-30: 31px;');
        expect(t).toContain('--ts-fw-bold: 650;');
    });
    it('un nombre que la escala no tiene es un Error con la pista de extend', () => {
        const e = errores(conTema({ fontSizes: { '30': '30px' } }));
        expect(e[0]).toMatchObject({ path: 'themes.mio.fontSizes.30', code: 'theme-name-unknown', params: { extendPath: 'extend.fontSizes' } });
    });
    it('el peso de un tema va de 1 a 1000', () => {
        expect(errores(conTema({ fontWeights: { bold: '1200' } }))[0].code).toBe('value-type-invalid');
    });
    it('un tema locked ignora los valores y recibe extend', () => {
        const c: TaishoConfig = {
            ...repo, extend: { fontSizes: { '30': '30px' }, lineHeights: { '30': '36px' } },
            themes: { ...repo.themes, taisho: { ...repo.themes.taisho, fontSizes: { '16': '77px' }, lineHeights: { '16': '77px' } } },
        };
        const t = tokensDe(c, 'taisho');
        expect(t).toContain('--ts-fontsize-30: 30px;');
        expect(t).not.toContain('77px');
        expect(t).not.toContain(':lang(ar)');
    });
    it('el interlineado del tema llega a los idiomas RTL: una regla en el tokens, sólo con lo que cambia', () => {
        const regla = reglaRtl(tokensDe(conTema({ lineHeights: { '16': '30px', '30': '40px' } }, { extend: { lineHeights: { '30': '36px' } } })));
        expect(regla).toContain('--ts-lh-16: max(1.35em, 30px);');
        expect(regla).toContain('--ts-lh-30: max(1.35em, 40px);');
        expect(regla).not.toContain('--ts-lh-12');
        expect(regla).not.toContain('--ts-ls-');
    });
    it('un interlineado con var(--ts-sizing-N) sale en px en esa regla', () => {
        expect(reglaRtl(tokensDe(conTema({ lineHeights: { '16': 'var(--ts-sizing-32)' } })))).toContain('--ts-lh-16: max(1.35em, 32px);');
    });
    it('con `normal` cambiado, el tracking de los idiomas RTL lo sigue', () => {
        const regla = reglaRtl(tokensDe(conTema({ letterSpacing: { normal: '0.01em' } })));
        expect(regla).toContain('--ts-ls-tight: 0.01em;');
        expect(regla).toContain('--ts-ls-widest: 0.01em;');
        expect(regla).not.toContain('--ts-ls-normal');
    });
    it('sin cambios de interlineado ni de `normal`, el tokens no trae la regla RTL', () => {
        expect(tokensDe(conTema({}))).not.toContain(':lang(ar)');
        expect(tokensDe(conTema({ fontSizes: { '16': '17px' }, letterSpacing: { wide: '0.03em' } }))).not.toContain(':lang(ar)');
    });
    it('createTheme: mismas variables y misma regla RTL que el build', () => {
        const def: ThemeDef = { ...MIO, fontSizes: { '16': '17px' }, lineHeights: { '16': '30px' }, letterSpacing: { normal: '0.01em' }, fontWeights: { bold: '650' } };
        const runtime = buildThemeCss(def);
        for (const v of ['--ts-fontsize-16:17px;', '--ts-lh-16:30px;', '--ts-ls-normal:0.01em;', '--ts-fw-bold:650;']) expect(runtime).toContain(v);
        const regla = reglaRtl(runtime);
        expect(regla).toContain('--ts-lh-16: max(1.35em, 30px);');
        expect(regla).toContain('--ts-ls-tighter: 0.01em;');
        expect(buildThemeCss(MIO)).not.toContain(':lang(ar)');
    });
});

describe('interlineado sin unidad en los idiomas RTL', () => {
    it('`normal` tampoco entra en max(): vale 1,35', () => {
        const regla = reglaRtl(tokensDe(conTema({ lineHeights: { '16': 'normal' } })));
        expect(regla).toContain('--ts-lh-16: 1.35;');
        expect(regla).not.toContain('normal)');
    });
    it('no mezcla un número con una longitud en max(): se compara con 1,35 al emitir', () => {
        const c = conTema({ lineHeights: { '16': '1.7', '12': '1.2' } }, { extend: { lineHeights: { '30': '1.8' } } });
        for (const css of [tokensDe(c), compile(c, []).css, buildThemeCss({ ...MIO, lineHeights: { '16': '1.7', '12': '1.2' } })]) {
            expect(reglaRtl(css)).not.toMatch(/max\(1\.35em, [\d.]+\)/);
        }
        for (const css of [tokensDe(c), buildThemeCss({ ...MIO, lineHeights: { '12': '1.2' } })]) expect(reglaRtl(css)).toContain('--ts-lh-12: 1.35;');
        expect(reglaRtl(tokensDe(c))).toContain('--ts-lh-16: 1.7;');
        expect(reglaRtl(compile(c, []).css)).toContain('--ts-lh-30: 1.8;');
    });
});
