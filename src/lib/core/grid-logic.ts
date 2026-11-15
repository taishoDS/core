// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function getColumnValue(row: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((obj, k) => {
    if (obj != null && typeof obj === 'object') return (obj as Record<string, unknown>)[k];
    return undefined;
  }, row);
}

export function compareValues(av: unknown, bv: unknown): number {
  if (av == null && bv == null) return 0;
  if (av == null) return -1;
  if (bv == null) return 1;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortBy<T>(items: T[], valorDe: (item: T) => unknown, dir: 'asc' | 'desc'): T[] {
  return [...items].sort((a, b) => {
    const cmp = compareValues(valorDe(a), valorDe(b));
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function numeroLocalizado(texto: string, lang?: string): number | null {
  let grupo = '';
  let decimal = '';
  try {
    if (lang) {
      const partes = new Intl.NumberFormat(lang).formatToParts(1234567.5);
      grupo = partes.find((p) => p.type === 'group')?.value ?? '';
      decimal = partes.find((p) => p.type === 'decimal')?.value ?? '';
    }
  } catch {
  }
  const esEspacio = (c: string) => /^[\s\u202f]$/.test(c);
  const limpio = texto
    .trim()
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\u066c/g, '\u0001')
    .replace(/\u066b/g, '\u0002')
    .replace(/\u2212/g, '-');
  const g = grupo ? (esEspacio(grupo) ? '[\\s\\u202f]' : grupo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : '';
  const d = decimal ? decimal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const sep = (marca: string, propio: string) => (propio ? `(?:${marca}|${propio})` : marca);
  const G = sep('\\u0001', g);
  const D = sep('\\u0002', d);
  const m = new RegExp(`^([-+]?)(\\d{1,3}(?:${G}\\d{3})+|\\d+)(?:${D}(\\d+))?$`).exec(limpio);
  if (!m) return null;
  const entero = m[2].replace(new RegExp(G, 'g'), '');
  const n = Number(`${m[1] === '-' ? '-' : ''}${entero}${m[3] ? '.' + m[3] : ''}`);
  return Number.isFinite(n) ? n : null;
}

function comparable(valor: unknown, lang?: string): unknown {
  if (typeof valor !== 'string') return valor;
  return numeroLocalizado(valor, lang) ?? valor;
}

export function sortData<T extends Record<string, unknown>>(
  data: T[],
  key: string,
  dir: 'asc' | 'desc',
  lang?: string
): T[] {
  return sortBy(data, (row) => comparable(getColumnValue(row, key), lang), dir);
}

export interface VirtualWindow {
  start: number;
  end: number;
  padTop: number;
  padBottom: number;
}

export function computeVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  total: number,
  overscan: number
): VirtualWindow {
  if (rowHeight <= 0 || total === 0) {
    return { start: 0, end: total, padTop: 0, padBottom: 0 };
  }
  const first = Math.floor(scrollTop / rowHeight);
  const visible = Math.ceil(viewportHeight / rowHeight);
  const start = Math.max(0, first - overscan);
  const end = Math.min(total, first + visible + overscan);
  return {
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, (total - end) * rowHeight),
  };
}

export function computeVirtualWindowVariable(
  scrollTop: number,
  viewportHeight: number,
  offsets: number[],
  overscan: number
): VirtualWindow {
  const total = offsets.length - 1;
  if (total <= 0) {
    return { start: 0, end: Math.max(0, total), padTop: 0, padBottom: 0 };
  }
  const viewBottom = scrollTop + viewportHeight;
  let lo = 0;
  let hi = total;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] > scrollTop) hi = mid;
    else lo = mid + 1;
  }
  const first = Math.max(0, lo - 1);
  lo = 0;
  hi = total;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] >= viewBottom) hi = mid;
    else lo = mid + 1;
  }
  const lastExclusive = lo;
  const start = Math.max(0, first - overscan);
  const end = Math.min(total, lastExclusive + overscan);
  return {
    start,
    end,
    padTop: offsets[start],
    padBottom: Math.max(0, offsets[total] - offsets[end]),
  };
}
