// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildTokensCSS, resolveThemeTokens } from './emit-tokens';
import { buildDtcg } from './emit-dtcg';
import { pruneTheme } from './podar-tema';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { ConfigError } from './errores-config';
import { buildRepoConfig } from '../config/pipeline';
import { defaultStates } from '../config/taisho.user';
import { buildThemeCss } from '../lib/theme/createTheme';
import type { ThemeDef, ThemeEntry } from '../config/taisho.types';

const repo = buildRepoConfig();
const MIO: ThemeDef = { colors: { brand: '#3b82f6' } };
const entrada = (def: ThemeDef): ThemeEntry => ({ name: 'principal', group: 'root', def });
const tokens = (def: ThemeDef) => buildTokensCSS(resolveThemeTokens(entrada(def), {}, defaultStates));
const conTema = (def: Partial<ThemeDef>): TaishoConfig => ({ ...repo, themes: { ...repo.themes, mio: { ...MIO, ...def } } });
const errores = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { if (e instanceof ConfigError) return e.errors; throw e; }
    return [];
};
const ROTO = 'oklch(0.985 0.005 90)';

describe('colores fijos: blanco y negro', () => {
    it('salen como literal, sin light-dark() y fuera del bloque P3', () => {
        const css = tokens(MIO);
        expect(css).toContain('  --color-white: oklch(1 0 0);\n');
        expect(css).toContain('  --color-black: oklch(0 0 0);\n');
        expect(css).not.toMatch(/--color-(white|black): light-dark/);
        const p3 = css.slice(css.indexOf('@media (color-gamut: p3)'));
        expect(p3).not.toMatch(/--color-(white|black):/);
    });
    it('un blanco roto en neutral.fixed lo cambia en el generador y en createTheme', () => {
        const def: ThemeDef = { ...MIO, neutral: { fixed: { white: ROTO } } };
        const css = tokens(def);
        expect(css).toContain(`--color-white: ${ROTO};`);
        expect(css).toContain('--color-black: oklch(0 0 0);');
        const t = buildThemeCss(def);
        expect(t).toContain(`--color-white:${ROTO};`);
        expect(t).not.toContain('--color-black:');
        expect(buildThemeCss(MIO)).not.toMatch(/--color-(white|black):/);
    });
    it('un tema bloqueado ignora neutral.fixed y usa los de fábrica', () => {
        const css = tokens({ ...MIO, locked: true, neutral: { fixed: { white: ROTO } } });
        expect(css).toContain('--color-white: oklch(1 0 0);');
        expect(css).not.toContain(ROTO);
    });
    it('la poda los quita cuando nadie los referencia y los conserva si se usan', () => {
        const css = tokens(MIO);
        expect(pruneTheme(css, '.x { color: red; }')).not.toMatch(/--color-(white|black):/);
        const usado = pruneTheme(css, '.x { color: var(--color-white); }');
        expect(usado).toContain('--color-white: oklch(1 0 0);');
        expect(usado).not.toContain('--color-black:');
    });
    it('colors.white / colors.black es fixed-in-colors y manda a neutral.fixed', () => {
        const e = errores(conTema({ colors: { brand: '#3b82f6', white: '#fff' } }));
        expect(e[0]).toMatchObject({ path: 'themes.mio.colors.white', code: 'fixed-in-colors', params: { name: 'white' } });
        expect(errores(conTema({ colors: { brand: '#3b82f6', black: '#000' } }))[0]).toMatchObject({ code: 'fixed-in-colors' });
        expect(() => deriveThemeVocabulary(conTema({ colors: { brand: '#3b82f6', white: '#fff' } }))).toThrow('themes.<tema>.neutral.fixed.white');
    });
    it('una clave distinta de white/black en fixed es theme-name-unknown; un valor inseguro, error', () => {
        const e = errores(conTema({ neutral: { fixed: { gris: '#888' } } as never }));
        expect(e[0]).toMatchObject({ path: 'themes.mio.neutral.fixed.gris', code: 'theme-name-unknown' });
        expect(errores(conTema({ neutral: { fixed: { white: ROTO } } }))).toEqual([]);
        expect(errores(conTema({ neutral: { fixed: { white: 'red; x' } } }))[0]).toMatchObject({ code: 'unsafe-value' });
    });
    it('DTCG: color.white y color.black sólo con light', () => {
        const dtcg = buildDtcg(entrada(MIO), resolveThemeTokens(entrada(MIO), {}, defaultStates)) as { color: Record<string, { $type?: string; $value: string; $extensions?: Record<string, Record<string, string>> }> };
        expect(dtcg.color.white.$type).toBe('color');
        expect(JSON.stringify(dtcg.color.white)).not.toMatch(/dark|p3/);
        expect(JSON.stringify(dtcg.color.black)).not.toMatch(/dark|p3/);
        expect(JSON.stringify(dtcg.color.white)).toContain('#ffffff');
        expect(JSON.stringify(dtcg.color.black)).toContain('#000000');
    });
});
