// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ThemeDef } from '../lib/theme/theme-def';
export type { ThemeDef };

/**
 * Qué archivos de fuente descarga el usuario final. Cada combinación
 * alfabeto × peso es UN archivo más que baja: declarar de menos es gratis,
 * declarar de más se paga en cada visita.
 */
export interface FontFaceDef {
    /** Paquete de @fontsource, ej. '@fontsource/geist-sans'. Debe estar en dependencies. */
    source: string;
    /**
     * Alfabetos. `latin` alcanza para castellano (incluye á-ú y ñ); `latin-ext`
     * agrega europeo central; el resto (cyrillic, greek, vietnamese) solo si tu
     * producto los necesita de verdad.
     */
    subsets: string[];
    /** Pesos numéricos. Ver `fontWeights` en scales.ts para el nombre de cada uno. */
    weights: number[];
    /**
     * Estilos a descargar de cada peso. `['normal']` por defecto (sin cambio para quien no lo declara);
     * `['normal', 'italic']` suma la itálica real de @fontsource (`latin-400-italic.css`) por cada peso y
     * alfabeto: son archivos extra que bajan, así que declaralo sólo si tu texto usa `<em>`/`italic`.
     * Sin itálica propia el navegador la simula inclinando la normal. Si el paquete no trae itálica para
     * algún peso, `generate` corta con un error que lo nombra.
     */
    styles?: ('normal' | 'italic')[];
}

/** Entrada del registro de temas, con su grupo (carpeta) para la salida. */
export interface ThemeEntry {
    /** Id del tema = nombre de archivo (mi-tema.ts → "mi-tema"). */
    name: string;
    /** Grupo/carpeta: 'root' (themes/*.ts) o 'frontend' (themes/frontend/*.ts). */
    group: 'root' | 'frontend';
    def: ThemeDef;
}
