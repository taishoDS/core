// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { getInitials } from './avatar';

describe('Avatar — getInitials', () => {
  it('toma la primera y última inicial de un nombre completo', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
  });

  it('con varios nombres usa el primero y el último', () => {
    expect(getInitials('Grace Brewster Murray Hopper')).toBe('GH');
  });

  it('con un solo nombre devuelve una inicial', () => {
    expect(getInitials('madonna')).toBe('M');
  });

  it('ignora espacios extra', () => {
    expect(getInitials('  Alan   Turing  ')).toBe('AT');
  });

  it('vacío o undefined devuelve cadena vacía', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials(undefined)).toBe('');
  });
});
