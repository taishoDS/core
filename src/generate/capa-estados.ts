// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { tieneMarcaDeEstado } from './estados.ts';

/**
 * Parte la regla CSS de un componente en dos: el reposo (capa `components`) y los estados (capa `states`).
 * No cambia ninguna declaración: sólo decide en qué capa cae cada regla anidada. Los estados conservan los envoltorios
 * (reglas y `@media`/`@container`) que los contenían y el orden relativo que tenían.
 */
export type Parte = { texto: string } | { prelude: string; cuerpo: Parte[] };

const esBloque = (p: Parte): p is { prelude: string; cuerpo: Parte[] } => 'cuerpo' in p;

function cierreDe(css: string, desde: number): number {
    let prof = 1;
    for (let i = desde; i < css.length; i++) {
        const c = css[i];
        if (c === '/' && css[i + 1] === '*') i = css.indexOf('*/', i + 2) + 1;
        else if (c === '"' || c === "'") {
            for (i++; i < css.length && css[i] !== c; i++) if (css[i] === '\\') i++;
        } else if (c === '{') prof++;
        else if (c === '}' && --prof === 0) return i;
    }
    throw new Error('CSS de componente sin cerrar al separar los estados.');
}

export function leerPartes(css: string): Parte[] {
    const partes: Parte[] = [];
    let buf = '';
    let parens = 0;
    for (let i = 0; i < css.length; i++) {
        const c = css[i];
        if (c === '/' && css[i + 1] === '*') {
            const f = css.indexOf('*/', i + 2) + 2;
            buf += css.slice(i, f);
            i = f - 1;
        } else if (c === '"' || c === "'") {
            const ini = i;
            for (i++; i < css.length && css[i] !== c; i++) if (css[i] === '\\') i++;
            buf += css.slice(ini, i + 1);
        } else if (c === '(') {
            parens++;
            buf += c;
        } else if (c === ')') {
            parens--;
            buf += c;
        } else if (c === ';' && parens === 0) {
            partes.push({ texto: buf + ';' });
            buf = '';
        } else if (c === '{' && parens === 0) {
            const f = cierreDe(css, i + 1);
            partes.push({ prelude: buf, cuerpo: leerPartes(css.slice(i + 1, f)) });
            buf = '';
            i = f;
        } else buf += c;
    }
    if (buf) partes.push({ texto: buf });
    return partes;
}

export const escribirPartes = (partes: readonly Parte[]): string =>
    partes.map((p) => (esBloque(p) ? `${p.prelude}{${escribirPartes(p.cuerpo)}}` : p.texto)).join('');

const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const prelude = (s: string) => s.replace(/\/\*[\s\S]*?\*\/[ \t]*\n?[ \t]*/g, '');
const cierre = (cuerpo: readonly Parte[]): Parte => {
    const ultima = cuerpo[cuerpo.length - 1];
    return ultima && !esBloque(ultima) && ultima.texto.trim() === '' ? ultima : { texto: '\n' };
};

const tieneContenido = (partes: readonly Parte[]) => partes.some((p) => esBloque(p) || sinComentarios(p.texto).trim() !== '');

/** Los selectores de una lista (`a, b:hover`), cortando sólo en las comas de primer nivel. */
export function selectoresDeLista(selector: string): string[] {
    const lista: string[] = [];
    let prof = 0;
    let ini = 0;
    for (let i = 0; i < selector.length; i++) {
        const c = selector[i];
        if (c === '(' || c === '[') prof++;
        else if (c === ')' || c === ']') prof--;
        else if (c === ',' && prof === 0) {
            lista.push(selector.slice(ini, i).trim());
            ini = i + 1;
        }
    }
    lista.push(selector.slice(ini).trim());
    return lista;
}

export interface Dividido {
    reposo: Parte[];
    estados: Parte[];
}

export function dividir(partes: readonly Parte[]): Dividido {
    const reposo: Parte[] = [];
    const estados: Parte[] = [];
    for (const p of partes) {
        if (!esBloque(p)) {
            reposo.push(p);
            continue;
        }
        const selector = sinComentarios(p.prelude).trim();
        const esRegla = !selector.startsWith('@');
        const lista = esRegla ? selectoresDeLista(selector) : [];
        const conEstado = lista.filter(tieneMarcaDeEstado);
        if (conEstado.length && conEstado.length < lista.length) {
            // Una lista mezclada (`&.a, &.a:focus-within`): cada selector va a la capa que le toca, con el mismo cuerpo.
            const sangria = /^\s*/.exec(sinComentarios(p.prelude))![0];
            const parte = (l: string[]): Parte => ({ prelude: `${sangria}${l.join(', ')} `, cuerpo: p.cuerpo });
            const d = dividir([parte(lista.filter((x) => !conEstado.includes(x)))]);
            reposo.push(...d.reposo);
            estados.push(...d.estados, parte(conEstado));
            continue;
        }
        if (conEstado.length) {
            estados.push({ prelude: prelude(p.prelude), cuerpo: p.cuerpo });
            continue;
        }
        const d = dividir(p.cuerpo);
        if (d.estados.length === 0) {
            reposo.push(p);
            continue;
        }
        if (tieneContenido(d.reposo)) reposo.push({ prelude: p.prelude, cuerpo: d.reposo });
        estados.push({ prelude: prelude(p.prelude), cuerpo: [...d.estados, cierre(p.cuerpo)] });
    }
    return { reposo, estados };
}

/** `regla` es una sola regla de primer nivel (`:where(.ts).x { … }`). Devuelve '' en `reposo` o `estados` si no queda nada. */
export function partirEstados(regla: string): { reposo: string; estados: string } {
    const d = dividir(leerPartes(regla));
    return { reposo: escribirPartes(d.reposo), estados: escribirPartes(d.estados) };
}
