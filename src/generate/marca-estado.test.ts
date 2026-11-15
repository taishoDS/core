// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { avisosMarcaVsEstado, distanciaOklab, UMBRAL_MARCA_ESTADO } from './emit-tokens';
import { DEFAULT_STATES } from './vocabulary';
import type { ThemeDef } from '../config/taisho.types';
import { warningText } from '../generate-cli/mensajes-avisos';

const ESTADOS_PROPIOS = { success: '#1A9338', warning: '#E79C13', info: '#0091FF', danger: '#E5484D' };

const ROJO = { ...DEFAULT_STATES, danger: '#DC2626' };
const datos = (brand: string, def: Partial<ThemeDef> = {}, estados: Record<string, string> = DEFAULT_STATES) =>
    avisosMarcaVsEstado({ name: 'principal', group: 'root', def: { colors: { brand }, ...def } }, { ...estados });
const avisos = (...args: Parameters<typeof datos>) => datos(...args).map((a) => warningText(a, 'es'));

describe('aviso: marca casi igual a un estado', () => {
    it('el umbral es 0,05 (ΔE OKLab)', () => {
        expect(UMBRAL_MARCA_ESTADO).toBe(0.05);
    });

    it('marca #DC2626 vs danger de fábrica: distancia 0,000, avisa', () => {
        expect(distanciaOklab('#DC2626', ROJO.danger)).toBeCloseTo(0, 3);
        expect(datos('#DC2626', {}, ROJO)).toEqual([
            { code: 'brand-like-status', params: { theme: 'principal', brand: '#DC2626', status: 'danger', seed: '#DC2626', distance: expect.closeTo(0, 3), threshold: 0.05 } },
        ]);
        const a = avisos('#DC2626', {}, ROJO);
        expect(a).toHaveLength(1);
        expect(a[0]).toBe(
            'Tema "principal": el primario (#DC2626) casi no se distingue del estado "danger" (#DC2626; distancia 0.000 en OKLab, menos de 0.05): ' +
            'un botón primario y uno de danger se verían casi iguales. Se define ese estado aparte en `defaultStates`.',
        );
    });

    it('un rojo cercano (#E11D48): distancia 0,039, avisa', () => {
        expect(distanciaOklab('#E11D48', ROJO.danger)).toBeCloseTo(0.039, 3);
        const a = avisos('#E11D48', {}, ROJO);
        expect(a).toHaveLength(1);
        expect(a[0]).toContain('distancia 0.039');
    });

    it('un rojo más lejos (#EF4444): distancia 0,061, no avisa', () => {
        expect(distanciaOklab('#EF4444', ROJO.danger)).toBeCloseTo(0.061, 3);
        expect(avisos('#EF4444', {}, ROJO)).toEqual([]);
    });

    it('azul #3b82f6 vs info de fábrica #2563EB: distancia 0,082, no avisa', () => {
        expect(distanciaOklab('#3b82f6', DEFAULT_STATES.info)).toBeCloseTo(0.082, 3);
        expect(avisos('#3b82f6')).toEqual([]);
    });

    it('la marca de la plantilla de init (#4F46E5): el estado más cercano es info, a 0,067; no avisa', () => {
        expect(distanciaOklab('#4F46E5', DEFAULT_STATES.info)).toBeCloseTo(0.067, 3);
        expect(avisos('#4F46E5')).toEqual([]);
    });

    it('los presets del Theme Studio no avisan contra los estados de fábrica', () => {
        for (const brand of ['#0ea5e9', '#c2410c']) expect(avisos(brand)).toEqual([]);
    });

    it('vale también contra el estado que el usuario definió en defaultStates', () => {
        expect(distanciaOklab('#f59e0b', ESTADOS_PROPIOS.warning)).toBeCloseTo(0.024, 3);
        const a = avisos('#f59e0b', {}, ESTADOS_PROPIOS);
        expect(a).toHaveLength(1);
        expect(a[0]).toContain('estado "warning" (#E79C13; distancia 0.024');
    });

    it('definir ese estado aparte lo resuelve', () => {
        expect(avisos('#DC2626', {}, { ...DEFAULT_STATES, danger: '#7F1D1D' })).toEqual([]);
    });

    it('usa los estados del tema (`states`) sobre los por defecto; un tema `locked` los ignora', () => {
        expect(avisos('#16A34A', { states: { success: '#0F172A' } }).filter((x) => x.includes('"success"'))).toEqual([]);
        expect(avisos('#16A34A', { states: { success: '#0F172A' }, locked: true }).filter((x) => x.includes('"success"'))).toHaveLength(1);
    });

    it('un aviso por estado: marca entre dos estados parecidos avisa dos veces', () => {
        expect(avisos('#DC2626', {}, { ...DEFAULT_STATES, info: '#DC2626' })).toHaveLength(2);
    });

    it('límite conocido: #3b82f6 contra el info propio #0091FF mide 0,040, como #E11D48 contra danger', () => {
        expect(distanciaOklab('#3b82f6', ESTADOS_PROPIOS.info)).toBeCloseTo(0.04, 3);
    });
});
