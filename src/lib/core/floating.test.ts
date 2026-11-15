// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { computeFloatingCoords, resolveFloatingPlacement } from './floating';

const VP = { width: 1000, height: 800 };
const trigger = { left: 100, right: 200, top: 100, bottom: 130, width: 100, height: 30 };
const floating = { width: 80, height: 60 };

describe('computeFloatingCoords — colocación base', () => {
  it('bottom-start: bajo el trigger, alineado a su izquierda + gap', () => {
    expect(computeFloatingCoords(trigger, floating, 'bottom-start', VP)).toEqual({
      x: 100,
      y: 136,
      placement: 'bottom-start',
    });
  });

  it('bottom (sin align): centra horizontalmente sobre el trigger', () => {
    const r = computeFloatingCoords(trigger, floating, 'bottom', VP);
    expect(r.x).toBe(110);
    expect(r.y).toBe(136);
    expect(r.placement).toBe('bottom');
  });

  it('bottom-end: alinea el borde derecho con el del trigger', () => {
    const r = computeFloatingCoords(trigger, floating, 'bottom-end', VP);
    expect(r.x).toBe(120);
  });

  it('top-start: encima del trigger cuando hay lugar', () => {
    expect(computeFloatingCoords(trigger, floating, 'top-start', VP)).toEqual({
      x: 100,
      y: 34,
      placement: 'top-start',
    });
  });

  it('right: al costado derecho, centrado verticalmente', () => {
    expect(computeFloatingCoords(trigger, floating, 'right', VP)).toEqual({
      x: 206,
      y: 85,
      placement: 'right',
    });
  });
});

describe('computeFloatingCoords — flip', () => {
  it('voltea top→bottom cuando no hay espacio arriba', () => {
    const top = { left: 100, right: 200, top: 10, bottom: 40, width: 100, height: 30 };
    const r = computeFloatingCoords(top, floating, 'top', VP);
    expect(r.placement).toBe('bottom');
    expect(r.y).toBe(46);
  });

  it('NO voltea si tampoco hay más espacio del otro lado', () => {
    const tall = { width: 80, height: 60 };
    const top = { left: 100, right: 200, top: 5, bottom: 795, width: 100, height: 790 };
    const r = computeFloatingCoords(top, tall, 'top', VP);
    expect(r.placement).toBe('top');
  });
});

describe('computeFloatingCoords — clamp al viewport', () => {
  it('no deja que se salga por la derecha', () => {
    const right = { left: 900, right: 980, top: 100, bottom: 130, width: 80, height: 30 };
    const r = computeFloatingCoords(right, { width: 200, height: 60 }, 'bottom-start', VP);
    expect(r.x).toBe(792);
  });

  it('el margen al borde es configurable (el Tooltip usa el mismo token que su separación)', () => {
    const left = { left: -50, right: 30, top: 100, bottom: 130, width: 80, height: 30 };
    expect(computeFloatingCoords(left, floating, 'bottom-start', VP, 6, 6).x).toBe(6);
    expect(computeFloatingCoords(left, floating, 'bottom-start', VP, 6, 8).x).toBe(8);
  });

  it('respeta el margen mínimo a la izquierda', () => {
    const left = { left: -50, right: 30, top: 100, bottom: 130, width: 80, height: 30 };
    const r = computeFloatingCoords(left, floating, 'bottom-start', VP);
    expect(r.x).toBe(8);
  });
});

describe('computeFloatingCoords — RTL (start/end se invierten)', () => {
  it('bottom-start en RTL: alinea el borde DERECHO con el del trigger', () => {
    const r = computeFloatingCoords(trigger, floating, 'bottom-start', VP, 6, 8, 'rtl');
    expect(r.x).toBe(120);
    expect(r.placement).toBe('bottom-start');
  });

  it('bottom-end en RTL: alinea el borde IZQUIERDO con el del trigger', () => {
    const r = computeFloatingCoords(trigger, floating, 'bottom-end', VP, 6, 8, 'rtl');
    expect(r.x).toBe(100);
  });

  it('bottom (sin align) en RTL: sigue centrado', () => {
    const r = computeFloatingCoords(trigger, floating, 'bottom', VP, 6, 8, 'rtl');
    expect(r.x).toBe(110);
  });
});

describe('resolveFloatingPlacement', () => {
  it('mantiene el placement si no hay overflow', () => {
    const rect = { top: 50, bottom: 100, left: 50, right: 100 };
    expect(resolveFloatingPlacement('bottom', rect, VP)).toBe('bottom');
  });

  it('voltea bottom→top si desborda abajo', () => {
    const rect = { top: 50, bottom: 900, left: 50, right: 100 };
    expect(resolveFloatingPlacement('bottom', rect, VP)).toBe('top');
  });

  it('conserva el align al voltear', () => {
    const rect = { top: -10, bottom: 100, left: 50, right: 100 };
    expect(resolveFloatingPlacement('top-start', rect, VP)).toBe('bottom-start');
  });
});
