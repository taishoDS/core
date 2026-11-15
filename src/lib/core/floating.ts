// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type FloatingPlacement =
  | 'top' | 'bottom' | 'left' | 'right'
  | 'top-start' | 'top-end'
  | 'bottom-start' | 'bottom-end'
  | 'left-start' | 'right-start';

export function resolveFloatingPlacement(
  preferred: FloatingPlacement,
  rect: { top: number; bottom: number; left: number; right: number },
  viewport: { width: number; height: number }
): FloatingPlacement {
  const [side, align] = preferred.split('-') as [string, string | undefined];
  let resolvedSide = side;
  if (side === 'top'    && rect.top    < 0)               resolvedSide = 'bottom';
  else if (side === 'bottom' && rect.bottom > viewport.height) resolvedSide = 'top';
  else if (side === 'left'   && rect.left   < 0)               resolvedSide = 'right';
  else if (side === 'right'  && rect.right  > viewport.width)  resolvedSide = 'left';
  return (align ? `${resolvedSide}-${align}` : resolvedSide) as FloatingPlacement;
}

export function resolveFloating(
  floatingEl: HTMLElement,
  preferred: FloatingPlacement
): FloatingPlacement {
  return resolveFloatingPlacement(
    preferred,
    floatingEl.getBoundingClientRect(),
    { width: window.innerWidth, height: window.innerHeight }
  );
}

export interface FloatingCoords {
  x: number;
  y: number;
  placement: FloatingPlacement;
}

type Rect = { top: number; bottom: number; left: number; right: number; width: number; height: number };
type Size = { width: number; height: number };

export function computeFloatingCoords(
  trigger: Rect,
  floating: Size,
  preferred: FloatingPlacement,
  viewport: { width: number; height: number },
  gap = 6,
  margin = 8,
  dir: 'ltr' | 'rtl' = 'ltr'
): FloatingCoords {
  const [side0, align] = preferred.split('-') as [string, string | undefined];
  const opposite: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  const room: Record<string, number> = {
    top: trigger.top,
    bottom: viewport.height - trigger.bottom,
    left: trigger.left,
    right: viewport.width - trigger.right,
  };
  const vertical = side0 === 'top' || side0 === 'bottom';
  const need = (vertical ? floating.height : floating.width) + gap;
  const side = room[side0] < need && room[opposite[side0]] > room[side0] ? opposite[side0] : side0;

  let x = 0;
  let y = 0;
  if (side === 'bottom') y = trigger.bottom + gap;
  else if (side === 'top') y = trigger.top - floating.height - gap;
  else if (side === 'right') x = trigger.right + gap;
  else if (side === 'left') x = trigger.left - floating.width - gap;

  if (side === 'top' || side === 'bottom') {
    const startX = dir === 'rtl' ? trigger.right - floating.width : trigger.left;
    const endX = dir === 'rtl' ? trigger.left : trigger.right - floating.width;
    if (align === 'start') x = startX;
    else if (align === 'end') x = endX;
    else x = trigger.left + trigger.width / 2 - floating.width / 2;
  } else {
    if (align === 'start') y = trigger.top;
    else if (align === 'end') y = trigger.bottom - floating.height;
    else y = trigger.top + trigger.height / 2 - floating.height / 2;
  }

  x = Math.max(margin, Math.min(x, viewport.width - floating.width - margin));
  y = Math.max(margin, Math.min(y, viewport.height - floating.height - margin));

  return { x, y, placement: (align ? `${side}-${align}` : side) as FloatingPlacement };
}

export function floatingGap(triggerEl: HTMLElement): number {
  return parseFloat(getComputedStyle(triggerEl).getPropertyValue('--ts-space-quarter')) || 6;
}

export function computeFloatingPosition(
  triggerEl: HTMLElement,
  floatingEl: HTMLElement,
  preferred: FloatingPlacement,
  gap?: number,
  margin = 8
): FloatingCoords {
  const dir = getComputedStyle(triggerEl).direction === 'rtl' ? 'rtl' : 'ltr';
  return computeFloatingCoords(
    triggerEl.getBoundingClientRect(),
    floatingEl.getBoundingClientRect(),
    preferred,
    { width: window.innerWidth, height: window.innerHeight },
    gap ?? floatingGap(triggerEl),
    margin,
    dir
  );
}
