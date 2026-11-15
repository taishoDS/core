// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export const radius: Record<string, string> = {
    'none': '0px',
    'xs': 'var(--ts-sizing-2)',
    'sm': 'var(--ts-sizing-4)',
    'md': 'var(--ts-sizing-6)',
    'lg': 'var(--ts-sizing-8)',
    'xl': 'var(--ts-sizing-12)',
    '2xl': 'var(--ts-sizing-16)',
    '3xl': 'var(--ts-sizing-24)',
    'full': '9999px',
};

/** Los radios que suben un paso con `cornerShape: 'squircle'`, de menor a mayor. `none` y `full` quedan fuera. */
export const ESCALERA_RADIOS: readonly string[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

/** Cada radio de la escalera toma el valor literal del siguiente; `3xl` queda igual (no hay otro). Los nombres que suma `extend.radius` no suben. */
export function radiosSquircle(escala: Record<string, string>): Record<string, string> {
    const subidos: Record<string, string> = {};
    ESCALERA_RADIOS.slice(0, -1).forEach((nombre, i) => {
        const siguiente = escala[ESCALERA_RADIOS[i + 1]];
        if (siguiente !== undefined) subidos[nombre] = siguiente;
    });
    return subidos;
}
