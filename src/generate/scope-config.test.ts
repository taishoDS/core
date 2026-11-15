// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { compile } from './compile';
import { warningLine } from '../generate-cli/mensajes-avisos';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildRepoConfig } from '../config/pipeline';

const repo = buildRepoConfig();
const scope = (extra: Partial<TaishoConfig> = {}): TaishoConfig => ({ ...repo, scope: 'ts', ...extra });
const tokens = (config: TaishoConfig) => {
    const v = deriveThemeVocabulary(config);
    const model = resolveThemeTokens(v.themeEntries[0], v.userFonts, v.defaultStates, v.userScales);
    return buildTokensCSS(model);
};

describe('scope: validación', () => {
    it('sin la clave (o undefined) es el modo scope, el único', () => {
        expect(() => deriveThemeVocabulary(repo)).not.toThrow();
        expect(() => deriveThemeVocabulary({ ...repo, scope: undefined })).not.toThrow();
        expect(compile(repo, []).css).toContain(':where(.ts).button {');
    });
    it('acepta "ts", avisa que ya es el único modo y el CSS es el mismo', () => {
        expect(() => deriveThemeVocabulary(scope())).not.toThrow();
        const con = compile(scope(), []);
        expect(con.warnings).toEqual([{ code: 'scope-option', params: {} }]);
        expect(con.warnings.map((w) => warningLine(w, 'es'))).toEqual(["`scope: 'ts'` ya es el único modo: se quita la clave."]);
        expect(con.css).toBe(compile(repo, []).css);
        expect(compile(repo, []).warnings).toEqual([]);
    });
    it('`iconsHtmlDirs` corta con el error exacto', () => {
        expect(() => deriveThemeVocabulary({ ...repo, iconsHtmlDirs: ['src'] } as never)).toThrow(
            'taisho config: iconsHtmlDirs ya no existe: se declara `content`.',
        );
    });
    it('cualquier otro valor es un error con el formato de resolve-extend', () => {
        for (const valor of ['x', '', 'TS', null, true]) {
            expect(() => deriveThemeVocabulary({ ...repo, scope: valor as never })).toThrow(
                `taisho config: scope tiene un valor inválido (${JSON.stringify(valor)}): el único valor es 'ts', y ya es el único modo: se quita la clave.`,
            );
        }
    });
    it('una utilidad propia no puede llamarse como un nombre corto del DS ni "ts"', () => {
        expect(() => deriveThemeVocabulary(scope({ utilities: { hidden: ['flex'] } }))).toThrow(
            'taisho config: utilities.hidden choca con un nombre corto del DS en el modo scope.',
        );
        expect(() => deriveThemeVocabulary(scope({ utilities: { ts: ['flex'] } }))).toThrow('utilities.ts');
    });
    it('en scope las composiciones usan nombres cortos vigentes, con sugerencia', () => {
        expect(() => deriveThemeVocabulary(scope({ utilities: { 'card-hero': ['p-double', 'radius-lg'] } }))).not.toThrow();
        expect(() => deriveThemeVocabulary(scope({ utilities: { 'card-hero': ['ts-p-double'] } }))).toThrow('¿Se quiso decir "p-double"?');
        expect(() => deriveThemeVocabulary(scope({ utilities: { 'card-hero': ['ml-half'] } }))).toThrow('¿Se quiso decir "ms-half"?');
        expect(() => deriveThemeVocabulary(scope({ utilities: { a: ['p-double'], b: ['a', 'flex'] } }))).not.toThrow();
    });
});

describe('utilities: nombres reservados', () => {
    it('un modificador conocido o la clase de tema no puede ser una utilidad propia', () => {
        for (const n of ['variant-primary', 'size-sm', 'is-active', 'dark']) {
            expect(() => deriveThemeVocabulary(scope({ utilities: { [n]: ['flex'] } }))).toThrow(`utilities.${n} es un nombre inválido`);
        }
    });
});

describe('scope: tokens', () => {
    it('la clase de contexto de densidad sale detrás de :where(.ts)', () => {
        const css = tokens(scope());
        expect(css).toContain(':where(.ts).compact {');
        expect(css).not.toContain('density-compact');
        expect(css).not.toContain('.ts-compact');
    });
    it('sin la clave sale lo mismo', () => {
        expect(tokens(repo)).toBe(tokens(scope()));
    });
});
