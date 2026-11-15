// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { exactMatch, resolveCommit, comboboxKeyAction, initialActiveIndex, keepsInputFocus, groupsWithMatches, panelIndicators, resolveMultipleCommit, removesLastOnBackspace } from './combobox';
import type { SelectOption } from './select';

const opts: SelectOption[] = [
  { value: 'ar', label: 'Argentina' },
  { value: 'br', label: 'Brasil' },
  { value: 'uy', label: 'Uruguay' },
];

describe('Combobox/logic', () => {
  it('exactMatch es case-insensitive y exacto', () => {
    expect(exactMatch(opts, 'brasil')?.value).toBe('br');
    expect(exactMatch(opts, 'BRASIL')?.value).toBe('br');
    expect(exactMatch(opts, 'bras')).toBeUndefined();
    expect(exactMatch(opts, '')).toBeUndefined();
  });


  describe('resolveCommit', () => {
    it('texto vacío limpia la selección', () => {
      expect(resolveCommit(opts, '   ', false)).toBe('');
    });
    it('match exacto → value de la opción (estricto o custom)', () => {
      expect(resolveCommit(opts, 'Argentina', false)).toBe('ar');
      expect(resolveCommit(opts, 'argentina', true)).toBe('ar');
    });
    it('estricto sin match → null (revertir)', () => {
      expect(resolveCommit(opts, 'Chile', false)).toBeNull();
    });
    it('allowCustom sin match → el texto crudo', () => {
      expect(resolveCommit(opts, '  Chile ', true)).toBe('Chile');
    });
  });


  describe('comboboxKeyAction (compartida con el Core)', () => {
    it('flechas: cerrado abre, abierto mueve', () => {
      expect(comboboxKeyAction('ArrowDown', false, false)).toBe('open');
      expect(comboboxKeyAction('ArrowUp', false, false)).toBe('open');
      expect(comboboxKeyAction('ArrowDown', true, true)).toBe('next');
      expect(comboboxKeyAction('ArrowUp', true, true)).toBe('prev');
    });
    it('Enter elige si hay opción activa; si no, confirma el texto', () => {
      expect(comboboxKeyAction('Enter', true, true)).toBe('choose');
      expect(comboboxKeyAction('Enter', true, false)).toBe('commit');
      expect(comboboxKeyAction('Enter', false, false)).toBe('commit');
    });
    it('Escape revierte sólo abierto; Tab confirma sólo abierto', () => {
      expect(comboboxKeyAction('Escape', true, true)).toBe('revert');
      expect(comboboxKeyAction('Escape', false, false)).toBeNull();
      expect(comboboxKeyAction('Tab', true, true)).toBe('commit');
      expect(comboboxKeyAction('Tab', false, false)).toBeNull();
    });
    it('Home/End y el resto no se interceptan', () => {
      for (const k of ['Home', 'End', 'a', ' ']) expect(comboboxKeyAction(k, true, true)).toBeNull();
    });
  });

  describe('initialActiveIndex', () => {
    it('la elegida si está entre las visibles', () => {
      expect(initialActiveIndex(['ar', 'br', 'uy'], 'br')).toBe(1);
    });
    it('sin elegida, o si la elegida no está visible, la primera', () => {
      expect(initialActiveIndex(['ar', 'br'], '')).toBe(0);
      expect(initialActiveIndex(['ar', 'br'], 'uy')).toBe(0);
    });
    it('sin opciones, -1', () => {
      expect(initialActiveIndex([], 'br')).toBe(-1);
    });
  });

  describe('readonly y foco del puntero', () => {
    it('con readonly ninguna tecla hace nada', () => {
      for (const k of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'])
        for (const open of [false, true]) expect(comboboxKeyAction(k, open, true, true)).toBeNull();
    });
    it('sin readonly (default) todo sigue igual', () => {
      expect(comboboxKeyAction('ArrowDown', false, false, false)).toBe('open');
    });
    it('mouse y pen conservan el foco en el input; el toque no', () => {
      expect(keepsInputFocus('mouse')).toBe(true);
      expect(keepsInputFocus('pen')).toBe(true);
      expect(keepsInputFocus('touch')).toBe(false);
    });
  });
});


describe('Combobox/logic — grupos y carga', () => {
  const grupos: SelectOption[] = [
    { value: 'ana', label: 'Ana Torres', group: 'Admin' },
    { value: 'bruno', label: 'Bruno Díaz', group: 'Editor' },
    { value: 'carla', label: 'Carla Ruiz', group: 'Editor' },
    { value: 'diego', label: 'Diego Sosa', group: 'Lector', disabled: true },
    { value: 'elena', label: 'Elena Vega', group: 'Lector' },
  ];

  it('groupsWithMatches deja sólo los grupos con coincidencias', () => {
    expect([...groupsWithMatches(grupos, 'ruiz')]).toEqual(['Editor']);
    expect([...groupsWithMatches(grupos, '')].sort()).toEqual(['Admin', 'Editor', 'Lector']);
    expect(groupsWithMatches(grupos, 'zzz').size).toBe(0);
  });

  it('panelIndicators: cargando no muestra "Sin resultados"; sin cargar, lo muestra sólo sin opciones', () => {
    expect(panelIndicators(0, true)).toEqual({ loading: true, empty: false });
    expect(panelIndicators(3, true)).toEqual({ loading: true, empty: false });
    expect(panelIndicators(0, false)).toEqual({ loading: false, empty: true });
    expect(panelIndicators(2, false)).toEqual({ loading: false, empty: false });
  });
});

describe('Combobox múltiple', () => {
  it('resolveMultipleCommit suma lo que resuelve y nunca quita', () => {
    expect(resolveMultipleCommit(opts, 'brasil', false, [])).toBe('br');
    expect(resolveMultipleCommit(opts, 'brasil', false, ['br'])).toBeNull();
    expect(resolveMultipleCommit(opts, 'nada', false, [])).toBeNull();
    expect(resolveMultipleCommit(opts, ' nada ', true, [])).toBe('nada');
    expect(resolveMultipleCommit(opts, 'nada', true, ['nada'])).toBeNull();
    expect(resolveMultipleCommit(opts, '  ', true, ['br'])).toBeNull();
  });

  it('removesLastOnBackspace sólo con el campo vacío, con valores y sin readonly', () => {
    expect(removesLastOnBackspace('Backspace', '', 2)).toBe(true);
    expect(removesLastOnBackspace('Backspace', 'a', 2)).toBe(false);
    expect(removesLastOnBackspace('Backspace', '', 0)).toBe(false);
    expect(removesLastOnBackspace('Backspace', '', 2, true)).toBe(false);
    expect(removesLastOnBackspace('Delete', '', 2)).toBe(false);
  });
});
