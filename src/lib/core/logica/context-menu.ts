// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function clampMenuPosition(
  x: number,
  y: number,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  if (x + size.width > viewport.width) nx = Math.max(margin, viewport.width - size.width - margin);
  if (y + size.height > viewport.height) ny = Math.max(margin, viewport.height - size.height - margin);
  return { x: nx, y: ny };
}
