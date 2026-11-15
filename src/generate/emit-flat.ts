// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { defaultScales, type Scales } from '../config/scales.ts';
import { aliasDe, diccionarioConAlias, renombrar } from './naming-renames.ts';
import { ConfigError } from './errores-config.ts';
import { podarReglaRtl } from '../lib/theme/typography-scale.ts';
import { varsReferenciadas } from './podar-tema.ts';
import { tablaPrefijos, validarCadena, type Segmento } from './variantes.ts';
import { ORDEN_CAPAS } from './emit-cdn.ts';
import { canalesDeUtilidad, partirConCanales, propiedadesDeCanales, textoDeFondoEnEstado } from './canales.ts';
import { componerUso, esModificadorPropio, expandirPropia, modificadoresDe, ordenDePropias, propiasConCadenas, rangoDe, type ParPropia } from './propias.ts';

interface UtilityBlock {
    name: string;
    body: string;
}

const NOMBRE_UTILITY = /@utility\s+([A-Za-z0-9_\\/:@.-]+)\s*\{/g;

export function parseUtilities(css: string): UtilityBlock[] {
    const blocks: UtilityBlock[] = [];
    const re = NOMBRE_UTILITY;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) {
        let depth = 1;
        let i = re.lastIndex;
        while (i < css.length && depth > 0) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') depth--;
            i++;
        }
        blocks.push({ name: m[1], body: css.slice(re.lastIndex, i - 1) });
        re.lastIndex = i;
    }
    return blocks;
}

const TOPE_PROFUNDIDAD_APPLY = 64;
const TOPE_EXPANSION_APPLY = 1024 * 1024;
const desbordeApply = (bloque: string, limit: 'depth' | 'block-size', max: number) =>
    new ConfigError([{ path: 'extensions', code: 'ext-apply-budget', params: { block: bloque, limit, max } }]);

const memos = new WeakMap<Map<string, string>, { tam: number; expandidas: Map<string, string> }>();
const memoDe = (dict: Map<string, string>) => {
    let m = memos.get(dict);
    if (!m || m.tam !== dict.size) {
        m = { tam: dict.size, expandidas: new Map() };
        memos.set(dict, m);
    }
    return m.expandidas;
};

function reemplazarApply(body: string, f: (lista: string) => string): string {
    let out = '';
    let desde = 0;
    for (let i = body.indexOf('@apply'); i !== -1; i = body.indexOf('@apply', desde)) {
        const p = i + 6;
        const fin = /\s/.test(body[p] ?? '') ? body.indexOf(';', p) : -1;
        if (fin === -1 && /\s/.test(body[p] ?? '')) break;
        if (fin - p < 2) {
            out += body.slice(desde, i + 6);
            desde = i + 6;
            continue;
        }
        out += body.slice(desde, i) + f(body.slice(p + 1, fin));
        desde = fin + 1;
    }
    return out + body.slice(desde);
}

export function expandApply(
    body: string,
    dict: Map<string, string>,
    stack: string[] = [],
): string {
    const memo = memoDe(dict);
    return reemplazarApply(body, (lista) => {
        const clases = lista.trim().split(/\s+/).filter(Boolean);
        if (stack.length >= TOPE_PROFUNDIDAD_APPLY) throw desbordeApply(stack[0], 'depth', TOPE_PROFUNDIDAD_APPLY);
        const expandir = (clase: string) => {
            if (stack.includes(clase)) {
                throw new Error(
                    `Ciclo de @apply: ${[...stack, clase].join(' → ')}. ` +
                        `Se revisan emit-utilities.ts / emit-components.ts.`,
                );
            }
            const cuerpo = dict.get(clase);
            if (cuerpo === undefined) {
                throw new Error(
                    `@apply ${clase}: no existe esa utilidad. ` +
                        `Se aplicó desde ${stack.length ? stack.join(' → ') : '(raíz)'}. ` +
                        `Si es una clase de Tailwind y no de Taisho, el CSS plano no la puede resolver.`,
                );
            }
            let r = memo.get(clase);
            if (r === undefined) {
                r = expandApply(cuerpo, dict, [...stack, clase]);
                if (r.length > TOPE_EXPANSION_APPLY) throw desbordeApply(stack[0] ?? clase, 'block-size', TOPE_EXPANSION_APPLY);
                memo.set(clase, r);
            }
            return r;
        };
        const peso = new Map<string, number>();
        for (const c of clases) if (dict.has(c) && !peso.has(c)) peso.set(c, contarDeclaraciones(expandir(c)));
        const ordenadas = [...clases].sort((a, b) => (peso.get(b) ?? 0) - (peso.get(a) ?? 0));
        let total = 0;
        return ordenadas
            .map((clase) => {
                const r = expandir(clase).trim();
                total += r.length;
                if (total > TOPE_EXPANSION_APPLY) throw desbordeApply(stack[0] ?? clase, 'block-size', TOPE_EXPANSION_APPLY);
                return r;
            })
            .join('\n  ');
    });
}

