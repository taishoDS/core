// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Navegación por flechas dentro de un grupo (patrón *roving tabindex* de la APG).
 *
 * Lógica pura, sin dueño del DOM: la aritmética de índices vive en un solo lugar.
 *
 * Soporta los dos ejes y las dos direcciones de escritura: con `orientation` sólo responden las flechas
 * de ese eje (horizontal: ← →; vertical: ↑ ↓) y con `rtl` las horizontales se invierten, porque el
 * orden visual va al revés del orden del DOM. Sin `orientation` responden las cuatro (grupo de radios).
 */

/** Teclas que mueven el foco dentro de un grupo. */
export type RovingKey = 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

/** Cómo se lee el teclado en un grupo: el eje que manda y la dirección de escritura. */
export interface RovingOpciones {
    /** Eje del grupo. Sin él (grupo de radios) las cuatro flechas navegan. */
    orientation?: 'horizontal' | 'vertical';
    /** Dirección de escritura de derecha a izquierda: ← avanza y → retrocede. */
    rtl?: boolean;
}

/**
 * Índice al que hay que mover el foco, o `null` si la tecla no navega.
 *
 * `null` es información: le dice a quien llama que **no** consuma el evento, para no
 * romper el scroll con flechas ni los atajos del navegador (↑ ↓ en un tablist horizontal
 * siguen desplazando la página).
 */
export function nextIndex(key: string, current: number, total: number, opciones: RovingOpciones = {}): number | null {
    if (total <= 0) return null;
    const { orientation, rtl = false } = opciones;
    const paso = (delta: number): number => (current + delta + total) % total;
    switch (key) {
        case 'ArrowRight':
            return orientation === 'vertical' ? null : paso(rtl ? -1 : 1);
        case 'ArrowLeft':
            return orientation === 'vertical' ? null : paso(rtl ? 1 : -1);
        case 'ArrowDown':
            return orientation === 'horizontal' ? null : paso(1);
        case 'ArrowUp':
            return orientation === 'horizontal' ? null : paso(-1);
        case 'Home':
            return 0;
        case 'End':
            return total - 1;
        default:
            return null;
    }
}
