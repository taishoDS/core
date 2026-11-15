// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export type ReglaRenombre =
    | 'fisico-inline'
    | 'texto'
    | 'negativo'
    | 'borde-fisico'
    | 'radio-fisico'
    | 'outline-focus'
    | 'color-btn'
    | 'contexto'
    | 'important'
    | 'valor-css';

export interface Renombre {
    viejo: string;
    nuevo: string | null;
    regla: ReglaRenombre;
    fusion?: boolean;
}

const LADO: Record<string, string> = { ml: 'ms', mr: 'me', pl: 'ps', pr: 'pe', left: 'start', right: 'end' };
const RADIO: Record<string, string> = { tl: 'ss', tr: 'se', bl: 'es', br: 'ee', l: 's', r: 'e' };
const ALINEA: Record<string, string> = { left: 'start', center: 'center', right: 'end' };

export function renombrar(nombre: string): Renombre | null {
    let m: RegExpMatchArray | null;
    if ((m = nombre.match(/^ts-(m|mx|my|mt|mb|ml|mr|pl|pr|left|right)-([a-z0-9]+)(-negative)?$/))) {
        const [, p, v, neg] = m;
        const np = LADO[p] ?? p;
        if (!LADO[p] && !neg) return null;
        const regla: ReglaRenombre = LADO[p] ? 'fisico-inline' : 'negativo';
        if (neg && v === 'none') return { viejo: nombre, nuevo: `ts-${np}-none`, regla, fusion: true };
        return { viejo: nombre, nuevo: `ts-${np}-${neg ? 'neg-' : ''}${v}`, regla };
    }
    if ((m = nombre.match(/^ts-text-(left|center|right)$/))) return { viejo: nombre, nuevo: `ts-align-${ALINEA[m[1]]}`, regla: 'texto' };
    if ((m = nombre.match(/^ts-text-(balance|pretty|nowrap)$/))) return { viejo: nombre, nuevo: `ts-wrap-${m[1]}`, regla: 'texto' };
    if ((m = nombre.match(/^ts-text-((heading|copy|label|button)-.+)$/))) return { viejo: nombre, nuevo: `ts-type-${m[1]}`, regla: 'texto' };
    if ((m = nombre.match(/^ts-border-(r|l)-(.+)$/))) return { viejo: nombre, nuevo: `ts-border-${m[1] === 'r' ? 'e' : 's'}-${m[2]}`, regla: 'borde-fisico' };
    if ((m = nombre.match(/^ts-radius-(tl|tr|bl|br|l|r)-inherit$/))) return { viejo: nombre, nuevo: `ts-radius-${RADIO[m[1]]}-inherit`, regla: 'radio-fisico' };
    if ((m = nombre.match(/^ts-outline-focus-(.+)$/))) return { viejo: nombre, nuevo: `ts-outline-${m[1]}`, regla: 'outline-focus', fusion: true };
    if (nombre === 'ts-cursor-cell-select') return { viejo: nombre, nuevo: 'ts-cursor-cell', regla: 'valor-css' };
    if (nombre === 'ts-density-compact') return { viejo: nombre, nuevo: 'ts-compact', regla: 'contexto' };
    if (nombre === 'ts-color-btn') return { viejo: nombre, nuevo: null, regla: 'color-btn' };
    if (nombre === 'ts-px-0-important') return { viejo: nombre, nuevo: null, regla: 'important' };
    return null;
}

export function tablaRenombres(emitidos: Iterable<string>): Renombre[] {
    const out: Renombre[] = [];
    for (const n of new Set(emitidos)) {
        const r = renombrar(n);
        if (r) out.push(r);
    }
    return out;
}

export function aliasDe(nombres: Iterable<string>): Map<string, string> {
    const alias = new Map<string, string>();
    for (const t of tablaRenombres(nombres)) if (t.nuevo !== null && !t.fusion) alias.set(t.viejo, t.nuevo);
    return alias;
}

export function diccionarioConAlias(bloques: ReadonlyArray<{ name: string; body: string }>): Map<string, string> {
    const dict = new Map<string, string>();
    for (const b of bloques) {
        if (dict.has(b.name)) throw new Error(`Bloque @utility repetido: ${b.name}. Un nombre del Core no se pisa ni se repite.`);
        dict.set(b.name, b.body);
    }
    for (const [viejo, nuevo] of aliasDe(bloques.map((b) => b.name))) dict.set(nuevo, dict.get(viejo)!);
    return dict;
}