export function quitarUtilities(css: string): string {
    const re = NOMBRE_UTILITY;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    let out = '';
    let last = 0;
    while ((m = re.exec(css)) !== null) {
        let depth = 1;
        let i = re.lastIndex;
        while (i < css.length && depth > 0) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') depth--;
            i++;
        }
        out += css.slice(last, m.index);
        last = i;
        re.lastIndex = i;
    }
    return out + css.slice(last);
}

function quitarWhere(s: string): string {
    for (let i = s.indexOf(':where('); i !== -1; i = s.indexOf(':where(')) {
        let depth = 0;
        let j = i + ':where'.length;
        for (; j < s.length; j++) {
            if (s[j] === '(') depth++;
            if (s[j] === ')' && --depth === 0) break;
        }
        s = s.slice(0, i) + s.slice(j + 1);
    }
    return s;
}

export function contarDeclaraciones(body: string): number {
    return declaracionesDe(body).length;
}

const RESPALDOS_CON_PREFIJO = new Set(['-webkit-user-select', '-webkit-backdrop-filter']);

function declaracionesDe(body: string): string[] {
    let depth = 0;
    let plano = '';
    for (const ch of body) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (depth === 0) plano += ch;
    }
    return quitarWhere(plano).split(';').filter((d) => d.includes(':') && !RESPALDOS_CON_PREFIJO.has(d.slice(0, d.indexOf(':')).trim()));
}

const propiedadDe = (declaracion: string) => declaracion.slice(0, declaracion.indexOf(':')).trim();

const ABREVIADAS = [
    'all', 'font', 'background', 'border', 'border-block', 'border-inline', 'border-width', 'border-style', 'border-color', 'border-radius', 'inset', 'inset-block', 'inset-inline',
    'margin', 'margin-block', 'margin-inline', 'padding', 'padding-block', 'padding-inline', 'gap', 'place-items', 'place-content', 'place-self', 'flex', 'flex-flow',
    'grid-column', 'grid-row', 'overflow', 'outline', 'text-decoration', 'transition', 'animation',
];

const porTexto = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const escaparClase = (n: string) => n.replace(/^[0-9]/, (d) => `\\3${d} `).replace(/([:@.]|(?<!\\)\/)/g, '\\$1');

const LLAVE = 'ts';

const selector = (nombre: string) => `.${escaparClase(nombre)}`;

const selectores = (nombre: string, alias: ReadonlyMap<string, string>, prefijo = '', propia = false, sufijo = '', modificadores: readonly string[] = []) => {
    if (propia) return selector(prefijo + nombre) + (modificadores.length ? `:where(.${modificadores.join('.')})` : '') + sufijo;
    return `:where(.${LLAVE})${selector(prefijo + (alias.get(nombre) ?? nombre).slice(3))}${sufijo}`;
};

const normal = (nombre: string) => nombre.replaceAll('\\', '');

export function podarTonos(css: string, usadas: ReadonlySet<string>): string {
    if (usadas.has('variant-{') || usadas.has('variant-')) return css;
    return css.replace(/(?<=\n) {2}&\.variant-([A-Za-z0-9-]+?-\d+) \{\n[\s\S]*?\n {2}\}\n\n/g, (regla, tono: string) =>
        usadas.has(`variant-${tono}`) || usadas.has(tono) ? regla : '');
}

function reescribirPreludios(css: string, f: (prelude: string) => string): string {
    let out = '';
    let ini = 0;
    let parens = 0;
    for (let i = 0; i < css.length; i++) {
        const c = css[i];
        if (c === '/' && css[i + 1] === '*') {
            i = css.indexOf('*/', i + 2) + 1;
            if (i === 0) break;
        } else if (c === '"' || c === "'") {
            for (i++; i < css.length && css[i] !== c; i++) if (css[i] === '\\') i++;
        } else if (c === '(') parens++;
        else if (c === ')') parens--;
        else if (parens === 0) {
            if (c === ';' || c === '}') {
                out += css.slice(ini, i + 1);
                ini = i + 1;
            } else if (c === '{') {
                out += f(css.slice(ini, i)) + '{';
                ini = i + 1;
            }
        }
    }
    return out + css.slice(ini);
}

