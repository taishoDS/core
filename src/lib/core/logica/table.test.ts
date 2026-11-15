// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { sortBy, getNextSortDir, computeVirtualWindow } from './table';

describe('sortBy', () => {
  const filas = [
    { n: 'Ana', plan: 'Pro' },
    { n: 'Beto', plan: 'Free' },
    { n: 'Cami', plan: 'Pro' },
  ];

  it('es estable: los empates conservan el orden de entrada, también en desc', () => {
    expect(sortBy(filas, (f) => f.plan, 'asc').map((f) => f.n)).toEqual(['Beto', 'Ana', 'Cami']);
    expect(sortBy(filas, (f) => f.plan, 'desc').map((f) => f.n)).toEqual(['Ana', 'Cami', 'Beto']);
  });

  it('valores vacíos primero, números por valor y texto con locale', () => {
    expect(sortBy([{ v: 10 }, { v: null }, { v: 9 }], (f) => f.v, 'asc').map((f) => f.v)).toEqual([null, 9, 10]);
    expect(sortBy([{ v: 'Zorro' }, { v: 'Ñandú' }], (f) => f.v, 'asc').map((f) => f.v)).toEqual(['Ñandú', 'Zorro']);
  });

  it('no muta la entrada', () => {
    const copia = [...filas];
    sortBy(filas, (f) => f.plan, 'asc');
    expect(filas).toEqual(copia);
  });
});

describe('getNextSortDir', () => {
  it('retorna asc al hacer clic en columna nueva', () => {
    expect(getNextSortDir('name', 'age', 'asc')).toBe('asc');
  });

  it('alterna de asc a desc en la misma columna', () => {
    expect(getNextSortDir('name', 'name', 'asc')).toBe('desc');
  });

  it('alterna de desc a asc en la misma columna', () => {
    expect(getNextSortDir('name', 'name', 'desc')).toBe('asc');
  });
});

describe('computeVirtualWindow', () => {
  it('desde el tope: arranca en 0 y cubre viewport + overscan', () => {
    const w = computeVirtualWindow(0, 500, 40, 1000, 4);
    expect(w.start).toBe(0);
    expect(w.end).toBe(13 + 4);
    expect(w.padTop).toBe(0);
    expect(w.padBottom).toBe((1000 - w.end) * 40);
  });

  it('scrolleado al medio: recorta arriba y abajo con overscan', () => {
    const w = computeVirtualWindow(4000, 400, 40, 1000, 4);
    expect(w.start).toBe(96);
    expect(w.padTop).toBe(96 * 40);
    expect(w.end).toBe(100 + 10 + 4);
    expect(w.padTop + (w.end - w.start) * 40 + w.padBottom).toBe(1000 * 40);
  });

  it('cerca del final: end se clampa al total y padBottom no es negativo', () => {
    const w = computeVirtualWindow(39600, 400, 40, 1000, 4);
    expect(w.end).toBe(1000);
    expect(w.padBottom).toBe(0);
  });

  it('lista vacía o rowHeight inválido → ventana completa sin padding', () => {
    expect(computeVirtualWindow(0, 400, 40, 0)).toEqual({ start: 0, end: 0, padTop: 0, padBottom: 0 });
    expect(computeVirtualWindow(0, 400, 0, 50)).toEqual({ start: 0, end: 50, padTop: 0, padBottom: 0 });
  });
});
