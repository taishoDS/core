// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, vi } from 'vitest';
import { isSameDay, formatDisplay, formatFull, addMonthsKeepDay, toIsoDate, isUnavailable, orderRange, rangeState, formatDisplayRange, serializeRange, parseRange, formatInput, parseDate, datePattern, resolveTyped, resolveTypedRange, type DateRange } from './date-picker';

describe('DatePicker/logic — texto del disparador y valor del form', () => {
  it('formatDisplay usa dateStyle medium del locale', () => {
    const d = new Date(2026, 6, 14);
    expect(formatDisplay(d, 'es-AR')).toBe(new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(d));
    expect(formatDisplay(d, 'en-US')).toContain('Jul');
  });

  it('toIsoDate es yyyy-mm-dd en hora local, con ceros a la izquierda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('formatFull / addMonthsKeepDay', () => {
  it('formatFull da el nombre completo de la fecha del locale (nombre accesible de la celda)', () => {
    expect(formatFull(new Date(2026, 6, 14), 'es-ES')).toBe('martes, 14 de julio de 2026');
    expect(formatFull(new Date(2026, 6, 14), 'es-ES')).toBe(new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(new Date(2026, 6, 14)));
  });

  it('addMonthsKeepDay conserva el día y recorta al último del mes', () => {
    expect(isSameDay(addMonthsKeepDay(new Date(2026, 0, 31), 1), new Date(2026, 1, 28))).toBe(true);
    expect(isSameDay(addMonthsKeepDay(new Date(2026, 6, 14), -1), new Date(2026, 5, 14))).toBe(true);
    expect(isSameDay(addMonthsKeepDay(new Date(2026, 11, 15), 1), new Date(2027, 0, 15))).toBe(true);
  });
});

describe('isUnavailable — min/max, fechas, días de la semana y función', () => {
  const sab = new Date(2026, 6, 4);
  const dom = new Date(2026, 6, 5);
  const lun = new Date(2026, 6, 6);
  const mar = new Date(2026, 6, 14);

  it('sin fuentes todo está disponible', () => {
    expect(isUnavailable(mar)).toBe(false);
    expect(isUnavailable(mar, {})).toBe(false);
    expect(isUnavailable(mar, { dates: [], weekdays: [], fn: null })).toBe(false);
  });

  it('min/max se comportan como isDisabled', () => {
    const min = new Date(2026, 6, 6);
    const max = new Date(2026, 6, 20);
    expect(isUnavailable(sab, { min, max })).toBe(true);
    expect(isUnavailable(lun, { min, max })).toBe(false);
    expect(isUnavailable(new Date(2026, 6, 21), { min, max })).toBe(true);
  });

  it('weekdays usa la convención getDay() (0 = domingo)', () => {
    expect(isUnavailable(sab, { weekdays: [0, 6] })).toBe(true);
    expect(isUnavailable(dom, { weekdays: [0, 6] })).toBe(true);
    expect(isUnavailable(lun, { weekdays: [0, 6] })).toBe(false);
  });

  it('dates compara por día e ignora la hora', () => {
    expect(isUnavailable(new Date(2026, 6, 14, 18, 30), { dates: [new Date(2026, 6, 14)] })).toBe(true);
    expect(isUnavailable(mar, { dates: [new Date(2026, 6, 15)] })).toBe(false);
  });

  it('fn recibe el día a medianoche y manda con true', () => {
    const fn = vi.fn((d: Date) => d.getDate() === 14);
    expect(isUnavailable(new Date(2026, 6, 14, 18, 30), { fn })).toBe(true);
    expect(fn.mock.calls[0][0].getHours()).toBe(0);
    expect(isUnavailable(lun, { fn })).toBe(false);
  });

  it('las fuentes se suman (OR): cualquiera alcanza', () => {
    const fuentes = { min: new Date(2026, 6, 6), weekdays: [2], dates: [new Date(2026, 6, 15)], fn: (d: Date) => d.getDate() === 16 };
    expect(isUnavailable(sab, fuentes)).toBe(true);
    expect(isUnavailable(mar, fuentes)).toBe(true);
    expect(isUnavailable(new Date(2026, 6, 15), fuentes)).toBe(true);
    expect(isUnavailable(new Date(2026, 6, 16), fuentes)).toBe(true);
    expect(isUnavailable(new Date(2026, 6, 17), fuentes)).toBe(false);
  });
});

describe('DatePicker/logic — rango', () => {
  const d = (dia: number, mes = 6) => new Date(2026, mes, dia, 15, 30);

  it('orderRange deja inicio <= fin y descarta la hora', () => {
    const r = orderRange(d(20), d(15));
    expect(toIsoDate(r.start)).toBe('2026-07-15');
    expect(toIsoDate(r.end)).toBe('2026-07-20');
    expect(r.start.getHours()).toBe(0);
  });

  it('orderRange con el mismo día da start igual a end', () => {
    const r = orderRange(d(9), d(9));
    expect(r.start.getTime()).toBe(r.end.getTime());
  });

  it('rangeState distingue los extremos, el interior y lo de afuera', () => {
    const r = orderRange(d(10), d(14));
    expect(rangeState(d(10), r)).toEqual({ start: true, end: false, between: false });
    expect(rangeState(d(12), r)).toEqual({ start: false, end: false, between: true });
    expect(rangeState(d(14), r)).toEqual({ start: false, end: true, between: false });
    expect(rangeState(d(15), r)).toEqual({ start: false, end: false, between: false });
    expect(rangeState(d(12), null)).toEqual({ start: false, end: false, between: false });
  });

  it('rangeState de un rango de un solo día marca inicio y fin y ningún interior', () => {
    expect(rangeState(d(9), orderRange(d(9), d(9)))).toEqual({ start: true, end: true, between: false });
  });

  it('serializeRange / parseRange son inversas y el intervalo cruza meses', () => {
    const r = orderRange(d(28), d(3, 7));
    expect(serializeRange(r)).toBe('2026-07-28/2026-08-03');
    const vuelta = parseRange('2026-07-28/2026-08-03')!;
    expect(vuelta.start.getTime()).toBe(r.start.getTime());
    expect(vuelta.end.getTime()).toBe(r.end.getTime());
  });

  it('parseRange rechaza lo incompleto o roto y ordena un intervalo invertido', () => {
    expect(parseRange('2026-07-28')).toBeNull();
    expect(parseRange('2026-07-28/')).toBeNull();
    expect(parseRange('x/y')).toBeNull();
    expect(parseRange(null)).toBeNull();
    expect(serializeRange(parseRange('2026-07-28/2026-07-01')!)).toBe('2026-07-01/2026-07-28');
  });

  it('formatDisplayRange usa formatRange del locale (colapsa lo repetido) y el mismo día queda como una fecha', () => {
    const r = orderRange(d(7), d(14));
    expect(formatDisplayRange(r, 'es-AR')).toBe(new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).formatRange(r.start, r.end));
    expect(formatDisplayRange(r, 'es-AR')).toContain('7');
    expect(formatDisplayRange(orderRange(d(9), d(9)), 'es-AR')).toBe(formatDisplay(d(9), 'es-AR'));
  });
});

