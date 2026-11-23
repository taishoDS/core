// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';
import { ConfigError } from './errores-config';
import { configErrorLine } from './mensajes-errores';
import type { ThemeDef } from '../config/taisho.types';

const repo = buildRepoConfig();
const MIO: ThemeDef = { colors: { brand: '#3b82f6', accent: '#f59e0b' } };
const conTema = (def: Partial<ThemeDef>): TaishoConfig => ({ ...repo, themes: { ...repo.themes, mio: { ...MIO, ...def } } });
const errores = (def: unknown) => {
    try { deriveThemeVocabulary(conTema(def as Partial<ThemeDef>)); } catch (e) { if (e instanceof ConfigError) return e.errors; throw e; }
    return [];
};

describe('validación de seedFit', () => {
    it('brand, otro slot, un estado de fábrica, un estado del tema y primary son claves válidas', () => {
        expect(errores({ seedFit: { brand: 'keep', accent: 'shift', danger: 'keep', info: 'shift' } })).toEqual([]);
        expect(errores({ states: { promo: '#ff0000' }, seedFit: { promo: 'keep' } })).toEqual([]);
        expect(errores({ primary: '#111111', seedFit: { primary: 'shift' } })).toEqual([]);
    });
    it('un valor que no es shift ni keep corta con la ruta exacta, en es y en', () => {
        const e = errores({ seedFit: { brand: 'maybe' } });
        expect(e).toHaveLength(1);
        expect(e[0].path).toBe('themes.mio.seedFit.brand');
        expect(e[0].code).toBe('seed-fit-value-invalid');
        expect(configErrorLine(e[0], 'es')).toContain("tiene que ser 'shift' o 'keep'");
        expect(configErrorLine(e[0], 'en')).toContain("must be 'shift' or 'keep'");
    });
    it('una clave que no es una familia del tema corta y lista las que sí lo son', () => {
        const e = errores({ seedFit: { marca: 'keep' } });
        expect(e[0].code).toBe('seed-fit-key-unknown');
        expect(configErrorLine(e[0], 'es')).toContain('"marca" no es una familia de color del tema (brand, accent,');
        expect(configErrorLine(e[0], 'en')).toContain('"marca" isn\'t a color family of the theme');
    });
    it('una clave casi igual a una familia sugiere la parecida, en es y en', () => {
        const e = errores({ seedFit: { brnd: 'keep' } });
        expect(configErrorLine(e[0], 'es')).toContain('¿Se quiso decir "brand"?');
        expect(configErrorLine(e[0], 'en')).toContain('Did you mean "brand"?');
        expect(configErrorLine(errores({ seedFit: { zzzzzzzz: 'keep' } })[0], 'es')).not.toContain('Se quiso decir');
    });
    it('primary sin un primary definido no es una familia del tema; seedFit que no es un objeto corta', () => {
        expect(errores({ seedFit: { primary: 'keep' } })[0].code).toBe('seed-fit-key-unknown');
        expect(errores({ seedFit: 'keep' })[0].code).toBe('seed-fit-value-invalid');
    });
});
