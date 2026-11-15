// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { esSemillaBlanca } from './palette';

export const textoSemillaBlanca = (tema: string, color: string, semilla: string): string =>
    `Tema "${tema}": la semilla de "${color}" (${semilla}) es casi blanca: sobre el fondo claro no se ve y el relleno sólido (botones, casillas, interruptores) no puede ser blanco, así que sale gris. ` +
    `Para un botón blanco se usa una variante con borde; para la marca, una semilla más oscura.`;

export const esDesarrollo = (): boolean => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return import.meta.env?.DEV !== false;
};

const semillaBlanca = (semilla: string): boolean => {
    try {
        return esSemillaBlanca(semilla);
    } catch {
        return false;
    }
};

const avisadas = new Set<string>();

export function avisarSemillasBlancas(semillas: Record<string, string>): void {
    if (!esDesarrollo()) return;
    for (const [color, semilla] of Object.entries(semillas)) {
        const clave = `${color}:${semilla}`;
        if (avisadas.has(clave)) continue;
        if (!semillaBlanca(semilla)) continue;
        avisadas.add(clave);
        console.warn(`[TaishoDS] ${textoSemillaBlanca('runtime', color, semilla)}`);
    }
}
