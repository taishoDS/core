// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildRepoConfig } from '../config/pipeline';
import type { ThemeDef } from '../config/taisho.types';

const repo = buildRepoConfig();
const PRINCIPAL: ThemeDef = {
    colors: { brand: '#0066ff' },
    fontSizes: { '16': '17px' },
    fontWeights: { semibold: '650' },
    borderWidths: { '2': '3px' },
    shadows: { md: '0 4px 12px var(--color-grayAlpha-300)' },
    density: {
        comfortable: { 'control-h': { md: 44 } },
        compact: { 'control-h': { md: 34 }, spacing: { gaps: { base: 'var(--ts-sizing-16)' } } },
    },
};
const config: TaishoConfig = {
    ...repo,
    themes: { ...repo.themes, principal: PRINCIPAL },
    extend: {
        fontSizes: { '30': 'clamp(1.5rem, 3vw, 2rem)' },
        lineHeights: { '30': '2.25rem' },
        opacities: { '35': '0.35' },
        motion: { durations: { slowest: '800ms' }, easings: { snappy: 'cubic-bezier(0.2, 0, 0, 1)' } },
        sizing: [30, 100],
    },
};
const USO = '<h2 class="ts type-heading-30">Facturación del equipo</h2><div class="ts p-30 opacity-35 duration-slowest ease-snappy">Borrador</div>';

describe('un tema real con las claves nuevas', () => {
    it('la config no da errores ni avisos de motor', () => {
        expect(() => deriveThemeVocabulary(config)).not.toThrow();
        const { warnings } = compile(config, [{ file: 'a.html', content: USO }], { onDemand: true });
        expect(warnings).toEqual([]);
    });
    it('a demanda trae las clases usadas, y sólo ésas de lo sumado', () => {
        const css = compile(config, [{ file: 'a.html', content: USO }], { onDemand: true }).css;
        for (const clase of ['type-heading-30', 'p-30', 'opacity-35', 'duration-slowest', 'ease-snappy']) {
            expect(css, clase).toContain(`.${clase}`);
        }
        for (const clase of ['p-100', 'w-30', 'text-30', 'leading-30', 'type-copy-30']) expect(css, clase).not.toContain(`.${clase} `);
        expect(css).not.toContain('.opacity-85');
    });
    it('el tokens del tema trae sus valores y los niveles sumados; el de otro tema, sólo los niveles', () => {
        const v = deriveThemeVocabulary(config);
        const tokensDe = (nombre: string) => buildTokensCSS(resolveThemeTokens(v.themeEntries.find((e) => e.name === nombre)!, v.userFonts, v.defaultStates, v.userScales));
        const principal = tokensDe('principal');
        for (const linea of [
            '--ts-fontsize-16: 17px;', '--ts-fw-semibold: 650;', '--ts-border-width-2: 3px;', '--ts-control-h-md: 44px;',
            '--ts-fontsize-30: clamp(1.5rem, 3vw, 2rem);', '--ts-lh-30: 2.25rem;', '--ts-opacity-35: 0.35;', '--ts-duration-slowest: 800ms;',
            '--ts-ease-snappy: cubic-bezier(0.2, 0, 0, 1);', '--ts-sizing-30: 30px;', '--ts-sizing-100: 100px;', '--ts-duration-slowest: 1ms;',
        ]) expect(principal, linea).toContain(linea);
        const taisho = tokensDe('taisho');
        expect(taisho).toContain('--ts-sizing-30: 30px;');
        expect(taisho).toContain('--ts-fontsize-16: var(--ts-sizing-16);');
        expect(taisho).not.toContain('17px');
    });
});

describe('quien no usa nada obtiene la salida de siempre', () => {
    const sinNada: TaishoConfig = { ...repo, themes: { ...repo.themes, principal: { colors: { brand: '#0066ff' } } } };
    it('el CSS y el tokens no cambian con una config sin las claves nuevas', () => {
        expect(compile(sinNada, []).css).toBe(compile(repo, []).css);
        const v = deriveThemeVocabulary(sinNada);
        const w = deriveThemeVocabulary(repo);
        expect(v.userScales).toEqual(w.userScales);
        const tokens = (voc: typeof v, nombre: string) => buildTokensCSS(resolveThemeTokens(voc.themeEntries.find((e) => e.name === nombre)!, voc.userFonts, voc.defaultStates, voc.userScales));
        expect(tokens(v, 'taisho')).toBe(tokens(w, 'taisho'));
    });
});

describe('utilities propias que componen niveles sumados en extend', () => {
    const extend = {
        fontSizes: { '30': '30px', '22': '22px' },
        lineHeights: { '30': '36px', '22': '30px' },
        shadows: { mega: '0 40px 80px var(--color-grayAlpha-300)' },
    };
    it('type-heading-N, type-copy-N, surface-* y floating-* se pueden componer', () => {
        const c: TaishoConfig = {
            ...repo, extend,
            utilities: { titulo: ['type-heading-30'], texto: ['type-copy-22'], panel: ['surface-mega'], flota: ['floating-mega'] },
        };
        expect(() => deriveThemeVocabulary(c)).not.toThrow();
        const css = compile(c, [{ file: 'a.html', content: '<p class="ts titulo texto panel flota">x</p>' }], { onDemand: true }).css;
        for (const clase of ['titulo', 'texto', 'panel', 'flota']) expect(css, clase).toContain(`.${clase}`);
    });
    it('sin extend, esos nombres siguen sin existir', () => {
        expect(() => deriveThemeVocabulary({ ...repo, utilities: { titulo: ['type-heading-30'] } })).toThrow(/type-heading-30/);
    });
});
