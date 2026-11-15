// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type SliderSize = 'sm' | 'md' | 'lg';

export type SliderRange = [number, number];

export const SLIDER_THUMB_PX: Record<SliderSize, number> = { sm: 12, md: 16, lg: 20 };

export const SLIDER_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];

export function computeFillPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const clamped = Math.min(Math.max(value, min), max);
  return parseFloat((((clamped - min) / (max - min)) * 100).toFixed(4));
}

export function normalizeRange(value: unknown, min: number, max: number): SliderRange {
  if (!Array.isArray(value) || value.length < 2 || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) {
    return [min, max];
  }
  const a = Math.min(Math.max(value[0], min), max);
  const b = Math.min(Math.max(value[1], min), max);
  return a <= b ? [a, b] : [b, a];
}

export function clampThumb(thumb: 0 | 1, v: number, par: SliderRange): SliderRange {
  return thumb === 0 ? [Math.min(v, par[1]), par[1]] : [par[0], Math.max(v, par[0])];
}

export function computeRangeFill(par: SliderRange, min: number, max: number): { from: number; to: number } {
  return { from: computeFillPercent(par[0], min, max), to: computeFillPercent(par[1], min, max) };
}

export function topThumb(par: SliderRange, min: number, max: number): 0 | 1 {
  return computeFillPercent(par[0], min, max) > 50 ? 0 : 1;
}

export function formatSliderValue(v: number, format = '{v}'): string {
  return format.replace('{v}', String(v));
}

export function joinSliderRange(inicio: string, fin: string): string {
  return `\u2068${inicio}\u2069 – \u2068${fin}\u2069`;
}

export function formatSliderRange(par: SliderRange, format = '{v}'): string {
  return joinSliderRange(formatSliderValue(par[0], format), formatSliderValue(par[1], format));
}

export function pageStopStep(count: number): number {
  return Math.max(1, Math.round(count / 10));
}

export function normalizeStops(values: unknown): number[] | null {
  if (!Array.isArray(values)) return null;
  const limpias = [...new Set(values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)))].sort((a, b) => a - b);
  return limpias.length >= 2 ? limpias : null;
}

export function ratioFromOffset(offset: number, length: number, thumbPx: number): number {
  const travel = length - thumbPx;
  if (travel <= 0) return 0;
  return Math.min(Math.max((offset - thumbPx / 2) / travel, 0), 1);
}

export function valueFromRatio(ratio: number, min: number, max: number, step = 1): number {
  if (max <= min) return min;
  const s = step > 0 ? step : 1;
  const snapped = min + Math.round(((max - min) * ratio) / s) * s;
  const decimals = (String(s).split('.')[1] ?? '').length;
  return Math.min(Math.max(parseFloat(snapped.toFixed(decimals)), min), max);
}

export function nearestThumb(par: SliderRange, v: number): 0 | 1 {
  if (v <= par[0]) return 0;
  if (v >= par[1]) return 1;
  return v - par[0] <= par[1] - v ? 0 : 1;
}
