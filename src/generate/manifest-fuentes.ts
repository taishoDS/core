// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { leerDir } from './leer-dir';
import type { ManifestInput } from './emit-manifest';
import { SLUGS_DEL_CORE } from './slugs-core';

type Fuentes = Pick<ManifestInput, 'slugs' | 'claseDS' | 'hooks'>;

const sinComentarios = (ts: string) => ts.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export function leerFuentesManifiesto(root: string): Fuentes {
    const claseDS = new Set<string>();
    const hooks = new Set<string>();
    for (const e of leerDir(`${root}/src/lib/core`)) {
        if (e.esDirectorio || !e.ruta.endsWith('.ts') || e.ruta.endsWith('.test.ts') || e.ruta.endsWith('/modulos.ts')) continue;
        const codigo = sinComentarios(e.contenido());
        for (const m of codigo.matchAll(/claseDS\(\s*'([^']+)'/g)) claseDS.add(m[1]);
        for (const m of codigo.matchAll(/(?:data-ts-|\$\{P\})([a-z][a-z0-9-]*)/g)) hooks.add(m[1]);
    }
    return { slugs: [...SLUGS_DEL_CORE], claseDS: [...claseDS].sort(), hooks: [...hooks].sort() };
}
