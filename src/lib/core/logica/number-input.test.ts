// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { clampValue, stepValue, wheelAction, safeBounds, clampSafe, parseTyped, restoreText, resolveLargeStep, keyAction, isNumberKey, stepAvailability, blocksInput, stepBase, resolveNumberFormat, formatValue, editText, parseFormatted, sanitizeTyped } from './number-input';

describe('clampValue', () => {
  it('devuelve el valor cuando está dentro del rango', () => {
    expect(clampValue(5, 0, 10)).toBe(5);
  });

  it('clampea al mínimo', () => {
    expect(clampValue(-5, 0, 10)).toBe(0);
  });

  it('clampea al máximo', () => {
    expect(clampValue(15, 0, 10)).toBe(10);
  });
});

describe('stepValue', () => {
  it('incrementa correctamente', () => {
    expect(stepValue(5, 1, 1)).toBe(6);
    expect(stepValue(5, 0.5, 1)).toBe(5.5);
  });

  it('decrementa correctamente', () => {
    expect(stepValue(5, 1, -1)).toBe(4);
    expect(stepValue(5, 0.5, -1)).toBe(4.5);
  });

  it('conserva los decimales del valor aunque el paso sea entero', () => {
    expect(stepValue(0.5, 1, 1)).toBe(1.5);
    expect(stepValue(2.25, 1, -1)).toBe(1.25);
    expect(stepValue(0.15, 0.1, 1)).toBe(0.25);
  });

  it('mantiene precisión decimal', () => {
    expect(stepValue(0.1, 0.1, 1)).toBe(0.2);
    expect(stepValue(1.9, 0.1, 1)).toBe(2.0);
  });
});

describe('wheelAction', () => {
  it('sin allowWheel reenvía el scroll, sin importar el sentido', () => {
    expect(wheelAction(false, -100)).toBe('scroll');
    expect(wheelAction(false, 100)).toBe('scroll');
  });

  it('con allowWheel sube, baja o no hace nada', () => {
    expect(wheelAction(true, -1)).toBe(1);
    expect(wheelAction(true, 1)).toBe(-1);
    expect(wheelAction(true, 0)).toBe(0);
  });
});

describe('rango seguro', () => {
  const MAX = Number.MAX_SAFE_INTEGER;

  it('safeBounds interseca min/max con ±MAX_SAFE_INTEGER', () => {
    expect(safeBounds(-Infinity, Infinity)).toEqual({ min: -MAX, max: MAX });
    expect(safeBounds(0, 10)).toEqual({ min: 0, max: 10 });
    expect(safeBounds(0, 1e20)).toEqual({ min: 0, max: MAX });
  });

  it('clampSafe clampea a min/max y al rango seguro', () => {
    expect(clampSafe(1e20, 0, Infinity)).toBe(MAX);
    expect(clampSafe(-1e20, -Infinity, 0)).toBe(-MAX);
    expect(clampSafe(5, 0, 10)).toBe(5);
  });

  it('parseTyped de 17+ dígitos clampea a MAX_SAFE_INTEGER y deja pasar lo seguro', () => {
    expect(parseTyped('12345678901234567', -Infinity, Infinity)).toBe(MAX);
    expect(parseTyped('9007199254740991', -Infinity, Infinity)).toBe(MAX);
    expect(parseTyped('123456789012345', -Infinity, Infinity)).toBe(123456789012345);
    expect(parseTyped('abc', 0, 10)).toBeNull();
  });

  it('restoreText reescribe un texto que excede el rango seguro, y sólo ése', () => {
    expect(restoreText('12345678901234567', MAX)).toBe(String(MAX));
    expect(restoreText('123456789012345', 123456789012345)).toBeNull();
  });
});

describe('teclas de navegación', () => {
  it('isNumberKey reconoce sólo las cuatro', () => {
    expect(['Home', 'End', 'PageUp', 'PageDown'].every(isNumberKey)).toBe(true);
    expect(isNumberKey('ArrowUp')).toBe(false);
  });

  it('resolveLargeStep: step × 10 sin ruido de coma flotante, o el largeStep pedido', () => {
    expect(resolveLargeStep(1)).toBe(10);
    expect(resolveLargeStep(0.07)).toBe(0.7);
    expect(resolveLargeStep(1, 25)).toBe(25);
    expect(resolveLargeStep(1, 0)).toBe(10);
  });

  it('Home/End van a min/max sólo si existen', () => {
    expect(keyAction('Home', 5, 1, 10, 1)).toBe(1);
    expect(keyAction('End', 5, 1, 10, 1)).toBe(10);
    expect(keyAction('Home', 5, -Infinity, 10, 1)).toBeNull();
    expect(keyAction('End', 5, 1, Infinity, 1)).toBeNull();
  });

  it('PageUp/PageDown saltan step × 10 y respetan min/max', () => {
    expect(keyAction('PageUp', 5, 0, 100, 1)).toBe(15);
    expect(keyAction('PageDown', 5, 0, 100, 1)).toBe(0);
    expect(keyAction('PageUp', 95, 0, 100, 1)).toBe(100);
    expect(keyAction('PageUp', 5, 0, 100, 1, 25)).toBe(30);
    expect(keyAction('PageUp', 0.5, -Infinity, Infinity, 0.1)).toBe(1.5);
  });

  it('con el campo vacío PageUp parte del mínimo (o de 0)', () => {
    expect(keyAction('PageUp', null, 2, 100, 1)).toBe(12);
    expect(keyAction('PageUp', null, -Infinity, 100, 1)).toBe(10);
  });

  it('readonly no cambia nada', () => {
    expect(keyAction('PageUp', 5, 0, 100, 1, undefined, true)).toBeNull();
    expect(keyAction('Home', 5, 0, 100, 1, undefined, true)).toBeNull();
  });
});