function scopearPreludios(css: string): string {
    if (!css.includes('.ts-')) return css;
    return reescribirPreludios(css, (prelude) =>
        sinRepetidos(
        prelude.replace(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\.(ts-[A-Za-z0-9_-]+)/g, (m, n: string | undefined) => {
            if (n === undefined) return m;
            const r = renombrar(n);
            if (r && r.nuevo === null) throw new Error(`Scope: el selector anidado ".${n}" está deprecado y no tiene sucesor.`);
            return `:where(.${LLAVE}).${(r?.nuevo ?? n).slice(3)}`;
        }),
        ),
    );
}

function sinRepetidos(prelude: string): string {
    const lista: string[] = [];
    let prof = 0;
    let ini = 0;
    for (let i = 0; i < prelude.length; i++) {
        const c = prelude[i];
        if (c === '(' || c === '[') prof++;
        else if (c === ')' || c === ']') prof--;
        else if (c === ',' && prof === 0) {
            lista.push(prelude.slice(ini, i));
            ini = i + 1;
        }
    }
    lista.push(prelude.slice(ini));
    const vistos = new Set<string>();
    return lista.filter((m) => !vistos.has(m.trim()) && vistos.add(m.trim())).join(',');
}

export { tablaPrefijos, type Envoltura } from './variantes.ts';

const FAMILIAS_RESPONSIVE: RegExp[] = [
    /^ts-(block|inline-block|flex|inline-flex|grid|inline-grid|hidden)$/,
    /^ts-flex-(row|col|wrap|nowrap|row-reverse|col-reverse|wrap-reverse)$/,
    /^ts-(grid-cols|grid-rows|col-span|row-span)-/,
    /^ts-gap(-x|-y)?-/,
    /^ts-text-(left|center|right|start|end)$/,
    /^ts-(items|justify|self|place)-/,
    /^ts-w-(auto|full|fit|screen)$/,
];

const FAMILIAS_ESTADO: Array<[prefijo: string, re: RegExp]> = [
    ['hover:', /^ts-(bg|color|border|ring)-(?!shadow-|[tbse]-)[a-zA-Z]+(?:-[a-zA-Z]+)*-\d{3,4}$/],
    ['hover:', /^ts-color-(heading|copy|subtle|label|success|warning|info|danger)$/],
    ['hover:', /^ts-(underline|no-underline|opacity-\d+)$/],
    ['print:', /^ts-(hidden|block)$/],
];

export function variantesCuradas(scales: Scales = defaultScales): string[] {
    const out: string[] = [];
    const screens = ['', 'sm:', 'md:', 'lg:', '@sm:', '@md:', '@lg:', '@xl:'];
    for (let i = 1; i <= 12; i++) {
        for (const screen of screens) {
            out.push(`${screen}ts-grid-cols-${i}`, `${screen}ts-grid-rows-${i}`, `${screen}ts-col-span-${i}`, `${screen}ts-row-span-${i}`);
        }
    }
    for (const screen of screens) out.push(`${screen}ts-col-span-full`, `${screen}ts-row-span-full`);
    for (const k of Object.keys(scales.gaps)) {
        for (const screen of screens) out.push(`${screen}ts-gap-${k}`, `${screen}ts-gap-x-${k}`, `${screen}ts-gap-y-${k}`);
    }
    return out;
}

