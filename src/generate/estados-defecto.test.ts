// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, DEFAULT_STATES, type TaishoConfig } from './vocabulary';

const base: TaishoConfig = { themes: { principal: { colors: { brand: '#4F46E5' } } }, fontFaces: [] };
const html = [{ file: 'a.html', content: '<div class="ts"><button class="button variant-danger">x</button></div>' }];

describe('defaultStates por defecto', () => {
    it('sin defaultStates: los 4 de fábrica, y genera sin error', () => {
        expect(deriveThemeVocabulary(base).defaultStates).toEqual(DEFAULT_STATES);
        expect(() => compile(base, html)).not.toThrow();
    });
    it('sólo danger: ese + los otros 3 de fábrica', () => {
        const v = deriveThemeVocabulary({ ...base, defaultStates: { danger: '#FF0000' } });
        expect(v.defaultStates).toEqual({ ...DEFAULT_STATES, danger: '#FF0000' });
        expect(v.userStates.danger).toBe('#FF0000');
        expect(() => compile({ ...base, defaultStates: { danger: '#FF0000' } }, html)).not.toThrow();
    });
    it('los de fábrica son los de taisho init', () => {
        expect(DEFAULT_STATES).toEqual({ success: '#16A34A', warning: '#D97706', info: '#2563EB', danger: '#D42424' });
    });
    it('un estado propio extra se conserva y no pisa los de fábrica', () => {
        const v = deriveThemeVocabulary({ ...base, defaultStates: { neutral: '#888888' } });
        expect(Object.keys(v.defaultStates)).toEqual(['neutral', 'success', 'warning', 'info', 'danger']);
    });
    it('una config completa conserva su orden', () => {
        const mio = { danger: '#111111', success: '#222222', info: '#333333', warning: '#444444' };
        expect(Object.keys(deriveThemeVocabulary({ ...base, defaultStates: mio }).defaultStates)).toEqual(Object.keys(mio));
    });
});

describe('los estados de fábrica no disparan avisos de contraste', () => {
    it('ninguno se corre de luminosidad (si no, `taisho init` falla `--strict` de entrada)', async () => {
        const { resolveThemeTokens } = await import('./emit-tokens');
        const v = deriveThemeVocabulary(base);
        const avisos = v.themeEntries.flatMap((e) => resolveThemeTokens(e, v.userFonts, v.defaultStates, v.userScales).warnings);
        expect(avisos).toEqual([]);
    });
});
