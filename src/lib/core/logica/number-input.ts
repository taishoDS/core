// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function stepValue(value: number, step: number, direction: 1 | -1): number {
  const decimalsOf = (n: number) => (n.toString().split('.')[1] ?? '').length;
  const decimals = Math.max(decimalsOf(step), decimalsOf(value));
  return parseFloat((value + direction * step).toFixed(decimals));
}

export function safeBounds(min: number, max: number): { min: number; max: number } {
  return {
    min: Math.max(min, -Number.MAX_SAFE_INTEGER),
    max: Math.min(max, Number.MAX_SAFE_INTEGER),
  };
}

export function clampSafe(value: number, min: number, max: number): number {
  const b = safeBounds(min, max);
  return clampValue(value, b.min, b.max);
}

export function stepAvailability(value: number, min: number, max: number): { decrement: boolean; increment: boolean } {
  const b = safeBounds(min, max);
  return { decrement: value > b.min, increment: value < b.max };
}

export function parseTyped(text: string, min: number, max: number, fmt?: NumberFormat | null): number | null {
  const raw = fmt ? parseFormatted(text, fmt) : parseFloat(text);
  return raw === null || isNaN(raw) ? null : clampSafe(raw, min, max);
}

export function blocksInput(data: string | null, min: number): boolean {
  return data !== null && data.includes('-') && !(min < 0);
}

export function stepBase(typed: number | null, lastValid: number | null, min: number): number {
  return typed ?? lastValid ?? (Number.isFinite(min) ? min : 0);
}

export function resolveLargeStep(step: number, largeStep?: number): number {
  return largeStep !== undefined && largeStep > 0 ? largeStep : parseFloat((step * 10).toPrecision(12));
}

export type NumberKey = 'Home' | 'End' | 'PageUp' | 'PageDown';

export function isNumberKey(key: string): key is NumberKey {
  return key === 'Home' || key === 'End' || key === 'PageUp' || key === 'PageDown';
}

export function keyAction(
  key: NumberKey,
  current: number | null,
  min: number,
  max: number,
  step: number,
  largeStep?: number,
  readonly = false,
): number | null {
  if (readonly) return null;
  if (key === 'Home') return Number.isFinite(min) ? clampSafe(min, min, max) : null;
  if (key === 'End') return Number.isFinite(max) ? clampSafe(max, min, max) : null;
  const base = current ?? (Number.isFinite(min) ? min : 0);
  const salto = resolveLargeStep(step, largeStep);
  const decimales = (n: number) => (n.toString().split('.')[1] ?? '').length;
  const next = base + (key === 'PageUp' ? salto : -salto);
  return clampSafe(parseFloat(next.toFixed(Math.max(decimales(step), decimales(salto)))), min, max);
}

export function restoreText(text: string, lastValid: number | null, fmt?: NumberFormat | null): string | null {
  if (lastValid === null) return null;
  if (fmt) {
    const shown = formatValue(lastValid, fmt);
    return text === shown ? null : shown;
  }
  const raw = parseFloat(text);
  return isNaN(raw) || raw !== lastValid ? String(lastValid) : null;
}

export function wheelAction(allowWheel: boolean, deltaY: number): 'scroll' | 1 | -1 | 0 {
  if (!allowWheel) return 'scroll';
  return deltaY < 0 ? 1 : deltaY > 0 ? -1 : 0;
}

export interface NumberFormat {
  nf: Intl.NumberFormat;
  decimal: string;
  scale: number;
}

const formatos = new Map<string, NumberFormat>();

export function resolveNumberFormat(options: Intl.NumberFormatOptions, locale: string): NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatos.get(key);
  if (!f) {
    const nf = new Intl.NumberFormat(locale, options);
    const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.';
    f = { nf, decimal, scale: options.style === 'percent' ? 100 : 1 };
    formatos.set(key, f);
  }
  return f;
}

export function formatValue(value: number, fmt: NumberFormat): string {
  return fmt.nf.format(value);
}

export function editText(value: number, fmt: NumberFormat): string {
  const n = fmt.scale === 1 ? value : parseFloat((value * fmt.scale).toPrecision(12));
  return String(n).replace('.', fmt.decimal);
}

export function parseFormatted(text: string, fmt: NumberFormat): number | null {
  const limpio = text.replace(/[^\d.,-]/g, '');
  const negativo = limpio.startsWith('-');
  let cuerpo = limpio.replace(/-/g, '');
  const ultimo = Math.max(cuerpo.lastIndexOf('.'), cuerpo.lastIndexOf(','));
  if (ultimo >= 0) {
    const sep = cuerpo[ultimo];
    const otro = sep === '.' ? ',' : '.';
    const hayOtro = cuerpo.includes(otro);
    const repetido = cuerpo.indexOf(sep) !== ultimo;
    const decimal = hayOtro || !repetido;
    cuerpo = decimal
      ? cuerpo.slice(0, ultimo).replace(/[.,]/g, '') + '.' + cuerpo.slice(ultimo + 1)
      : cuerpo.replace(/[.,]/g, '');
  }
  const n = parseFloat(cuerpo);
  if (isNaN(n)) return null;
  return (negativo ? -n : n) / fmt.scale;
}

export function sanitizeTyped(text: string, min: number): string {
  const sinSigno = text.replace(/[^\d.,-]/g, '').replace(/(?!^)-/g, '');
  return min < 0 || !sinSigno.startsWith('-') ? sinSigno : sinSigno.slice(1);
}
