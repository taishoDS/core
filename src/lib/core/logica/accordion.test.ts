// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { toggleOpen } from './accordion';

describe('Accordion — toggleOpen (single)', () => {
  it('abre un item cerrado (cierra los demás)', () => {
    expect(toggleOpen(['a'], 'b', false)).toEqual(['b']);
  });

  it('cierra el item si ya estaba abierto', () => {
    expect(toggleOpen(['a'], 'a', false)).toEqual([]);
  });
});

describe('Accordion — toggleOpen (multiple)', () => {
  it('agrega sin cerrar los demás', () => {
    expect(toggleOpen(['a'], 'b', true)).toEqual(['a', 'b']);
  });

  it('quita solo el item alternado', () => {
    expect(toggleOpen(['a', 'b'], 'a', true)).toEqual(['b']);
  });

  it('no muta el array original', () => {
    const orig = ['a'];
    toggleOpen(orig, 'b', true);
    expect(orig).toEqual(['a']);
  });
});
