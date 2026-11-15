// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { aliasDe } from './naming-renames.ts';

export interface Emitidos {
    atomic: string[];
    utils: string[];
    comp: string[];
    anidadas: string[];
    contextos: string[];
    aliases: string[];
    todos: string[];
}

const nombresUtility = (css: string) => [...css.matchAll(/^@utility (\S+)/gm)].map((m) => m[1].replaceAll('\\', ''));
const clases = (css: string) => [...css.matchAll(/\.(ts-[A-Za-z0-9_-]+)/g)].map((m) => m[1]);
const contextosDe = (css: string) => [...css.matchAll(/:where\(\.ts\)\.([A-Za-z0-9_-]+)/g)].map((m) => `ts-${m[1]}`);

function cssDe(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) cssDe(p, out);
        else if (e.name.endsWith('.css')) out.push(p);
    }
    return out;
}

export function leerEmitidos(root = process.cwd()): Emitidos & { compCss: string } {
    const dir = path.join(root, 'src/lib/css');
    const leer = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
    const atomic = nombresUtility(leer('atomic.css'));
    const utils = nombresUtility(leer('utilities.css'));
    const compCss = leer('components.css');
    const comp = nombresUtility(compCss);
    const todos = [...atomic, ...utils, ...comp];
    const aliases = [...aliasDe(todos).values()];
    const conocidos = new Set([...todos, ...aliases]);
    const contextos = [...new Set(cssDe(path.join(dir, 'tokens')).flatMap((f) => contextosDe(fs.readFileSync(f, 'utf8'))))];
    const anidadas = [...new Set(clases(compCss))].filter((n) => !conocidos.has(n) && !contextos.includes(n));
    return { atomic, utils, comp, anidadas, contextos, aliases, todos, compCss };
}