describe('stepAvailability', () => {
  it('dentro del rango habilita los dos botones', () => {
    expect(stepAvailability(5, 0, 10)).toEqual({ decrement: true, increment: true });
  });

  it('en los topes deshabilita el botón que ya no avanza', () => {
    expect(stepAvailability(0, 0, 10)).toEqual({ decrement: false, increment: true });
    expect(stepAvailability(10, 0, 10)).toEqual({ decrement: true, increment: false });
  });

  it('un valor fuera de rango cuenta como el tope; sin max, el tope seguro', () => {
    expect(stepAvailability(Number.MAX_SAFE_INTEGER, 0, Infinity).increment).toBe(false);
    expect(stepAvailability(99, 0, 10).increment).toBe(false);
  });
});

describe('blocksInput', () => {
  it('con min >= 0 bloquea lo que trae un signo menos', () => {
    expect(blocksInput('-', 0)).toBe(true);
    expect(blocksInput('-4', 5)).toBe(true);
  });

  it('con min negativo o sin min deja pasar el signo, y los dígitos siempre', () => {
    expect(blocksInput('-', -10)).toBe(false);
    expect(blocksInput('-', -Infinity)).toBe(false);
    expect(blocksInput('4', 0)).toBe(false);
    expect(blocksInput(null, 0)).toBe(false);
  });
});

describe('formato', () => {
  const moneda = resolveNumberFormat({ style: 'currency', currency: 'USD', useGrouping: 'always' }, 'es-ES');
  const porcentaje = resolveNumberFormat({ style: 'percent' }, 'es-ES');
  const entero = resolveNumberFormat({ useGrouping: 'always' }, 'en-US');

  it('formatValue muestra moneda, miles y porcentaje según el locale', () => {
    expect(formatValue(12500.5, moneda).replace(/\s/g, ' ')).toBe('12.500,50 US$');
    expect(formatValue(0.15, porcentaje).replace(/\s/g, ' ')).toBe('15 %');
    expect(formatValue(1234567, entero)).toBe('1,234,567');
  });

  it('editText es el número crudo con el decimal del locale; en porcentaje, el porcentaje', () => {
    expect(editText(12500.5, moneda)).toBe('12500,5');
    expect(editText(0.07, porcentaje)).toBe('7');
    expect(editText(Number.MAX_SAFE_INTEGER, entero)).toBe('9007199254740991');
  });

  it('parseFormatted: round-trip del texto de edición y del formateado', () => {
    for (const v of [0, 12500.5, 1234567.89, -3.25]) {
      expect(parseFormatted(editText(v, moneda), moneda)).toBe(v);
      expect(parseFormatted(formatValue(v, moneda), moneda)).toBe(v);
    }
    expect(parseFormatted('15', porcentaje)).toBe(0.15);
    expect(parseFormatted('1,234.5', entero)).toBe(1234.5);
    expect(parseFormatted('1.234.567', moneda)).toBe(1234567);
  });

  it('parseFormatted devuelve null sin dígitos', () => {
    expect(parseFormatted('', moneda)).toBeNull();
    expect(parseFormatted('-', moneda)).toBeNull();
    expect(parseFormatted('US$', moneda)).toBeNull();
  });

  it('sanitizeTyped saca lo que no es número y el signo si min no admite negativos', () => {
    expect(sanitizeTyped('12a,5', 0)).toBe('12,5');
    expect(sanitizeTyped('-4', 0)).toBe('4');
    expect(sanitizeTyped('-4', -10)).toBe('-4');
    expect(sanitizeTyped('4-4', -10)).toBe('44');
  });

  it('parseTyped acota el texto con formato (clamp y MAX_SAFE_INTEGER siguen valiendo)', () => {
    expect(parseTyped('150', 0, 1, porcentaje)).toBe(1);
    expect(parseTyped('99999999999999999999', 0, Infinity, entero)).toBe(Number.MAX_SAFE_INTEGER);
    expect(parseTyped('abc', 0, 10, moneda)).toBeNull();
  });

  it('restoreText con formato devuelve el texto formateado, o null si ya lo es', () => {
    const f = formatValue(12500.5, moneda);
    expect(restoreText('12500,5', 12500.5, moneda)).toBe(f);
    expect(restoreText(f, 12500.5, moneda)).toBeNull();
    expect(restoreText('', null, moneda)).toBeNull();
  });
});

describe('stepBase', () => {
  it('un número tipeado manda; si no, el último válido; sin ninguno, el mínimo finito o 0', () => {
    expect(stepBase(3, 5, 0)).toBe(3);
    expect(stepBase(null, 5, 0)).toBe(5);
    expect(stepBase(null, null, 2)).toBe(2);
    expect(stepBase(null, null, -Infinity)).toBe(0);
  });
});
