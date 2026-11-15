// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type MenuKeyAction = { type: 'close' } | { type: 'moveFocus'; index: number } | null;

export function menuKeyAction(key: string, currentIndex: number, count: number): MenuKeyAction {
  if (key === 'Tab') return { type: 'close' };
  const index = nextFocusIndex(key, currentIndex, count);
  return index === null ? null : { type: 'moveFocus', index };
}

export function nextFocusIndex(
  key: string,
  currentIndex: number,
  count: number
): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowDown': return (currentIndex + 1) % count;
    case 'ArrowUp':   return (currentIndex - 1 + count) % count;
    case 'Home':      return 0;
    case 'End':       return count - 1;
    default:          return null;
  }
}
