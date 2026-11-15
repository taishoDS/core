// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { sortBy as coreSortBy, computeVirtualWindow as coreComputeVirtualWindow, type VirtualWindow as CoreVirtualWindow } from '../grid-logic';

export function sortBy<T>(items: T[], valorDe: (item: T) => unknown, dir: 'asc' | 'desc'): T[] {
  return coreSortBy(items, valorDe, dir);
}

export function getNextSortDir(
  currentKey: string,
  clickedKey: string,
  currentDir: 'asc' | 'desc'
): 'asc' | 'desc' {
  if (currentKey !== clickedKey) return 'asc';
  return currentDir === 'asc' ? 'desc' : 'asc';
}

export function computeVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  total: number,
  overscan = 4
): CoreVirtualWindow {
  return coreComputeVirtualWindow(scrollTop, viewportHeight, rowHeight, total, overscan);
}
