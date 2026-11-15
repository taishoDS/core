// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function firstRevealedLink(revelados: Element[]): HTMLElement | null {
  for (const el of revelados) {
    const enlace = el.matches('a[href]') ? el : el.querySelector('a[href]');
    if (enlace instanceof HTMLElement) return enlace;
  }
  return null;
}
