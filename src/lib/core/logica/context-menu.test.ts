// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { clampMenuPosition } from './context-menu';

const VP = { width: 1000, height: 800 };

describe('ContextMenu — clampMenuPosition', () => {
  it('no toca la posición si el menú entra entero', () => {
    expect(clampMenuPosition(100, 100, { width: 160, height: 200 }, VP)).toEqual({ x: 100, y: 100 });
  });

  it('pega contra el borde derecho cuando se desborda', () => {
    const { x } = clampMenuPosition(950, 100, { width: 160, height: 200 }, VP);
    expect(x).toBe(1000 - 160 - 8);
  });

  it('pega contra el borde inferior cuando se desborda', () => {
    const { y } = clampMenuPosition(100, 700, { width: 160, height: 200 }, VP);
    expect(y).toBe(800 - 200 - 8);
  });

  it('clampa ambos ejes a la vez', () => {
    const r = clampMenuPosition(990, 790, { width: 160, height: 200 }, VP);
    expect(r).toEqual({ x: 832, y: 592 });
  });

  it('nunca baja del margen mínimo aunque el menú sea más grande que el viewport', () => {
    const r = clampMenuPosition(10, 10, { width: 2000, height: 2000 }, VP);
    expect(r.x).toBe(8);
    expect(r.y).toBe(8);
  });

  it('respeta un margen custom', () => {
    const { x } = clampMenuPosition(950, 100, { width: 160, height: 200 }, VP, 20);
    expect(x).toBe(1000 - 160 - 20);
  });
});
