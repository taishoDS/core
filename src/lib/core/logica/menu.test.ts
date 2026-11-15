// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { nextFocusIndex, menuKeyAction } from './menu';

describe('Menu — nextFocusIndex (navegación con teclado)', () => {
  it('ArrowDown avanza con wrap', () => {
    expect(nextFocusIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextFocusIndex('ArrowDown', 2, 3)).toBe(0);
  });

  it('ArrowUp retrocede con wrap', () => {
    expect(nextFocusIndex('ArrowUp', 0, 3)).toBe(2);
    expect(nextFocusIndex('ArrowUp', 1, 3)).toBe(0);
  });

  it('Home y End van a los extremos', () => {
    expect(nextFocusIndex('Home', 2, 3)).toBe(0);
    expect(nextFocusIndex('End', 0, 3)).toBe(2);
  });

  it('tecla no mapeada o lista vacía devuelve null', () => {
    expect(nextFocusIndex('Enter', 0, 3)).toBeNull();
    expect(nextFocusIndex('ArrowDown', 0, 0)).toBeNull();
  });

  it('parte de -1 (sin foco) y ArrowDown va al primero', () => {
    expect(nextFocusIndex('ArrowDown', -1, 3)).toBe(0);
  });
});

describe('Menu — menuKeyAction', () => {
  it('Tab cierra, con cualquier cantidad de ítems', () => {
    expect(menuKeyAction('Tab', 1, 3)).toEqual({ type: 'close' });
    expect(menuKeyAction('Tab', -1, 0)).toEqual({ type: 'close' });
  });

  it('las flechas verticales, Home y End mueven el foco', () => {
    expect(menuKeyAction('ArrowDown', 2, 3)).toEqual({ type: 'moveFocus', index: 0 });
    expect(menuKeyAction('ArrowUp', 0, 3)).toEqual({ type: 'moveFocus', index: 2 });
    expect(menuKeyAction('End', 0, 3)).toEqual({ type: 'moveFocus', index: 2 });
  });

  it('las flechas horizontales no hacen nada en un menú vertical', () => {
    expect(menuKeyAction('ArrowRight', 2, 3)).toBeNull();
    expect(menuKeyAction('ArrowLeft', 0, 3)).toBeNull();
  });
});
