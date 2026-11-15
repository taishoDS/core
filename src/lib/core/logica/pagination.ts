// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type PaginationPage = number | 'ellipsis';

function range(start: number, end: number): number[] {
  if (start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function buildPages(
  current: number,
  total: number,
  siblings = 1,
  boundaries = 1
): PaginationPage[] {
  if (total <= 0) return [];
  if (total === 1) return [1];

  const cur = Math.max(1, Math.min(current, total));

  const windowSize = boundaries * 2 + siblings * 2 + 3;
  if (total <= windowSize) {
    return range(1, total);
  }

  const leftBound = range(1, Math.min(boundaries, total));
  const rightBound = range(Math.max(total - boundaries + 1, 1), total);
  const leftSibling = Math.max(boundaries + 1, cur - siblings);
  const rightSibling = Math.min(total - boundaries, cur + siblings);
  const sibs = range(leftSibling, rightSibling);

  const pageSet = new Set([...leftBound, ...sibs, ...rightBound]);
  const sorted = Array.from(pageSet).sort((a, b) => a - b);

  const result: PaginationPage[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis');
    result.push(sorted[i]);
  }
  return result;
}

export function pageLabelFrom(modelLabel: string, modelPage: number, page: number): string {
  const from = String(modelPage);
  const i = modelLabel.lastIndexOf(from);
  if (i < 0) return modelLabel;
  return modelLabel.slice(0, i) + String(page) + modelLabel.slice(i + from.length);
}

export function getPageLabel(
  page: number,
  pageSize: number,
  total: number,
  template: string,
  empty: string
): string {
  if (total === 0) return empty;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return template
    .replace('{from}', String(from))
    .replace('{to}', String(to))
    .replace('{total}', String(total));
}
