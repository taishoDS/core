// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { validarCadena, type Cadena, type Envoltura } from './variantes.ts';

export interface ParPropia {
    cadena: string[];
    base: string;
}

export function partirEntrada(entrada: string): ParPropia {
    const partes = entrada.split(':');
    return { cadena: partes.slice(0, -1).map((p) => `${p}:`), base: partes[partes.length - 1] };
}

export function expandirPropia(nombre: string, utilidades: Readonly<Record<string, readonly string[]>>, camino: readonly string[] = []): ParPropia[] {
    if (camino.includes(nombre)) return [];
    const out: ParPropia[] = [];
    for (const entrada of utilidades[nombre] ?? []) {
        if (typeof entrada !== 'string') continue;
        const { cadena, base } = partirEntrada(entrada);
        if (Object.hasOwn(utilidades, base)) {
            for (const hoja of expandirPropia(base, utilidades, [...camino, nombre])) out.push({ cadena: [...cadena, ...hoja.cadena], base: hoja.base });
        } else out.push({ cadena, base });
    }
    return out;
}

export const esModificadorPropio = (clave: string) => clave.includes('.');

export function partirClave(clave: string): { componente: string; modificadores: string[] } {
    const [componente, ...modificadores] = clave.split('.');
    return { componente, modificadores };
}

export function modificadoresDe(utilidades: Readonly<Record<string, readonly string[]>>): Map<string, Array<{ clave: string; modificadores: string[] }>> {
    const out = new Map<string, Array<{ clave: string; modificadores: string[]; decl: number }>>();
    Object.keys(utilidades).forEach((clave, decl) => {
        if (!esModificadorPropio(clave)) return;
        const { componente, modificadores } = partirClave(clave);
        out.set(componente, [...(out.get(componente) ?? []), { clave, modificadores, decl }]);
    });
    for (const lista of out.values()) lista.sort((a, b) => a.modificadores.length - b.modificadores.length || a.decl - b.decl);
    return out;
}

export function modificadoresPorPropia(utilidades: Readonly<Record<string, readonly string[]>>): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const [componente, lista] of modificadoresDe(utilidades)) out.set(componente, [...new Set(lista.flatMap((m) => m.modificadores))]);
    return out;
}

export function propiasConCadenas(utilidades: Readonly<Record<string, readonly string[]>>): Map<string, ParPropia[]> {
    const out = new Map<string, ParPropia[]>();
    for (const nombre of Object.keys(utilidades)) {
        if (esModificadorPropio(nombre)) continue;
        const hojas = expandirPropia(nombre, utilidades);
        if (hojas.some((h) => h.cadena.length > 0)) out.set(nombre, hojas);
    }
    return out;
}

export function ordenDePropias(utilidades: Readonly<Record<string, readonly string[]>>): Map<string, number> {
    const orden = new Map<string, number>();
    const visitar = (n: string, camino: readonly string[]) => {
        if (orden.has(n) || camino.includes(n)) return;
        for (const e of utilidades[n]) {
            if (typeof e !== 'string') continue;
            const { base } = partirEntrada(e);
            if (Object.hasOwn(utilidades, base)) visitar(base, [...camino, n]);
        }
        orden.set(n, orden.size);
    };
    for (const n of Object.keys(utilidades)) if (!esModificadorPropio(n)) visitar(n, []);
    return orden;
}

export const rangoDe = (rango: number, nModificadores = 0, declaracion = 0) => rango * 1e6 + nModificadores * 1e3 + declaracion;

export const REGLA_CADENA = 'a lo sumo un contexto, un print, un group o peer y un estado, en ese orden, y 3 segmentos';

export type Compuesta =
    | { ok: true; cadena: string[]; hoja: ParPropia; segmentos: Extract<Cadena, { ok: true }>['segmentos'] }
    | { ok: false; hoja: ParPropia; compuesta: string };

export function componerUso(uso: readonly string[], hojas: readonly ParPropia[], tabla: ReadonlyMap<string, Envoltura>): Compuesta[] {
    const out: Compuesta[] = [];
    for (const hoja of hojas) {
        const cadena = [...uso, ...hoja.cadena];
        const r = validarCadena(cadena, tabla);
        if (!r.ok) return [...out, { ok: false, hoja, compuesta: cadena.join('') + hoja.base }];
        out.push({ ok: true, cadena, hoja, segmentos: r.segmentos });
    }
    return out;
}

export const datosComposicion = (clase: string, propia: string, uso: readonly string[], c: Extract<Compuesta, { ok: false }>) => ({
    class: clase,
    utility: propia,
    inner: c.hoja.cadena.join('') + c.hoja.base,
    use: uso.join(''),
    result: c.compuesta,
});
