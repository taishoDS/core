// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';

const repo = buildRepoConfig();
const con = (extra: Partial<TaishoConfig>): TaishoConfig => ({ ...repo, ...extra });
const mensaje = (fn: () => unknown): string => {
    try { fn(); } catch (e) { return (e as Error).message; }
    throw new Error('no lanzó');
};

describe('extend / utilities: errores juntos', () => {
    it('con UN error, el mensaje es exactamente el de siempre (una línea)', () => {
        const m = mensaje(() => deriveThemeVocabulary(con({ extend: { radius: { md: '1px' } } })));
        expect(m).toBe('taisho config: extend.radius.md ya existe en el DS. Para cambiar su valor se usa themes.<tema>.radius.md.');
    });
    it('N errores en claves distintas -> N líneas, en el orden de la config', () => {
        const m = mensaje(() => deriveThemeVocabulary(con({
            extend: { radius: { md: '1px', Mal: '2px' }, screens: { sm: '100px' } },
            utilities: { 'ts-x': ['flex'], 'ok-uno': ['flex'] },
        })));
        const lineas = m.split('\n');
        expect(lineas).toHaveLength(4);
        expect(lineas[0]).toMatch(/^taisho config: extend\.screens\.sm /);
        expect(lineas[1]).toMatch(/^taisho config: extend\.radius\.md /);
        expect(lineas[2]).toMatch(/^taisho config: extend\.radius\.Mal /);
        expect(lineas[3]).toMatch(/^taisho config: utilities\.ts-x /);
    });
    it('no hay cascada: una utilidad que compone otra inválida no suma error', () => {
        const m = mensaje(() => deriveThemeVocabulary(con({ utilities: { malo: ['no-existe-nada'], usa: ['malo', 'flex'] } })));
        expect(m.split('\n')).toHaveLength(1);
        expect(m).toMatch(/^taisho config: utilities\.malo /);
    });
    it('un ciclo se informa una sola vez', () => {
        const m = mensaje(() => deriveThemeVocabulary(con({ utilities: { aa: ['bb'], bb: ['aa'] } })));
        expect(m.split('\n')).toHaveLength(1);
        expect(m).toContain('ciclo');
    });
});

describe('safelist: errores juntos', () => {
    const corre = (safelist: string[]) => compile(con({ content: ['x'], safelist }), [{ file: 'a.html', content: '<div class="ts">' }]);
    it('un error: mensaje idéntico al de siempre', () => {
        expect(mensaje(() => corre(['flex', 'nada-de-esto']))).toMatch(/^taisho config: safelist\[1\] \("nada-de-esto"\) no existe en el DS ni entre tus utilities\.[^\n]*$/);
    });
    it('N errores -> N líneas en orden', () => {
        const lineas = mensaje(() => corre(['nada-uno', 'flex', 'nada-dos', 'md:zzz:flex'])).split('\n');
        expect(lineas).toHaveLength(3);
        expect(lineas[0]).toContain('safelist[0]');
        expect(lineas[1]).toContain('safelist[2]');
        expect(lineas[2]).toContain('safelist[3]');
    });
});

describe('themes.<tema>.colors.brand obligatorio', () => {
    const sinBrand = (extra: Partial<TaishoConfig> = {}): TaishoConfig => ({
        themes: { principal: { colors: {} } as never },
        fontFaces: [],
        ...extra,
    });
    const LINEA = (tema: string) =>
        `taisho config: themes.${tema}.colors.brand es obligatorio: de esa semilla sale la paleta de marca (enlaces, acentos y, si no se define \`primary\`, los botones primarios). Se le pone un hex, p. ej. colors: { brand: '#4F46E5' }.`;

    it('un tema sin brand -> error claro, literal', () => {
        expect(mensaje(() => deriveThemeVocabulary(sinBrand()))).toBe(LINEA('principal'));
    });
    it('colors vacío, sin la clave, con brand vacío o con otros slots pero sin brand: el mismo error', () => {
        const tema = (colors: unknown) => ({ themes: { x: { colors } }, fontFaces: [] }) as unknown as TaishoConfig;
        for (const colors of [{}, undefined, { brand: '' }, { accent: '#ff6600' }]) {
            expect(mensaje(() => deriveThemeVocabulary(tema(colors)))).toBe(LINEA('x'));
        }
    });
    it('se junta con los demás errores en una sola pasada, en orden y sin el error de @apply', () => {
        const m = mensaje(() => compile(sinBrand({ extend: { radius: { md: '1px' } }, utilities: { 'ts-x': ['flex'] } }), []));
        const lineas = m.split('\n');
        expect(lineas).toHaveLength(3);
        expect(lineas[0]).toBe(LINEA('principal'));
        expect(lineas[1]).toMatch(/^taisho config: extend\.radius\.md /);
        expect(lineas[2]).toMatch(/^taisho config: utilities\.ts-x /);
        expect(m).not.toContain('@apply');
    });
    it('un error por tema, con la key tal como está en la config', () => {
        const config = { themes: { a: { colors: { brand: '#4F46E5' } }, 'frontend/b': { colors: {} }, c: { colors: {} } }, fontFaces: [] } as unknown as TaishoConfig;
        expect(mensaje(() => deriveThemeVocabulary(config))).toBe(`${LINEA('frontend/b')}\n${LINEA('c')}`);
    });
    it('con brand y slots propios compila sin error', () => {
        const ok: TaishoConfig = { themes: { x: { colors: { brand: '#4F46E5', accent: '#ff6600' } } }, fontFaces: [] };
        expect(() => deriveThemeVocabulary(ok)).not.toThrow();
    });
});
