// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { ESCALERA_RADIOS, radiosSquircle, radius } from './radius-scale';

describe('radiosSquircle: cada radio toma el valor literal del escalón siguiente', () => {
    const subidos = radiosSquircle(radius);

    it('xs a 2xl suben un paso', () => {
        expect(subidos).toEqual({
            'xs': radius.sm, 'sm': radius.md, 'md': radius.lg, 'lg': radius.xl, 'xl': radius['2xl'], '2xl': radius['3xl'],
        });
    });
    it('3xl queda igual: no hay escalón siguiente, no sale del resultado', () => {
        expect(subidos['3xl']).toBeUndefined();
    });
    it('none y full no se mueven', () => {
        expect(subidos.none).toBeUndefined();
        expect(subidos.full).toBeUndefined();
    });
    it('los nombres que suma extend.radius no suben', () => {
        const con = radiosSquircle({ ...radius, card: '20px', pill: '99px' });
        expect(con.card).toBeUndefined();
        expect(con.pill).toBeUndefined();
        expect(con).toEqual(subidos);
    });
    it('copia el valor efectivo de la escala: lo que el tema cambia sube con su nombre', () => {
        const con = radiosSquircle({ ...radius, md: '10px' });
        expect(con.sm).toBe('10px');
        expect(con.md).toBe(radius.lg);
    });
    it('la escalera es xs…3xl, en orden', () => {
        expect(ESCALERA_RADIOS).toEqual(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']);
    });
});