export function tokenizar(contenido: string): string[] {
    return (contenido.match(/[A-Za-z0-9_@:./-]+(?:(?<=-)\$?\{)?/g) ?? []).map((t) => t.replace(/\$?\{$/, '{'));
}

export interface Par {
    variantes: string[];
    base: string;
}

export function pares(tokens: readonly string[], completo: boolean): Par[] {
    const nombre = /(?:ts-[a-z0-9-]+|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)\b/y;
    const out: Par[] = [];
    for (const token of tokens) {
        const segmentos = token.split(':');
        if (segmentos.length < 2) continue;
        const ultimo = segmentos[segmentos.length - 1];
        let base: string;
        if (completo) base = ultimo.replace(/[./{]+$/, '');
        else {
            nombre.lastIndex = 0;
            base = nombre.exec(ultimo)?.[0] ?? '';
        }
        const primero = /(?<![A-Za-z0-9_-])(@?[a-z0-9][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?)$/.exec(segmentos[0]);
        const medios = segmentos.slice(1, -1);
        if (!base || !primero || !medios.every((m) => /^@?[a-z0-9][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?$/.test(m))) continue;
        out.push({ variantes: [primero[1], ...medios].map((p) => `${p}:`), base });
    }
    return out;
}

export function extraerVariantes(contenido: string): string[] {
    return [...new Set(pares(tokenizar(contenido), false).map((x) => x.variantes.join('') + x.base))];
}

export function scanVariantes(dir: string, leerDir: LeerDir): Set<string> {
    const encontradas = new Set<string>();
    const recorrer = (d: string) => {
        for (const entrada of leerDir(d)) {
            if (entrada.esDirectorio) recorrer(entrada.ruta);
            else if (entrada.ruta.endsWith('.svelte')) {
                for (const v of extraerVariantes(entrada.contenido())) encontradas.add(v);
            }
        }
    };
    recorrer(dir);
    return encontradas;
}

export type LeerDir = (dir: string) => Array<{
    ruta: string;
    esDirectorio: boolean;
    contenido: () => string;
}>;

export interface FlatInput {
    reset: string;
    atomic: string;
    utilities: string;
    components: string;
    variantesUsadas?: Set<string>;
    scales?: Scales;
    userUtilities?: Record<string, string[]>;
    usadas?: ReadonlySet<string>;
    forzadas?: ReadonlySet<string>;
    varsDelProyecto?: ReadonlySet<string>;
}

export type FlatPreparado = ReturnType<typeof prepararFlat>;

export function prepararFlat({
    reset,
    atomic,
    utilities,
    components,
    scales = defaultScales,
    userUtilities = {},
}: Pick<FlatInput, 'reset' | 'atomic' | 'utilities' | 'components' | 'scales' | 'userUtilities'>) {
    const planas = Object.fromEntries(Object.entries(userUtilities).filter(([k]) => !esModificadorPropio(k)));
    const cuerpoFijas = (clases: readonly string[]) => {
        const fijas = clases.filter((c) => !c.includes(':'));
        return fijas.length ? `\n  @apply ${fijas.map((c) => (Object.hasOwn(planas, c) ? c : `ts-${c}`)).join(' ')};\n` : '';
    };
    const bloques = [
        ...parseUtilities(atomic),
        ...parseUtilities(utilities),
        ...parseUtilities(components),
        ...Object.entries(planas).map(([name, clases]) => ({ name, body: cuerpoFijas(clases) })),
    ];
    const dict = diccionarioConAlias(bloques);
    const modUnits = new Map<string, Array<{ clave: string; componente: string; modificadores: string[]; hojas: ParPropia[]; rango: number }>>();
    for (const [componente, lista] of modificadoresDe(userUtilities)) {
        modUnits.set(componente, lista.map((m, i) => {
            dict.set(m.clave, cuerpoFijas(userUtilities[m.clave]));
            return { ...m, componente, hojas: expandirPropia(m.clave, userUtilities), rango: i };
        }));
    }
    const viejoDe = new Map<string, string>();
    for (const [viejo, nuevo] of aliasDe(bloques.map((b) => b.name))) viejoDe.set(nuevo, viejo);
    const alias = aliasDe(bloques.map((b) => b.name));
    const propia = (n: string) => Object.hasOwn(planas, n);
    const sinRegla = (n: string) => !propia(n) && !alias.has(n) && renombrar(normal(n)) !== null;

    let sueltos = '';
    for (const fuente of [atomic, utilities, components]) {
        const suelto = quitarUtilities(fuente)
            .replace(/^@import\s+[^;]+;\s*$/gm, '')
            .trim();
        if (suelto) sueltos += scopearPreludios(suelto) + '\n';
    }

    const nombresBase = bloques.map((b) => b.name);
    const componentes = new Set(parseUtilities(components).map((b) => b.name));
    const conVariante = new Set([
        ...nombresBase.filter((n) => FAMILIAS_RESPONSIVE.some((re) => re.test(n))),
        ...Object.keys(planas),
    ]);
    const delBloque = new Map(nombresBase.map((n) => [normal(n), n]));
    const tabla = tablaPrefijos(scales.screens);

    const reglas = new Map<UtilityBlock, { css: string; declaraciones: number }>();
    const reglaDe = (b: UtilityBlock) => {
        let r = reglas.get(b);
        if (!r) {
            const expandido = expandApply(b.body, dict, [b.name]);
            const canales = componentes.has(b.name) || propia(b.name) ? '' : canalesDeUtilidad(b.name, expandido, (n) => dict.has(n));
            r = { css: `${selectores(b.name, alias, '', propia(b.name))} {${scopearPreludios(expandido.trimEnd())}${canales}\n}`, declaraciones: contarDeclaraciones(expandido) };
            reglas.set(b, r);
        }
        return r;
    };
    const cuerpos = new Map<string, string>();
    const cuerpoDe = (base: string) => {
        let c = cuerpos.get(base);
        if (c === undefined) {
            c = scopearPreludios(expandApply(dict.get(base)!, dict, [base]).trimEnd());
            cuerpos.set(base, c);
        }
        return c;
    };

    const familias = new Map(ABREVIADAS.map((p, i) => [p, i]));
    for (const b of bloques) {
        const d = declaracionesDe(b.body);
        if (d.length === 1 && !b.body.includes('@apply') && !familias.has(propiedadDe(d[0]))) familias.set(propiedadDe(d[0]), familias.size);
    }
    const lugares = new Map<string, { declaraciones: number; familia: number }>();
    const lugarDe = (nombre: string) => {
        let l = lugares.get(nombre);
        if (!l) {
            const d = declaracionesDe(cuerpoDe(nombre));
            l = { declaraciones: d.length, familia: familias.get(propiedadDe(d[0] ?? '')) ?? familias.size };
            lugares.set(nombre, l);
        }
        return l;
    };
    const compararUtilidades = (a: string, b: string) => {
        const x = lugarDe(a);
        const y = lugarDe(b);
        return y.declaraciones - x.declaraciones || x.familia - y.familia || porTexto(alias.get(a) ?? a, alias.get(b) ?? b);
    };

    const conCadenas = propiasConCadenas(userUtilities);
    const ordenPropia = ordenDePropias(userUtilities);
    const rangoMod = (u: { componente: string; modificadores: string[]; rango: number }) => rangoDe(ordenPropia.get(u.componente)!, u.modificadores.length, u.rango);
    const cuerpoHojas = (nombre: string, bases: string[]) =>
        scopearPreludios(expandApply(`\n  @apply ${bases.map((b) => delBloque.get(`ts-${b}`) ?? `ts-${b}`).join(' ')};\n`, dict, [nombre]).trimEnd());

    return { reset, scales, userUtilities, bloques, componentes, dict, viejoDe, alias, propia, sinRegla, sueltos, nombresBase, conVariante, delBloque, tabla, reglaDe, cuerpoDe, conCadenas, ordenPropia, cuerpoHojas, modUnits, rangoMod, compararUtilidades };
}

export function bloquesQueEntran(p: FlatPreparado, { usadas, forzadas = new Set<string>() }: Pick<FlatInput, 'usadas' | 'forzadas'>): UtilityBlock[] {
    const entra = (nombre: string) => {
        if (!usadas || forzadas.has(nombre)) return true;
        return usadas.has(normal(p.propia(nombre) ? nombre : (p.alias.get(nombre) ?? nombre).slice(3)));
    };
    return p.bloques.filter((b) => entra(b.name));
}

export function buildFlatCSS({ variantesUsadas, usadas, forzadas, varsDelProyecto, ...base }: FlatInput): string {
    return seleccionarFlat(prepararFlat(base), { variantesUsadas, usadas, forzadas, varsDelProyecto });
}

export function seleccionarFlat(
    p: FlatPreparado,
    { variantesUsadas = new Set<string>(), usadas, forzadas = new Set<string>(), varsDelProyecto = new Set<string>() }: Pick<FlatInput, 'variantesUsadas' | 'usadas' | 'forzadas' | 'varsDelProyecto'>,
): string {
    const { reset, scales, componentes, dict, viejoDe, alias, propia, sinRegla, sueltos, nombresBase, conVariante, delBloque, tabla, reglaDe, cuerpoDe, conCadenas, ordenPropia, cuerpoHojas, modUnits, rangoMod, compararUtilidades } = p;
    const curadas = usadas ? [] : variantesCuradas(scales);

    let out = '/* Archivo auto-generado: TAISHO FULL — CSS plano, sin Tailwind. */\n';
    out += '/* Emparejalo con UN archivo de tema: css/tokens/<tema>.css */\n\n';
    out += `${ORDEN_CAPAS}\n\n`;

    out += `@layer base {\n${reset}\n}\n\n`;
    const desdeUtilidades = out.length;

    let util = sueltos;

    const entran = bloquesQueEntran(p, { usadas, forzadas });
    const reglas = entran.map((b) => ({ nombre: b.name, ...reglaDe(b), ...(usadas && b.name === 'ts-button' && { css: podarTonos(reglaDe(b).css, usadas) }) }));
    reglas.sort((a, b) => b.declaraciones - a.declaraciones);
    const lugares1 = reglas.flatMap((r, i) => (r.declaraciones === 1 && !propia(r.nombre) ? [i] : []));
    const atomicas1 = lugares1.map((i) => reglas[i]).sort((a, b) => compararUtilidades(a.nombre, b.nombre));
    lugares1.forEach((i, k) => { reglas[i] = atomicas1[k]; });
    const modEntra = (u: { modificadores: string[] }) => !usadas || u.modificadores.every((m) => usadas.has(m));
    const reglasMod = (nombre: string) => (modUnits.get(nombre) ?? []).filter(modEntra).flatMap((u) => {
        const expandido = expandApply(dict.get(u.clave)!, dict, [u.clave]);
        return expandido.trim() === '' ? [] : [`${selectores(u.componente, alias, '', true, '', u.modificadores)} {${scopearPreludios(expandido.trimEnd())}\n}`];
    });
    const deComponentes: string[] = [];
    const deEstados: string[] = [];
    const deUtilidades: string[] = [];
    for (const r of reglas) {
        const css = [
            ...(!sinRegla(r.nombre) && !(r.declaraciones === 0 && conCadenas.has(r.nombre)) ? [r.css] : []),
            ...(propia(r.nombre) ? reglasMod(r.nombre) : []),
        ];
        if (!componentes.has(r.nombre)) deUtilidades.push(...css);
        else for (const c of css) {
            const { reposo, estados } = partirConCanales(c);
            if (reposo) deComponentes.push(reposo);
            if (estados) deEstados.push(estados);
        }
    }
    util += deUtilidades.join('\n') + '\n';

    interface Item { segmentos: Segmento[]; cadena: string[]; base: string; mods?: string[]; uso?: string[]; cuerpo?: string; rank?: number }
    const usos = new Map<string, { uso: string[]; nombre: string }>();
    const unidades = new Map<string, { base: string; mods: string[]; hojas: ParPropia[]; rank: number }>();
    for (const [n, hojas] of conCadenas) unidades.set(n, { base: n, mods: [], hojas, rank: rangoDe(ordenPropia.get(n)!) });
    for (const lista of modUnits.values()) for (const u of lista) unidades.set(u.clave, { base: u.componente, mods: u.modificadores, hojas: u.hojas, rank: rangoMod(u) });
    const sumarUso = (uso: string[], nombre: string) => usos.set(uso.join('') + nombre, { uso, nombre });
    for (const b of entran) {
        if (conCadenas.has(b.name)) sumarUso([], b.name);
        for (const u of modUnits.get(b.name) ?? []) if (modEntra(u)) sumarUso([], u.clave);
    }
    if (!usadas) for (const [prefijo, { tipo }] of tabla) if (tipo === 'media') for (const n of unidades.keys()) sumarUso([prefijo], n);
    for (const v of variantesUsadas) {
        const partes = v.split(':');
        const uso = partes.slice(0, -1).map((x) => `${x}:`);
        if (conCadenas.has(partes[partes.length - 1])) sumarUso(uso, partes[partes.length - 1]);
        for (const u of modUnits.get(partes[partes.length - 1]) ?? []) if (modEntra(u)) sumarUso(uso, u.clave);
    }
    const deContexto = new Map<string, Array<{ rank: number; css: string }>>();
    const delUso: Item[] = [];
    for (const { uso, nombre } of usos.values()) {
        const { base: comp, mods, hojas, rank } = unidades.get(nombre)!;
        const compuestas = componerUso(uso, hojas, tabla);
        if (compuestas.some((c) => !c.ok)) continue;
        const grupos = new Map<string, { hoja: string[]; cadena: string[]; segmentos: Segmento[]; bases: string[] }>();
        for (const c of compuestas) {
            if (!c.ok) continue;
            const clave = c.hoja.cadena.join('');
            const g = grupos.get(clave) ?? { hoja: c.hoja.cadena, cadena: c.cadena, segmentos: c.segmentos, bases: [] };
            if (!g.bases.includes(c.hoja.base)) g.bases.push(c.hoja.base);
            grupos.set(clave, g);
        }
        for (const g of grupos.values()) {
            if (g.cadena.length === 0) continue;
            const cuerpo = g.hoja.length === 0 ? cuerpoDe(nombre) : cuerpoHojas(nombre, g.bases);
            if (cuerpo.trim() === '') continue;
            if (g.cadena.length === 1 && g.segmentos[0].tipo === 'contexto') {
                const lista = deContexto.get(g.cadena[0]) ?? [];
                lista.push({ rank, css: `  ${selectores(comp, alias, uso.join(''), true, '', mods)} {${cuerpo}\n  }` });
                deContexto.set(g.cadena[0], lista);
            } else delUso.push({ segmentos: g.segmentos, cadena: g.cadena, base: comp, mods, uso, cuerpo, rank });
        }
    }

    const delCodigo = (c: string) => {
        const nombre = !propia(c) ? `ts-${c}` : c;
        const base = delBloque.get(nombre) ?? nombre;
        return dict.has(base) ? base : undefined;
    };
    for (const [prefijo, { valor, tipo }] of tabla) {
        if (tipo !== 'media' && tipo !== 'max' && tipo !== 'container') continue;
        const delSafelist = curadas
            .filter((c) => c.startsWith(prefijo))
            .map((c) => c.slice(prefijo.length));
        const delMarkup = [...variantesUsadas]
            .filter((c) => c.startsWith(prefijo) && !c.slice(prefijo.length).includes(':'))
            .map((c) => c.slice(prefijo.length))
            .map((base) => (!propia(base) ? `ts-${base}` : base))
            .map((base) => delBloque.get(base) ?? base)
            .filter((base) => dict.has(base));
        const basesBrutas = usadas
            ? [...new Set(delMarkup)]
            : [...new Set([...delSafelist, ...delMarkup, ...(tipo === 'media' ? conVariante : [])])];
        const todas = [...new Set(basesBrutas.map((b) => viejoDe.get(b) ?? b))].filter((b) => !conCadenas.has(b));
        const propias = todas.filter((b) => propia(b));
        const bases = todas.filter((b) => !propia(b)).sort(compararUtilidades);

        const reglas = bases.filter((base) => !sinRegla(base)).map((base) => {
            const cuerpo = dict.get(base);
            if (cuerpo === undefined) {
                throw new Error(
                    `Variante "${prefijo}${base}": no existe la utilidad base "${base}".`,
                );
            }
            const canales = componentes.has(base) ? '' : canalesDeUtilidad(base, cuerpoDe(base), (n) => dict.has(n));
            return `  ${selectores(base, alias, prefijo, propia(base))} {${cuerpoDe(base)}${canales}\n  }`;
        });
        const frente = [...(deContexto.get(prefijo) ?? []), ...propias.map((b) => ({ rank: rangoDe(ordenPropia.get(b)!), css: `  ${selectores(b, alias, prefijo, true)} {${cuerpoDe(b)}\n  }` }))];
        reglas.unshift(...frente.sort((a, b) => a.rank - b.rank).map((r) => r.css));
        if (reglas.length) {
            const abre = tipo === 'media' ? `@media (width >= ${valor})` : tipo === 'max' ? `@media (width < ${valor})` : `@container (width >= ${valor})`;
            util += `${abre} {\n${reglas.join('\n')}\n}\n`;
        }
    }

    const indiceCtx = new Map([...tabla.keys()].map((k, i) => [k, i]));
    const hallados = new Map<string, Item>();
    const sumar = (cadena: string[], hallada: string | undefined) => {
        const base = hallada === undefined ? undefined : (viejoDe.get(hallada) ?? hallada);
        if (base === undefined || sinRegla(base) || conCadenas.has(base)) return;
        const r = validarCadena(cadena, tabla);
        if (r.ok) hallados.set(cadena.join('') + base, { segmentos: r.segmentos, cadena, base, rank: propia(base) ? rangoDe(ordenPropia.get(base)!) : undefined });
    };
    if (!usadas) {
        for (const [prefijo, re] of FAMILIAS_ESTADO) for (const n of nombresBase) if (re.test(n)) sumar([prefijo], n);
    }
    for (const v of variantesUsadas) {
        const partes = v.split(':');
        const cadena = partes.slice(0, -1).map((p) => `${p}:`);
        const t = tabla.get(cadena[0]);
        if (cadena.length === 1 && (t?.tipo === 'media' || t?.tipo === 'max' || t?.tipo === 'container')) continue;
        sumar(cadena, delCodigo(partes[partes.length - 1]));
    }
    const clave = (h: { segmentos: Segmento[] }) => {
        const ctx = h.segmentos.find((x) => x.tipo === 'contexto');
        const nivel = h.segmentos.some((x) => x.tipo === 'print') ? 3 : ctx ? (ctx.container ? 2 : 1) : 0;
        return { nivel, ctx: ctx ? indiceCtx.get(ctx.prefijo)! : 0, estado: h.segmentos.flatMap((x) => x.orden) };
    };
    const comparar = (a: number[], b: number[]) => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
        return a.length - b.length;
    };
    for (const it of delUso) hallados.set(`${(it.uso ?? []).join('')}${it.base}${(it.mods ?? []).map((m) => `.${m}`).join('')}|${it.cadena.join('')}`, it);
    const ordenados = [...hallados.values()]
        .map((h) => ({ h, k: clave(h), escrita: `${(h.uso ?? h.cadena).join('')}|${(h.mods ?? []).join('.')}|${h.cadena.join('')}` }))
        .sort((x, y) => x.k.nivel - y.k.nivel || x.k.ctx - y.k.ctx || comparar(x.k.estado, y.k.estado) || (x.h.rank ?? Number.MAX_SAFE_INTEGER) - (y.h.rank ?? Number.MAX_SAFE_INTEGER) || compararUtilidades(x.h.base, y.h.base) || porTexto(x.escrita, y.escrita));
    const emitir = (lista: typeof ordenados) => {
        let abren: string[] = [];
        let delEstado: string[] = [];
        let salida = '';
        const cerrar = () => {
            if (!delEstado.length) return;
            salida += abren.map((a) => `${a} {\n`).join('') + delEstado.join('\n') + '\n' + '}\n'.repeat(abren.length);
            delEstado = [];
        };
        for (const { h } of lista) {
            const container = h.segmentos.find((x) => x.container)?.container;
            const media = [...new Set(h.segmentos.flatMap((x) => (x.media ? [x.media] : [])))]
                .sort((a, b) => (a === 'print' ? -1 : b === 'print' ? 1 : 0)).join(' and ');
            const envoltura = [...(container ? [`@container ${container}`] : []), ...(media ? [`@media ${media}`] : [])];
            if (envoltura.join() !== abren.join()) {
                cerrar();
                abren = envoltura;
            }
            const sangria = abren.length ? '  ' : '';
            const cuerpo = h.cuerpo ?? cuerpoDe(h.base) + (conEstado(h) && !componentes.has(h.base) && !propia(h.base) ? textoDeFondoEnEstado(h.base, cuerpoDe(h.base), (n) => dict.has(n)) : '');
            const sufijo = h.segmentos.map((x) => x.sufijo).join('');
            delEstado.push(`${sangria}${selectores(h.base, alias, (h.uso ?? h.cadena).join(''), propia(h.base), sufijo, h.mods)} {${cuerpo}\n${sangria}}`);
        }
        cerrar();
        return salida;
    };
    const paraImprimir = (h: Item) => h.segmentos.some((x) => x.tipo === 'print');
    const conEstado = (h: Item) => !paraImprimir(h) && h.segmentos.some((x) => x.tipo === 'estado' || x.tipo === 'grupo');
    util += emitir(ordenados.filter(({ h }) => !conEstado(h) && !paraImprimir(h)));
    const deUtilidadesConEstado = emitir(ordenados.filter(({ h }) => conEstado(h)));
    const deImpresion = emitir(ordenados.filter(({ h }) => paraImprimir(h)));

    const capa = (nombre: string, cuerpo: string) => (cuerpo.trim() ? `@layer ${nombre} {\n${cuerpo}}\n` : '');
    out += capa('components', deComponentes.join('\n') + '\n');
    out += capa('utilities', sueltos + propiedadesDeCanales(util) + util.slice(sueltos.length));
    out += capa('states', deEstados.join('\n') + '\n');
    out += capa('utility-states', deUtilidadesConEstado);
    out += capa('print', deImpresion);
    if (usadas) {
        const vivas = new Set([...varsReferenciadas(out.slice(desdeUtilidades)), ...varsDelProyecto]);
        out = out.replace(reset, () => podarReglaRtl(reset, vivas));
    }
    return out;
}