describe('campo tipeable (allowInput): formatInput y parseDate', () => {
  const iso = (d: Date | null) => (d ? toIsoDate(d) : null);
  const seg = { day: 'dd', month: 'mm', year: 'aaaa' };

  it('formatInput escribe numérico, en el orden y con los separadores del locale', () => {
    const d = new Date(2026, 6, 14);
    expect(formatInput(d, 'es-AR')).toBe('14/07/2026');
    expect(formatInput(d, 'es-ES')).toBe('14/07/2026');
    expect(formatInput(d, 'en-US')).toBe('07/14/2026');
    expect(formatInput(d, 'de-DE')).toBe('14.07.2026');
    expect(formatInput(d, 'ja-JP')).toBe('2026/07/14');
    expect(formatInput(new Date(2026, 0, 5), 'es-AR')).toBe('05/01/2026');
  });

  it('formatInput usa dígitos latinos y calendario gregoriano aunque el locale use otros', () => {
    expect(formatInput(new Date(2026, 6, 14), 'ar-EG')).toMatch(/^[\d/]+$/);
    expect(formatInput(new Date(2026, 6, 14), 'th-TH')).toContain('2026');
  });

  it('parseDate es la inversa de formatInput en cada locale', () => {
    for (const locale of ['es-AR', 'es-ES', 'en-US', 'de-DE', 'ja-JP', 'ar-EG', 'th-TH']) {
      for (const d of [new Date(2026, 6, 14), new Date(2026, 0, 5), new Date(2028, 1, 29), new Date(2026, 11, 31)]) {
        expect(iso(parseDate(formatInput(d, locale), locale)), `${locale} ${toIsoDate(d)}`).toBe(toIsoDate(d));
      }
    }
  });

  it('parseDate respeta el orden del locale (14/07 es día/mes en es-AR y 07/14 es mes/día en en-US)', () => {
    expect(iso(parseDate('14/07/2026', 'es-AR'))).toBe('2026-07-14');
    expect(iso(parseDate('07/14/2026', 'en-US'))).toBe('2026-07-14');
    expect(iso(parseDate('14.07.2026', 'de-DE'))).toBe('2026-07-14');
    expect(iso(parseDate('2026/07/14', 'ja-JP'))).toBe('2026-07-14');
    expect(iso(parseDate('3/4/2026', 'es-AR'))).toBe('2026-04-03');
    expect(iso(parseDate('3/4/2026', 'en-US'))).toBe('2026-03-04');
  });

  it('parseDate acepta día y mes de uno o dos dígitos y los separadores / . - o espacio', () => {
    expect(iso(parseDate('5/1/2026', 'es-AR'))).toBe('2026-01-05');
    expect(iso(parseDate('05-01-2026', 'es-AR'))).toBe('2026-01-05');
    expect(iso(parseDate('5.1.2026', 'es-AR'))).toBe('2026-01-05');
    expect(iso(parseDate('5 1 2026', 'es-AR'))).toBe('2026-01-05');
    expect(iso(parseDate('  14/07/2026  ', 'es-AR'))).toBe('2026-07-14');
    expect(iso(parseDate('14.07.2026.', 'es-AR'))).toBe('2026-07-14');
  });

  it('parseDate acepta yyyy-mm-dd en cualquier locale', () => {
    expect(iso(parseDate('2026-07-14', 'es-AR'))).toBe('2026-07-14');
    expect(iso(parseDate('2026-07-14', 'en-US'))).toBe('2026-07-14');
    expect(iso(parseDate('2026-7-4', 'de-DE'))).toBe('2026-07-04');
    expect(parseDate('2026-13-01', 'en-US')).toBeNull();
  });

  it('parseDate rechaza fechas que no existen', () => {
    expect(parseDate('31/02/2026', 'es-AR')).toBeNull();
    expect(parseDate('29/02/2026', 'es-AR')).toBeNull();
    expect(iso(parseDate('29/02/2028', 'es-AR'))).toBe('2028-02-29');
    expect(parseDate('31/04/2026', 'es-AR')).toBeNull();
    expect(parseDate('00/07/2026', 'es-AR')).toBeNull();
    expect(parseDate('14/00/2026', 'es-AR')).toBeNull();
    expect(parseDate('14/13/2026', 'es-AR')).toBeNull();
    expect(parseDate('32/01/2026', 'es-AR')).toBeNull();
    expect(parseDate('13/14/2026', 'en-US')).toBeNull();
    expect(parseDate('2026-02-30', 'es-AR')).toBeNull();
  });

  it('parseDate rechaza lo que no es una fecha completa de tres partes y año de cuatro dígitos', () => {
    for (const malo of ['', '   ', 'hoy', '14/07', '14/07/26', '14/07/20266', '14/07/0026', '1/2/3/2026', '14/07/2026 10:00', 'a/b/c', '14-07-2026x', '140/07/2026', '14/070/2026']) {
      expect(parseDate(malo, 'es-AR'), JSON.stringify(malo)).toBeNull();
    }
  });

  it('parseDate acepta los bordes de año de cuatro dígitos', () => {
    expect(iso(parseDate('01/01/1900', 'es-AR'))).toBe('1900-01-01');
    expect(iso(parseDate('31/12/9999', 'es-AR'))).toBe('9999-12-31');
  });

  it('datePattern arma el placeholder con las siglas del idioma y el orden del locale', () => {
    expect(datePattern('es-AR', seg)).toBe('dd/mm/aaaa');
    expect(datePattern('en-US', { day: 'dd', month: 'mm', year: 'yyyy' })).toBe('mm/dd/yyyy');
    expect(datePattern('de-DE', { day: 'TT', month: 'MM', year: 'JJJJ' })).toBe('TT.MM.JJJJ');
    expect(datePattern('ja-JP', { day: 'dd', month: 'mm', year: 'yyyy' })).toBe('yyyy/mm/dd');
  });
});

