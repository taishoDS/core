// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
const LINE_PX = 16;

export function wheelDeltaPx(delta: number, deltaMode: number, pagePx: number): number {
  if (deltaMode === 1) return delta * LINE_PX;
  if (deltaMode === 2) return delta * pagePx;
  return delta;
}

export function canScrollAxis(
  overflow: string,
  scrollSize: number,
  clientSize: number,
  position: number,
  deltaPx: number,
): boolean {
  if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'overlay') return false;
  if (scrollSize <= clientSize || deltaPx === 0) return false;
  return deltaPx < 0 ? position > 0 : position + clientSize < scrollSize - 1;
}

export function forwardWheel(start: HTMLElement, e: WheelEvent): void {
  const doc = start.ownerDocument;
  for (let el = start.parentElement; el && el !== doc.body && el !== doc.documentElement; el = el.parentElement) {
    const cs = getComputedStyle(el);
    const dx = wheelDeltaPx(e.deltaX, e.deltaMode, el.clientWidth);
    const dy = wheelDeltaPx(e.deltaY, e.deltaMode, el.clientHeight);
    if (
      canScrollAxis(cs.overflowY, el.scrollHeight, el.clientHeight, el.scrollTop, dy) ||
      canScrollAxis(cs.overflowX, el.scrollWidth, el.clientWidth, el.scrollLeft, dx)
    ) {
      el.scrollBy(dx, dy);
      return;
    }
  }
  const raiz = doc.scrollingElement;
  if (raiz) {
    raiz.scrollBy(
      wheelDeltaPx(e.deltaX, e.deltaMode, raiz.clientWidth),
      wheelDeltaPx(e.deltaY, e.deltaMode, raiz.clientHeight),
    );
  }
}
