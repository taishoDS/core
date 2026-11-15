// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { cierraConClickAfuera, cierraConEscape } from './nav-bar';

describe('NavBar — cuándo se cierra el menú desplegado', () => {
  it('Escape lo cierra sólo si está abierto', () => {
    expect(cierraConEscape('Escape', true)).toBe(true);
    expect(cierraConEscape('Escape', false)).toBe(false);
    expect(cierraConEscape('Enter', true)).toBe(false);
  });

  it('un puntero fuera de la barra lo cierra sólo si está abierto', () => {
    expect(cierraConClickAfuera(true, false)).toBe(true);
    expect(cierraConClickAfuera(true, true)).toBe(false);
    expect(cierraConClickAfuera(false, false)).toBe(false);
  });
});
