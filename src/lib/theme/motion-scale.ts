// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Escala de MOTION (valores por defecto) — PORTABLE, sin Node ni DOM.
 *
 * Fuente única de `--ts-duration-*` / `--ts-ease-*`: la consumen los emisores CSS
 * y el runtime de las transiciones, para que el movimiento de CSS y el de JS no diverjan.
 */
export const durations: Record<string, string> = {
    'instant': '100ms',
    'fast': '150ms',
    'base': '200ms',
    'slow': '300ms',
    'slower': '500ms',
};
export const loopDurations: Record<string, string> = {
    'spin': '600ms',
    'loop-fast': '1200ms',
    'loop-base': '1600ms',
    'loop-slow': '4000ms',
};
export const reducedMotionDuration = '1ms';
export const iterations: Record<string, string> = {
    'loop': 'infinite',
};
export const reducedMotionIterations = '0';
export const easings: Record<string, string> = {
    'standard': 'ease',
    'in': 'cubic-bezier(0.4, 0, 1, 1)',
    'out': 'cubic-bezier(0.22, 1, 0.36, 1)',
    'spring': 'cubic-bezier(0.16, 1.3, 0.3, 1)',
    'in-out': 'ease-in-out',
    'linear': 'linear',
};
