// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Density mode (compact/comfortable).
 *
 * Toggle global vía clase `.ts.compact` en <html> (mismo patrón que
 * `.dark`): redefine las CSS custom properties de tamaño de los componentes
 * de control y la escala semántica de gaps/spaces. No-op en SSR.
 */
export function setDensity(mode: 'compact' | 'comfortable'): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.add('ts');
    document.documentElement.classList.toggle('compact', mode === 'compact');
}
