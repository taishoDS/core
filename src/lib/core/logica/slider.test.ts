// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { computeFillPercent, normalizeRange, clampThumb, computeRangeFill, topThumb, formatSliderValue, formatSliderRange, ratioFromOffset, valueFromRatio, nearestThumb, joinSliderRange, normalizeStops, pageStopStep } from './slider';

describe('computeFillPercent', () => {
  it('calcula porcentaje en el medio', () => {
    expect(computeFillPercent(50, 0, 100)).toBe(50);
  });

  it('retorna 0 en el mínimo', () => {
    expect(computeFillPercent(0, 0, 100)).toBe(0);
  });

  it('retorna 100 en el máximo', () => {
    expect(computeFillPercent(100, 0, 100)).toBe(100);
  });

  it('clampea valores fuera de rango', () => {
    expect(computeFillPercent(-10, 0, 100)).toBe(0);
    expect(computeFillPercent(150, 0, 100)).toBe(100);
  });

  it('maneja rango personalizado', () => {
    expect(computeFillPercent(15, 10, 20)).toBe(50);
  });

  it('retorna 0 si min === max', () => {
    expect(computeFillPercent(5, 5, 5)).toBe(0);
  });
});

describe('normalizeRange', () => {
  it('acota a [min, max] y ordena', () => {
    expect(normalizeRange([80, 20], 0, 100)).toEqual([20, 80]);
    expect(normalizeRange([-10, 150], 0, 100)).toEqual([0, 100]);
  });

  it('algo que no es un par válido abarca todo el rango', () => {
    expect(normalizeRange(undefined, 0, 100)).toEqual([0, 100]);
    expect(normalizeRange(0, 0, 100)).toEqual([0, 100]);
    expect(normalizeRange([1], 0, 100)).toEqual([0, 100]);
    expect(normalizeRange([NaN, 5], 0, 100)).toEqual([0, 100]);
  });
});

describe('clampThumb: las manijas no se cruzan', () => {
  it('la de inicio no pasa del fin', () => {
    expect(clampThumb(0, 90, [20, 60])).toEqual([60, 60]);
    expect(clampThumb(0, 30, [20, 60])).toEqual([30, 60]);
  });

  it('la de fin no baja del inicio', () => {
    expect(clampThumb(1, 10, [20, 60])).toEqual([20, 20]);
    expect(clampThumb(1, 70, [20, 60])).toEqual([20, 70]);
  });
});

describe('computeRangeFill y topThumb', () => {
  it('el tramo va de una manija a la otra', () => {
    expect(computeRangeFill([20, 80], 0, 100)).toEqual({ from: 20, to: 80 });
    expect(computeRangeFill([50, 150], 0, 200)).toEqual({ from: 25, to: 75 });
  });

  it('juntas pasada la mitad, arriba la de inicio; antes, la de fin', () => {
    expect(topThumb([100, 100], 0, 100)).toBe(0);
    expect(topThumb([0, 0], 0, 100)).toBe(1);
    expect(topThumb([50, 50], 0, 100)).toBe(1);
  });
});

describe('formato del valor', () => {
  it('reemplaza {v}', () => {
    expect(formatSliderValue(25, '{v}%')).toBe('25%');
    expect(formatSliderValue(25)).toBe('25');
  });

  it('el rango aplica el formato a cada extremo', () => {
    expect(formatSliderRange([20, 80], '{v} USD')).toBe('\u206820 USD\u2069 – \u206880 USD\u2069');
  });
});

describe('riel: del puntero al valor', () => {
  it('descuenta el medio diámetro de manija de cada extremo', () => {
    expect(ratioFromOffset(8, 200, 16)).toBe(0);
    expect(ratioFromOffset(192, 200, 16)).toBe(1);
    expect(ratioFromOffset(100, 200, 16)).toBe(0.5);
  });

  it('acota afuera del riel y no divide por cero', () => {
    expect(ratioFromOffset(-30, 200, 16)).toBe(0);
    expect(ratioFromOffset(400, 200, 16)).toBe(1);
    expect(ratioFromOffset(5, 10, 16)).toBe(0);
  });

  it('valueFromRatio ajusta al paso y respeta min/max', () => {
    expect(valueFromRatio(0.5, 0, 200, 10)).toBe(100);
    expect(valueFromRatio(0.33, 0, 100, 5)).toBe(35);
    expect(valueFromRatio(1, 10, 20, 3)).toBe(19);
    expect(valueFromRatio(0.5, 0, 1, 0.1)).toBe(0.5);
  });

  it('nearestThumb elige la manija más cercana; afuera del tramo, la del lado', () => {
    expect(nearestThumb([20, 80], 10)).toBe(0);
    expect(nearestThumb([20, 80], 90)).toBe(1);
    expect(nearestThumb([20, 80], 40)).toBe(0);
    expect(nearestThumb([20, 80], 70)).toBe(1);
  });
});

describe('paradas', () => {
  it('normalizeStops: ordena, descarta repetidas y no finitas; con menos de dos no hay paradas', () => {
    expect(normalizeStops([24, 0, 8, 8, 2])).toEqual([0, 2, 8, 24]);
    expect(normalizeStops([1, NaN, 3])).toEqual([1, 3]);
    expect(normalizeStops([5])).toBeNull();
    expect(normalizeStops(null)).toBeNull();
  });

  it('pageStopStep: una parada hasta 14; después, una décima parte de la lista', () => {
    expect([2, 8, 14].map(pageStopStep)).toEqual([1, 1, 1]);
    expect([15, 30, 100].map(pageStopStep)).toEqual([2, 3, 10]);
  });

  it('joinSliderRange aísla cada extremo para el algoritmo bidi', () => {
    expect(joinSliderRange('2 px', '8 px')).toBe('\u20682 px\u2069 – \u20688 px\u2069');
    expect(formatSliderRange([2, 8], '{v} px')).toBe(joinSliderRange('2 px', '8 px'));
  });
});
