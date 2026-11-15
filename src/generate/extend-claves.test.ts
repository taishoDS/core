// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { buildRepoConfig } from '../config/pipeline';
import { ConfigError } from './errores-config';

const repo = buildRepoConfig();
const conExtend = (extend: unknown): TaishoConfig => ({ ...repo, extend: extend as TaishoConfig['extend'] });
const errores = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { if (e instanceof ConfigError) return e.errors; throw e; }
    return [];
};
const mensaje = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { return (e as Error).message; }
    return '';
};

describe('extend: claves desconocidas', () => {
    it('una clave que extend no tiene es un Error con su ruta', () => {
        const e = errores(conExtend({ bogus: { a: '1px' } }));
        expect(e).toHaveLength(1);
        expect(e[0]).toMatchObject({ path: 'extend.bogus', code: 'extend-key-unknown' });
    });
    it('una errata de una clave real sugiere la clave', () => {
        expect(mensaje(conExtend({ radiuss: { card: '20px' } }))).toContain('extend.radiuss no es una clave de extend. ¿Se quiso decir "radius"?');
        expect(mensaje(conExtend({ spacing: { gap: { a: '1px' } } }))).toContain('¿Se quiso decir "gaps"?');
    });
    it('una subclave de motion o spacing desconocida también', () => {
        expect(errores(conExtend({ motion: { delays: {} } }))[0].path).toBe('extend.motion.delays');
        expect(errores(conExtend({ spacing: { rows: {} } }))[0].path).toBe('extend.spacing.rows');
    });
    it('extend.zIndex y extend.motion.loops se excluyen a propósito, con el motivo', () => {
        const z = errores(conExtend({ zIndex: { top: '9' } }));
        expect(z[0]).toMatchObject({ path: 'extend.zIndex', code: 'extend-key-excluded' });
        expect(mensaje(conExtend({ zIndex: { top: '9' } }))).toContain('themes.<tema>.zIndex.<nombre>');
        expect(errores(conExtend({ motion: { loops: { spin: '1s' } } }))[0]).toMatchObject({ path: 'extend.motion.loops', code: 'extend-key-excluded' });
    });
    it('junta todos los errores, uno por clave', () => {
        expect(errores(conExtend({ bogus: {}, zIndex: {}, sizng: [1] })).map((e) => e.path)).toEqual(['extend.bogus', 'extend.zIndex', 'extend.sizng']);
    });
});

describe('extend: forma inválida', () => {
    it('sizing como objeto pide una lista', () => {
        const e = errores(conExtend({ sizing: { '30': 30 } }));
        expect(e).toHaveLength(1);
        expect(e[0]).toMatchObject({ path: 'extend.sizing', code: 'extend-shape-invalid', params: { expected: 'list' } });
    });
    it('una escala como lista o texto pide un objeto', () => {
        expect(errores(conExtend({ radius: ['1px'] }))[0]).toMatchObject({ path: 'extend.radius', code: 'extend-shape-invalid', params: { expected: 'object' } });
        expect(errores(conExtend({ motion: { durations: 'rápido' } }))[0]).toMatchObject({ path: 'extend.motion.durations', code: 'extend-shape-invalid' });
        expect(errores(conExtend('nada'))[0]).toMatchObject({ path: 'extend', code: 'extend-shape-invalid' });
    });
    it('un número donde va un texto da un mensaje propio, no «valor vacío»', () => {
        const e = errores(conExtend({ radius: { card: 10 } }));
        expect(e[0]).toMatchObject({ path: 'extend.radius.card', code: 'value-not-string' });
        expect(mensaje(conExtend({ radius: { card: 10 } }))).not.toContain('vacío');
    });
});

describe('extend: lo válido sigue andando', () => {
    it('sin extend, o con claves reales, no hay errores', () => {
        expect(errores({ ...repo })).toEqual([]);
        expect(errores(conExtend({ screens: { '2xl': '1536px' }, radius: { card: '20px' }, sizing: [30], motion: { durations: { slowest: '800ms' } }, spacing: { gaps: { x: '3px' } } }))).toEqual([]);
    });
});