export const esMecanico = (r: Renombre) => r.regla === 'fisico-inline' || r.regla === 'texto' || r.regla === 'valor-css';

export const TOKEN_CLASE = /(?<![A-Za-z0-9_-])ts-[A-Za-z0-9/-]*[A-Za-z0-9](?![A-Za-z0-9_-])/g;

const REGION_VIEJOS = /(?<!\/)taisho:nombres-viejos[\s\S]*?\/taisho:nombres-viejos/g;

export function regionesExcluidas(texto: string): Array<[number, number]> {
    return [...texto.matchAll(REGION_VIEJOS)].map((m) => [m.index!, m.index! + m[0].length]);
}

export const mapaDeTabla = (tabla: Iterable<Renombre>): Map<string, Renombre> => new Map([...tabla].map((r) => [r.viejo, r]));

export interface CambioNombre {
    linea: number;
    viejo: string;
    nuevo: string;
    regla: ReglaRenombre;
}

export interface Migracion {
    texto: string;
    cambios: CambioNombre[];
    sinSucesor: Array<{ linea: number; viejo: string; regla: ReglaRenombre }>;
    posibles: Array<{ linea: number; token: string }>;
    saltados: number;
}

export function migrarTexto(texto: string, mapa: ReadonlyMap<string, Renombre>): Migracion {
    const regiones = regionesExcluidas(texto);
    const cambios: CambioNombre[] = [];
    const sinSucesor: Migracion['sinSucesor'] = [];
    const posibles: Migracion['posibles'] = [];
    let saltados = 0;
    let linea = 1;
    let hasta = 0;
    const out = texto.replace(TOKEN_CLASE, (token, ...resto) => {
        const index = resto[resto.length - 2] as number;
        for (let i = hasta; i < index; i++) if (texto.charCodeAt(i) === 10) linea++;
        hasta = index;
        const r = mapa.get(token);
        if (!r) {
            if (renombrar(token) && !enRegion(regiones, index) && !esProductor(texto, index)) posibles.push({ linea, token });
            return token;
        }
        if (enRegion(regiones, index)) { saltados++; return token; }
        if (esProductor(texto, index)) return token;
        if (r.nuevo === null) { sinSucesor.push({ linea, viejo: token, regla: r.regla }); return token; }
        cambios.push({ linea, viejo: token, nuevo: r.nuevo, regla: r.regla });
        return r.nuevo;
    });
    return { texto: out, cambios, sinSucesor, posibles, saltados };
}

export const enRegion = (regiones: Array<[number, number]>, i: number) => regiones.some(([a, b]) => i >= a && i < b);
export const esProductor = (texto: string, i: number) => /@utility\s+$/.test(texto.slice(Math.max(0, i - 40), i));

export function fragmentosViejos(texto: string, viejos: Iterable<string>, emitidos: Iterable<string>): Array<{ linea: number; fragmento: string }> {
    const v = [...viejos];
    const sonViejos = new Set(v);
    const n = [...emitidos].filter((x) => !sonViejos.has(x));
    const out: Array<{ linea: number; fragmento: string }> = [];
    const regiones = regionesExcluidas(texto);
    const linea = (i: number) => texto.slice(0, i).split('\n').length;
    for (const m of texto.matchAll(/(?<![A-Za-z0-9_-])(ts-[A-Za-z0-9-]*)\$\{/g)) {
        if (enRegion(regiones, m.index!) || esProductor(texto, m.index!)) continue;
        if (v.some((x) => x.startsWith(m[1])) && !n.some((x) => x.startsWith(m[1]))) out.push({ linea: linea(m.index!), fragmento: `${m[1]}\${` });
    }
    for (const m of texto.matchAll(/\}(-negative)(?![A-Za-z0-9_-])/g)) {
        if (enRegion(regiones, m.index!)) continue;
        if (v.some((x) => x.endsWith(m[1])) && !n.some((x) => x.endsWith(m[1]))) out.push({ linea: linea(m.index!), fragmento: `}${m[1]}` });
    }
    return out;
}
