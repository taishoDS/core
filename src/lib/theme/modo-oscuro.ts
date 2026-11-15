// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
/**
 * Cómo se activa el modo oscuro.
 * - `class` (predeterminado): sólo con la clase `dark` en `<html>`.
 * - `media`: sigue la preferencia del sistema; la clase `dark` lo fuerza oscuro y la clase `light` lo fuerza claro.
 */
export type DarkMode = 'class' | 'media';

export const MEDIA_OSCURO = '(prefers-color-scheme: dark)';

export const RAIZ_POR_SISTEMA = ':root:not(.light)';
