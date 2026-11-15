// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { filterOptions, buildGroups, toggleValue, getDisplayLabel, edgeIndex, formValues, type SelectOption } from './select';

const opts: SelectOption[] = [
  { value: 'a', label: 'Opción A' },
  { value: 'b', label: 'Opción B' },
  { value: 'c', label: 'Opción C', disabled: true },
];

describe('Select — filterOptions', () => {
  it('devuelve todas las opciones cuando el término está vacío', () => {
    expect(filterOptions(opts, '')).toHaveLength(3);
    expect(filterOptions(opts, '   ')).toHaveLength(3);
  });

  it('filtra por label de forma case-insensitive', () => {
    expect(filterOptions(opts, 'opción a')).toEqual([{ value: 'a', label: 'Opción A' }]);
    expect(filterOptions(opts, 'OPCIÓN')).toHaveLength(3);
  });

  it('devuelve vacío cuando no hay coincidencias', () => {
    expect(filterOptions(opts, 'zzz')).toEqual([]);
  });

  it('matchea por keywords ocultas además del label', () => {
    const conKeywords = [
      { value: 'p1', label: 'Lima de 8"', keywords: '7791234567890 SKU-INT-1' },
      { value: 'p2', label: 'Destornillador', keywords: '7799999999999' },
    ];
    expect(filterOptions(conKeywords, '779123')).toEqual([conKeywords[0]]);
    expect(filterOptions(conKeywords, 'sku-int')).toEqual([conKeywords[0]]);
    expect(filterOptions(conKeywords, 'destornillador')).toEqual([conKeywords[1]]);
    expect(filterOptions(opts, 'opción a')).toEqual([{ value: 'a', label: 'Opción A' }]);
  });
});

describe('Select — buildGroups', () => {
  it('agrupa una sola colección sin grupo bajo name=null', () => {
    const groups = buildGroups(opts);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBeNull();
    expect(groups[0].options).toHaveLength(3);
  });

  it('agrupa preservando el orden de aparición', () => {
    const grouped: SelectOption[] = [
      { value: '1', label: 'Uno', group: 'Números' },
      { value: 'a', label: 'A', group: 'Letras' },
      { value: '2', label: 'Dos', group: 'Números' },
    ];
    const groups = buildGroups(grouped);
    expect(groups.map(g => g.name)).toEqual(['Números', 'Letras']);
    expect(groups[0].options.map(o => o.value)).toEqual(['1', '2']);
    expect(groups[1].options.map(o => o.value)).toEqual(['a']);
  });
});

describe('Select — toggleValue', () => {
  it('agrega un valor ausente', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('quita un valor presente', () => {
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('no muta el array original', () => {
    const original = ['a'];
    toggleValue(original, 'b');
    expect(original).toEqual(['a']);
  });
});

describe('Select — getDisplayLabel', () => {
  const placeholder = 'Selecciona...';

  it('devuelve el placeholder sin selección', () => {
    expect(getDisplayLabel(opts, [], placeholder, false, 'seleccionados')).toBe(placeholder);
  });

  it('simple: devuelve el label de la opción seleccionada', () => {
    expect(getDisplayLabel(opts, ['a'], placeholder, false, 'seleccionados')).toBe('Opción A');
  });

  it('simple: devuelve el value crudo si no hay match', () => {
    expect(getDisplayLabel(opts, ['z'], placeholder, false, 'seleccionados')).toBe('z');
  });

  it('múltiple: con una sola selección muestra su label', () => {
    expect(getDisplayLabel(opts, ['b'], placeholder, true, 'seleccionados')).toBe('Opción B');
  });

  it('múltiple: con varias selecciones muestra el contador', () => {
    expect(getDisplayLabel(opts, ['a', 'b'], placeholder, true, 'seleccionados')).toBe('2 seleccionados');
  });

  it('múltiple: respeta un countSuffix personalizado', () => {
    expect(getDisplayLabel(opts, ['a', 'b'], placeholder, true, 'elegidos')).toBe('2 elegidos');
  });
});

describe('edgeIndex — Home/End del listbox', () => {
  it('Home lleva a la primera y End a la última', () => {
    expect(edgeIndex('Home', 4)).toBe(0);
    expect(edgeIndex('End', 4)).toBe(3);
    expect(edgeIndex('End', 1)).toBe(0);
  });

  it('sin opciones o con otra tecla no hay destino', () => {
    expect(edgeIndex('Home', 0)).toBeNull();
    expect(edgeIndex('End', 0)).toBeNull();
    expect(edgeIndex('ArrowDown', 4)).toBeNull();
  });
});

describe('formValues — qué viaja en un <form>', () => {
  it('múltiple: un valor por selección, y ninguno sin selección', () => {
    expect(formValues(true, ['ana', 'carla'])).toEqual(['ana', 'carla']);
    expect(formValues(true, [])).toEqual([]);
  });

  it('simple: siempre uno, vacío si no hay selección', () => {
    expect(formValues(false, ['ana'])).toEqual(['ana']);
    expect(formValues(false, [])).toEqual(['']);
  });
});