describe('campo tipeable (allowInput): resolveTyped y resolveTypedRange', () => {
  const iso = (d: Date | null | undefined) => (d === undefined ? 'revierte' : d ? toIsoDate(d) : null);
  const isoR = (r: DateRange | null | undefined) => (r === undefined ? 'revierte' : r ? `${toIsoDate(r.start)}/${toIsoDate(r.end)}` : null);
  const src = { min: new Date(2026, 6, 6), max: new Date(2026, 6, 27), weekdays: [0, 6], dates: [new Date(2026, 6, 9)] };

  it('vacío es null (se quita la fecha); un día válido y disponible se confirma', () => {
    expect(iso(resolveTyped('', 'es-AR', src))).toBeNull();
    expect(iso(resolveTyped('   ', 'es-AR', src))).toBeNull();
    expect(iso(resolveTyped('14/07/2026', 'es-AR', src))).toBe('2026-07-14');
  });

  it('ilegible, inexistente, fuera de min/max o deshabilitado revierte', () => {
    expect(iso(resolveTyped('mañana', 'es-AR', src))).toBe('revierte');
    expect(iso(resolveTyped('31/02/2026', 'es-AR', src))).toBe('revierte');
    expect(iso(resolveTyped('05/07/2026', 'es-AR', src))).toBe('revierte');
    expect(iso(resolveTyped('28/07/2026', 'es-AR', src))).toBe('revierte');
    expect(iso(resolveTyped('09/07/2026', 'es-AR', src))).toBe('revierte');
    expect(iso(resolveTyped('18/07/2026', 'es-AR', src))).toBe('revierte');
    expect(iso(resolveTyped('06/07/2026', 'es-AR', src))).toBe('2026-07-06');
    expect(iso(resolveTyped('27/07/2026', 'es-AR', { ...src, weekdays: [] }))).toBe('2026-07-27');
  });

  it('el rango: los dos vacíos es null, el par completo se ordena y cualquier otra cosa revierte los dos', () => {
    expect(isoR(resolveTypedRange('', '', 'es-AR', src))).toBeNull();
    expect(isoR(resolveTypedRange('07/07/2026', '14/07/2026', 'es-AR', src))).toBe('2026-07-07/2026-07-14');
    expect(isoR(resolveTypedRange('14/07/2026', '07/07/2026', 'es-AR', src))).toBe('2026-07-07/2026-07-14');
    expect(isoR(resolveTypedRange('14/07/2026', '14/07/2026', 'es-AR', src))).toBe('2026-07-14/2026-07-14');
    expect(isoR(resolveTypedRange('07/07/2026', '', 'es-AR', src))).toBe('revierte');
    expect(isoR(resolveTypedRange('', '14/07/2026', 'es-AR', src))).toBe('revierte');
    expect(isoR(resolveTypedRange('07/07/2026', 'x', 'es-AR', src))).toBe('revierte');
    expect(isoR(resolveTypedRange('07/07/2026', '28/07/2026', 'es-AR', src))).toBe('revierte');
    expect(isoR(resolveTypedRange('07/07/2026', '18/07/2026', 'es-AR', src))).toBe('revierte');
  });
});
