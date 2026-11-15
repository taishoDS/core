// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { buildPages, getPageLabel, pageLabelFrom } from './pagination';

describe('buildPages', () => {
  it('devuelve todos los números cuando total es pequeño', () => {
    expect(buildPages(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPages(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('agrega ellipsis para rangos grandes', () => {
    const pages = buildPages(10, 30);
    expect(pages).toContain('ellipsis');
    expect(pages).toContain(1);
    expect(pages).toContain(30);
    expect(pages).toContain(10);
  });

  it('no agrega ellipsis inicial cuando current está cerca del inicio', () => {
    const pages = buildPages(2, 20);
    expect(pages[0]).toBe(1);
    expect(pages[1]).toBe(2);
    const firstEllipsis = pages.indexOf('ellipsis');
    expect(firstEllipsis).toBeGreaterThan(2);
  });

  it('no agrega ellipsis final cuando current está cerca del fin', () => {
    const pages = buildPages(19, 20);
    const last = pages.slice(-2);
    expect(last).toEqual([19, 20]);
  });

  it('siempre incluye la página current', () => {
    const pages = buildPages(7, 50, 1, 1);
    expect(pages.filter(p => p === 7).length).toBe(1);
  });

  it('respeta siblings=2 mostrando más vecinos', () => {
    const pages = buildPages(10, 30, 2, 1);
    expect(pages).toContain(8);
    expect(pages).toContain(9);
    expect(pages).toContain(10);
    expect(pages).toContain(11);
    expect(pages).toContain(12);
  });

  it('maneja total=0', () => {
    expect(buildPages(1, 0)).toEqual([]);
  });

  it('maneja total=1', () => {
    expect(buildPages(1, 1)).toEqual([1]);
  });

  it('no genera ellipsis dobles consecutivos', () => {
    const pages = buildPages(15, 100, 1, 1);
    for (let i = 1; i < pages.length; i++) {
      expect(!(pages[i] === 'ellipsis' && pages[i - 1] === 'ellipsis')).toBe(true);
    }
  });

  it('clampea current fuera de rango', () => {
    const pages = buildPages(0, 10);
    expect(pages).toContain(1);
    const pages2 = buildPages(100, 10);
    expect(pages2).toContain(10);
  });
});

describe('getPageLabel', () => {
  const T = '{from}–{to} de {total}';
  const VACIO = '0 resultados';

  it('calcula from/to correctamente', () => {
    expect(getPageLabel(1, 10, 100, T, VACIO)).toBe('1–10 de 100');
    expect(getPageLabel(2, 10, 100, T, VACIO)).toBe('11–20 de 100');
    expect(getPageLabel(3, 10, 100, T, VACIO)).toBe('21–30 de 100');
  });

  it('clampea "to" al total en la última página', () => {
    expect(getPageLabel(10, 10, 95, T, VACIO)).toBe('91–95 de 95');
  });

  it('maneja total=0 con la etiqueta vacía', () => {
    expect(getPageLabel(1, 10, 0, T, VACIO)).toBe('0 resultados');
    expect(getPageLabel(1, 10, 0, T, 'No results')).toBe('No results');
  });

  it('soporta template personalizado', () => {
    expect(getPageLabel(2, 5, 20, '{from} to {to} of {total}', VACIO)).toBe('6 to 10 of 20');
  });
});

describe('pageLabelFrom', () => {
  it('reemplaza el número del modelo por el nuevo', () => {
    expect(pageLabelFrom('Página 1', 1, 10)).toBe('Página 10');
    expect(pageLabelFrom('Página 10', 10, 1)).toBe('Página 1');
    expect(pageLabelFrom('Page 2 of nav', 2, 7)).toBe('Page 7 of nav');
  });

  it('si el modelo no trae su número, lo deja como está', () => {
    expect(pageLabelFrom('Siguiente', 1, 5)).toBe('Siguiente');
  });
});
