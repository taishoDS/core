// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { tablaRenombres, type ReglaRenombre } from './naming-renames';

export const ORDEN_REGLAS: readonly ReglaRenombre[] = [
    'fisico-inline', 'borde-fisico', 'radio-fisico', 'negativo', 'texto', 'valor-css', 'outline-focus', 'contexto', 'color-btn', 'important',
];

export type FilaMigracion = [viejo: string, nuevo: string | null];

export interface GrupoMigracion {
    regla: ReglaRenombre;
    total: number;
    filas: FilaMigracion[];
}

export interface DatosMigracion {
    total: number;
    sinSucesor: number;
    grupos: GrupoMigracion[];
}

const NO_EMITIDOS_QUE_SE_MIGRAN = ['ts-density-compact'];

export function datosMigracion(emitidos: readonly string[]): DatosMigracion {
    const tabla = tablaRenombres([...emitidos, ...NO_EMITIDOS_QUE_SE_MIGRAN]);
    const grupos: GrupoMigracion[] = ORDEN_REGLAS.map((regla) => {
        const filas: FilaMigracion[] = tabla
            .filter((r) => r.regla === regla)
            .map((r): FilaMigracion => [r.viejo, r.nuevo])
            .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        return { regla, total: filas.length, filas };
    });
    const sin = tabla.filter((r) => !ORDEN_REGLAS.includes(r.regla));
    if (sin.length) throw new Error(`naming-pagina: reglas sin lugar en la página: ${[...new Set(sin.map((r) => r.regla))].join(', ')}`);
    return { total: tabla.length, sinSucesor: tabla.filter((r) => r.nuevo === null).length, grupos };
}
