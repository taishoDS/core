// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { ConfigErrorData, ConfigKeyError } from './errores-config';
import { AT_RULES_PERMITIDOS, mediaPermitida } from './extension-css';

export const LIMITES = {
    css: 256 * 1024,
    bloque: 16 * 1024,
    bloques: 2000,
    profundidad: 4,
    clasesApply: 32,
    profundidadApply: 4,
    expansionBloque: 16 * 1024,
    expansionTotal: 256 * 1024,
    tokens: 500,
    valor: 512,
    clave: 64,
    componentes: 256,
    raices: 16,
} as const;

export type Nodo =
    | { t: 'decl'; prop: string; valor: string }
    | { t: 'apply'; destinos: string[] }
    | { t: 'regla'; prelude: string; hijos: Nodo[] }
    | { t: 'at'; nombre: string; params: string; hijos: Nodo[] };

export interface BloqueExt {
    name: string;
    nodos: Nodo[];
    css: string;
}

export interface ParseExt {
    bloques: BloqueExt[];
    errores: ConfigErrorData[];
}

const FUNCIONES = new Set([
    'var', 'calc', 'min', 'max', 'clamp', 'round', 'mod', 'color-mix', 'rgb', 'hsl', 'oklch', 'linear-gradient',
    'translate', 'scale', 'rotate', 'repeat', 'minmax', 'not',
]);

const NOMBRE_BLOQUE = /^ts-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

type Tipo = 'ws' | 'str' | 'tx' | '{' | '}' | '(' | ')' | '[' | ']' | ';' | ':' | ',' | 'bs';
interface Tok { k: Tipo; v: string }

const CIERRA: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

export function tokenizar(css: string): Tok[] | null {
    const out: Tok[] = [];
    const pila: string[] = [];
    let i = 0;
    const n = css.length;
    while (i < n) {
        const c = css[i];
        if (c === '/' && css[i + 1] === '*') {
            const f = css.indexOf('*/', i + 2);
            if (f < 0) return null;
            out.push({ k: 'ws', v: ' ' });
            i = f + 2;
        } else if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
            while (i < n && (css[i] === ' ' || css[i] === '\t' || css[i] === '\n' || css[i] === '\r')) i++;
            out.push({ k: 'ws', v: ' ' });
        } else if (c === '"' || c === "'") {
            let j = i + 1;
            while (j < n && css[j] !== c && css[j] !== '\n') j++;
            if (css[j] !== c) return null;
            out.push({ k: 'str', v: css.slice(i, j + 1) });
            i = j + 1;
        } else if (c === '{' || c === '(' || c === '[') {
            pila.push(c);
            out.push({ k: c, v: c });
            i++;
        } else if (c === '}' || c === ')' || c === ']') {
            if (pila.pop() !== CIERRA[c]) return null;
            out.push({ k: c, v: c });
            i++;
        } else if (c === ';' || c === ':' || c === ',') {
            out.push({ k: c, v: c });
            i++;
        } else if (c === '\\') {
            out.push({ k: 'bs', v: c });
            i++;
        } else {
            let j = i + 1;
            while (j < n && !' \t\n\r"\'{}()[];:,\\'.includes(css[j]) && !(css[j] === '/' && css[j + 1] === '*')) j++;
            out.push({ k: 'tx', v: css.slice(i, j) });
            i = j;
        }
    }
    return pila.length ? null : out;
}

const texto = (toks: readonly Tok[]) => toks.map((t) => (t.k === 'ws' ? ' ' : t.v)).join('').replace(/ +/g, ' ').trim();
const recortar = (toks: readonly Tok[]) => {
    let a = 0;
    let b = toks.length;
    while (a < b && toks[a].k === 'ws') a++;
    while (b > a && toks[b - 1].k === 'ws') b--;
    return toks.slice(a, b);
};

type Emitir = (d: ConfigErrorData) => void;

const TEXTO_DE_VALOR = /^[A-Za-z0-9_.#%+*/!-]+$/;
const FUNCION = /^-?[A-Za-z][A-Za-z0-9-]*$/;
const CADENA_SEGURA = /^(?:'[A-Za-z0-9 #.,!?%-]{0,16}'|"[A-Za-z0-9 #.,!?%-]{0,16}")$/;

export function valorSeguro(toks: readonly Tok[], prop: string, donde: string, emitir: Emitir): string {
    const t = recortar(toks);
    const claros: ConfigErrorData[] = [];
    let confuso: ConfigErrorData | undefined;
    const sintaxis = () => { confuso ??= { code: 'ext-syntax', params: { block: donde, snippet: texto(t).slice(0, 60) } }; };
    for (let i = 0; i < t.length; i++) {
        const u = t[i];
        if (u.k === 'bs') claros.push({ code: 'ext-escape', params: { block: donde } });
        else if (u.k === 'str') {
            if (prop !== 'content' || !CADENA_SEGURA.test(u.v)) claros.push({ code: 'ext-string-not-allowed', params: { block: donde } });
        } else if (u.k === ':' || u.k === ';' || u.k === '{' || u.k === '}') sintaxis();
        else if (u.k === 'tx') {
            const sig = t.slice(i + 1).find((x) => x.k !== 'ws');
            if (u.v.includes('!')) {
                if (/^!important$/i.test(u.v) || (u.v === '!' && sig?.k === 'tx' && /^important$/i.test(sig.v))) claros.push({ code: 'ext-important', params: { block: donde } });
                else sintaxis();
            } else if (!TEXTO_DE_VALOR.test(u.v)) sintaxis();
            if (sig?.k === '(' && FUNCION.test(u.v)) {
                const f = u.v.toLowerCase();
                if (f === 'url') claros.push({ code: 'ext-url', params: { block: donde } });
                else if (!FUNCIONES.has(f)) claros.push({ code: 'ext-function-not-allowed', params: { block: donde, fn: f } });
            }
        }
    }
    for (const d of claros) emitir(d);
    if (!claros.length && confuso) emitir(confuso);
    return texto(t);
}

export function erroresDeValor(valor: string, donde: string): ConfigErrorData[] {
    const out: ConfigErrorData[] = [];
    const vistos = new Set<string>();
    const emitir: Emitir = (d) => { const k = JSON.stringify(d); if (!vistos.has(k)) { vistos.add(k); out.push(d); } };
    const bad = /[^\x20-\x7e]/.exec(valor);
    if (bad) { emitir({ code: 'ext-char-not-allowed', params: { char: codigo(bad[0]) } }); return out; }
    const toks = tokenizar(valor);
    if (!toks) { emitir({ code: 'ext-css-unbalanced', params: {} }); return out; }
    valorSeguro(toks, '', donde, emitir);
    return out;
}

const codigo = (c: string) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;

type Motivo = 'unscoped' | 'combinator' | 'pseudo' | 'attribute' | 'syntax';
interface Atomo { t: 'amp' | 'class' | 'attr' | 'pseudo' | 'el'; nombre: string; valor?: string }

const PSEUDO_CLASES = new Set([
    'hover', 'active', 'focus', 'focus-visible', 'focus-within', 'disabled', 'enabled', 'checked', 'indeterminate', 'first-child',
    'last-child', 'only-child', 'empty', 'placeholder-shown', 'read-only',
]);
const PSEUDO_ELEMENTOS = new Set(['before', 'after', 'placeholder']);
const ATRIBUTO = /^(?:aria-[a-z-]+|data-[a-z0-9-]+|dir|disabled|open|hidden|readonly|required|checked|selected)$/;
const SIN_ELEMENTO = new Set(['html', 'body', 'head']);

function compuesto(s: string, i: number, dentroNot: boolean): { fin: number; atomos: Atomo[] } | Motivo {
    const atomos: Atomo[] = [];
    const patron = (re: RegExp, desde: number) => { re.lastIndex = desde; return re.exec(s); };
    while (i < s.length && !' >+~,)'.includes(s[i])) {
        const c = s[i];
        if (c === '&') {
            if (dentroNot) return 'pseudo';
            atomos.push({ t: 'amp', nombre: '&' });
            i++;
        } else if (c === '.') {
            const m = patron(/\.([a-z][a-z0-9-]*)/y, i);
            if (!m) return 'syntax';
            atomos.push({ t: 'class', nombre: m[1] });
            i += m[0].length;
        } else if (c === '[') {
            const m = patron(/\[([a-z][a-z0-9-]*)(?:=(?:'([a-z0-9-]+)'|"([a-z0-9-]+)"|([a-z0-9-]+)))?\]/y, i);
            if (!m || !ATRIBUTO.test(m[1])) return 'attribute';
            atomos.push({ t: 'attr', nombre: m[1], valor: m[2] ?? m[3] ?? m[4] });
            i += m[0].length;
        } else if (c === ':') {
            const m = patron(/:(:?)(-?[a-z][a-z-]*)/y, i);
            if (!m) return 'syntax';
            const [, doble, nombre] = m;
            i += m[0].length;
            if (doble) {
                if (!PSEUDO_ELEMENTOS.has(nombre)) return 'pseudo';
            } else if (nombre === 'not' && s[i] === '(') {
                if (dentroNot) return 'pseudo';
                const f = s.indexOf(')', i);
                if (f < 0) return 'syntax';
                for (const alt of s.slice(i + 1, f).split(',')) {
                    const r = compuesto(alt.trim(), 0, true);
                    if (typeof r === 'string') return r;
                    if (r.atomos.length === 0 || r.fin !== alt.trim().length) return 'syntax';
                }
                i = f + 1;
            } else if (!PSEUDO_CLASES.has(nombre) || s[i] === '(') return 'pseudo';
            atomos.push({ t: 'pseudo', nombre });
        } else if (/[a-z]/.test(c)) {
            const m = patron(/[a-z][a-z0-9-]*/y, i)!;
            if (SIN_ELEMENTO.has(m[0])) return 'unscoped';
            atomos.push({ t: 'el', nombre: m[0] });
            i += m[0].length;
        } else return c === '*' ? 'unscoped' : 'syntax';
    }
    return { fin: i, atomos };
}

const esAncestro = (a: Atomo[]) => a.length === 1 && (a[0].t === 'class' || (a[0].t === 'attr' && a[0].nombre === 'dir'));

function alternativa(s: string): Motivo | null {
    if (!s) return 'syntax';
    const comps: Atomo[][] = [];
    let i = 0;
    let comb = false;
    for (;;) {
        while (s[i] === ' ') i++;
        if (i >= s.length) break;
        if (s[i] === '+' || s[i] === '~') return 'combinator';
        if (s[i] === '>') {
            if (comb) return 'syntax';
            comb = true;
            i++;
            continue;
        }
        comb = false;
        const r = compuesto(s, i, false);
        if (typeof r === 'string') return r;
        if (r.atomos.length === 0) return 'syntax';
        comps.push(r.atomos);
        i = r.fin;
    }
    if (comb) return 'syntax';
    const conAmp = comps.map((c, k) => (c.some((a) => a.t === 'amp') ? k : -1)).filter((k) => k >= 0);
    if (conAmp.length > 1) return 'unscoped';
    if (conAmp.length === 1 && conAmp[0] > 0 && (conAmp[0] > 1 || !esAncestro(comps[0]))) return 'unscoped';
    return null;
}

export function motivoSelector(prelude: string): Motivo | null {
    const lista: string[] = [];
    let prof = 0;
    let ini = 0;
    for (let i = 0; i < prelude.length; i++) {
        const c = prelude[i];
        if (c === '(' || c === '[') prof++;
        else if (c === ')' || c === ']') prof--;
        else if (c === ',' && prof === 0) { lista.push(prelude.slice(ini, i)); ini = i + 1; }
    }
    lista.push(prelude.slice(ini));
    for (const alt of lista) {
        const m = alternativa(alt.trim());
        if (m) return m;
    }
    return null;
}

const PARAMS_SEGUROS = /^[a-z0-9\s().:,<>=/%*+-]*$/;

function paramsPermitidos(regla: string, params: string): boolean {
    const p = params.toLowerCase();
    if (regla === 'starting-style') return p === '';
    if (!PARAMS_SEGUROS.test(p) || p.length > 200) return false;
    if (/[a-z0-9-]\(/.test(p.replace(/\b(?:and|or|not)\s*\(/g, '('))) return false;
    return regla === 'container' ? !/\dpx\b/.test(p) : true;
}

function serializarNodos(nodos: readonly Nodo[], nivel: number): string {
    const ind = '  '.repeat(nivel);
    let out = '';
    for (const n of nodos) {
        if (n.t === 'decl') out += `${ind}${n.prop}: ${n.valor};\n`;
        else if (n.t === 'apply') out += `${ind}@apply ${n.destinos.join(' ')};\n`;
        else if (n.t === 'regla') out += `${ind}${n.prelude} {\n${serializarNodos(n.hijos, nivel + 1)}${ind}}\n`;
        else out += `${ind}@${n.nombre}${n.params ? ` ${n.params}` : ''} {\n${serializarNodos(n.hijos, nivel + 1)}${ind}}\n`;
    }
    return out;
}

const MAX_ERRORES = 50;

export function parsearCss(css: string): ParseExt {
    const errores: ConfigErrorData[] = [];
    const bloques: BloqueExt[] = [];
    const vistos = new Set<string>();
    const emitir: Emitir = (d) => {
        const k = JSON.stringify(d);
        if (vistos.has(k) || errores.length >= MAX_ERRORES) return;
        vistos.add(k);
        errores.push(d);
    };
    if (css.length > LIMITES.css) { emitir({ code: 'ext-limit', params: { what: 'css-size', max: LIMITES.css } }); return { bloques, errores }; }
    const malo = /[^\x20-\x7e\n\t\r]/.exec(css);
    if (malo) { emitir({ code: 'ext-char-not-allowed', params: { char: codigo(malo[0]) } }); return { bloques, errores }; }
    const toks = tokenizar(css);
    if (!toks) { emitir({ code: 'ext-css-unbalanced', params: {} }); return { bloques, errores }; }

    let pos = 0;
    const saltarEspacios = () => { while (toks[pos]?.k === 'ws') pos++; };
    const saltarBloque = () => {
        for (let prof = 1; pos < toks.length && prof > 0; pos++) prof += toks[pos].k === '{' ? 1 : toks[pos].k === '}' ? -1 : 0;
    };
    const saltarSentencia = () => {
        let par = 0;
        for (; pos < toks.length; pos++) {
            const k = toks[pos].k;
            if (k === '(' || k === '[') par++;
            else if (k === ')' || k === ']') par--;
            else if (par === 0 && k === ';') { pos++; return; }
            else if (par === 0 && k === '{') { pos++; saltarBloque(); return; }
        }
    };

    const aplicar = (nombre: string, t: readonly Tok[]): Nodo | null => {
        const destinos: string[] = [];
        for (const u of recortar(t)) {
            if (u.k === 'ws') continue;
            if (u.k !== 'tx') { emitir({ code: 'ext-syntax', params: { block: nombre, snippet: `@apply ${texto(t)}`.slice(0, 60) } }); return null; }
            if (/^!important$/i.test(u.v)) emitir({ code: 'ext-important', params: { block: nombre } });
            else destinos.push(u.v);
        }
        if (destinos.length > LIMITES.clasesApply) {
            emitir({ code: 'ext-apply-budget', params: { block: nombre, limit: 'classes', max: LIMITES.clasesApply } });
            return null;
        }
        return destinos.length ? { t: 'apply', destinos } : null;
    };

    const declaracion = (nombre: string, st: readonly Tok[]): Nodo | null => {
        const t = recortar(st);
        if (!t.length) return null;
        if (t[0].k === 'tx' && t[0].v[0] === '@') {
            if (t[0].v.toLowerCase() === '@apply') return aplicar(nombre, t.slice(1));
            emitir({ code: 'ext-at-rule', params: { block: nombre, rule: /^@[a-zA-Z-]*/.exec(t[0].v)![0] } });
            return null;
        }
        let par = 0;
        let c = -1;
        for (let i = 0; i < t.length && c < 0; i++) {
            if (t[i].k === '(' || t[i].k === '[') par++;
            else if (t[i].k === ')' || t[i].k === ']') par--;
            else if (t[i].k === ':' && par === 0) c = i;
        }
        const mal = () => { emitir({ code: 'ext-syntax', params: { block: nombre, snippet: texto(t).slice(0, 60) } }); return null; };
        if (c < 0) return mal();
        const prop = texto(t.slice(0, c));
        if (prop.startsWith('--')) { emitir({ code: 'ext-custom-property', params: { block: nombre, property: prop } }); return null; }
        if (!/^-?[a-z][a-z-]*$/.test(prop)) return mal();
        const valor = valorSeguro(t.slice(c + 1), prop, nombre, emitir);
        return valor ? { t: 'decl', prop, valor } : mal();
    };

    const abertura = (nombre: string, st: readonly Tok[]): { at: string; params: string } | { prelude: string } | null => {
        const t = recortar(st);
        if (!t.length) { emitir({ code: 'ext-syntax', params: { block: nombre, snippet: '{' } }); return null; }
        if (t[0].k === 'tx' && t[0].v[0] === '@') {
            const regla = t[0].v.slice(1).toLowerCase();
            const params = texto(t.slice(1));
            if (!AT_RULES_PERMITIDOS.includes(regla)) { emitir({ code: 'ext-at-rule', params: { block: nombre, rule: `@${regla}` } }); return null; }
            if (regla === 'media' ? !mediaPermitida(params) : !paramsPermitidos(regla, params)) {
                emitir(regla === 'media'
                    ? { code: 'ext-media-query', params: { block: nombre, query: params } }
                    : { code: 'ext-at-params', params: { block: nombre, rule: `@${regla}`, params } });
                return null;
            }
            return { at: regla, params };
        }
        if (t.some((u) => u.k === 'bs')) { emitir({ code: 'ext-escape', params: { block: nombre } }); return null; }
        const prelude = texto(t);
        const motivo = motivoSelector(prelude);
        if (motivo) { emitir({ code: 'ext-selector-not-allowed', params: { block: nombre, selector: prelude.slice(0, 80), motive: motivo } }); return null; }
        return { prelude };
    };

    const cuerpo = (nombre: string, nivel: number): Nodo[] => {
        const nodos: Nodo[] = [];
        for (;;) {
            saltarEspacios();
            const t = toks[pos];
            if (!t) return nodos;
            if (t.k === '}') { pos++; return nodos; }
            if (t.k === ';') { pos++; continue; }
            const st: Tok[] = [];
            let par = 0;
            let mal = false;
            while (pos < toks.length) {
                const u = toks[pos];
                if (u.k === '(' || u.k === '[') par++;
                else if (u.k === ')' || u.k === ']') par--;
                else if (u.k === '{' || u.k === '}' || u.k === ';') {
                    if (par === 0) break;
                    mal = true;
                }
                st.push(u);
                pos++;
            }
            const fin = toks[pos]?.k;
            if (fin === ';') pos++;
            if (mal) {
                emitir({ code: 'ext-syntax', params: { block: nombre, snippet: texto(st).slice(0, 60) } });
                if (fin === '{') { pos++; saltarBloque(); }
            } else if (fin === '{') {
                pos++;
                const a = abertura(nombre, st);
                if (!a) saltarBloque();
                else if (nivel + 1 > LIMITES.profundidad) { emitir({ code: 'ext-limit', params: { what: 'depth', max: LIMITES.profundidad } }); saltarBloque(); }
                else {
                    const hijos = cuerpo(nombre, nivel + 1);
                    nodos.push('at' in a ? { t: 'at', nombre: a.at, params: a.params, hijos } : { t: 'regla', prelude: a.prelude, hijos });
                }
            } else {
                const n = declaracion(nombre, st);
                if (n) nodos.push(n);
            }
        }
    };

    for (;;) {
        saltarEspacios();
        const t = toks[pos];
        if (!t) break;
        if (t.k === 'tx' && t.v === '@utility') {
            const desde = pos;
            pos++;
            const cab: Tok[] = [];
            while (pos < toks.length && toks[pos].k !== '{' && toks[pos].k !== ';') cab.push(toks[pos++]);
            if (toks[pos]?.k !== '{') { pos = desde; emitir({ code: 'ext-top-level', params: { snippet: textoDesde(toks, desde) } }); saltarSentencia(); continue; }
            pos++;
            const nombre = texto(cab);
            if (cab.some((u) => u.k === 'bs')) emitir({ code: 'ext-escape', params: { block: nombre } });
            const nodos = cuerpo(nombre, 1);
            if (!NOMBRE_BLOQUE.test(nombre)) { emitir({ code: 'ext-name-invalid', params: { kind: 'block', name: nombre.slice(0, 80) } }); continue; }
            const cssBloque = `@utility ${nombre} {\n${serializarNodos(nodos, 1)}}\n`;
            if (cssBloque.length > LIMITES.bloque) { emitir({ code: 'ext-limit', params: { what: 'block-size', max: LIMITES.bloque } }); continue; }
            bloques.push({ name: nombre, nodos, css: cssBloque });
        } else {
            emitir({ code: 'ext-top-level', params: { snippet: textoDesde(toks, pos) } });
            saltarSentencia();
        }
    }
    return { bloques, errores };
}

function textoDesde(toks: readonly Tok[], desde: number): string {
    let par = 0;
    let prof = 0;
    const fin = (() => {
        for (let i = desde; i < toks.length; i++) {
            const k = toks[i].k;
            if (k === '(' || k === '[') par++;
            else if (k === ')' || k === ']') par--;
            else if (k === '{') prof++;
            else if (k === '}' && --prof <= 0) return i + 1;
            else if (k === ';' && par === 0 && prof === 0) return i + 1;
            if (i - desde > 60) return i;
        }
        return toks.length;
    })();
    return texto(toks.slice(desde, fin)).slice(0, 60);
}

export interface ExtensionCruda {
    components?: Record<string, { css?: unknown }>;
    utilities?: unknown;
}

const cache = new Map<string, ParseExt>();
export function parsearConCache(css: string): ParseExt {
    let p = cache.get(css);
    if (!p) {
        if (cache.size >= 64) cache.clear();
        p = parsearCss(css);
        cache.set(css, p);
    }
    return p;
}

export interface GrupoParseado {
    slug: string | undefined;
    ruta: string;
    parse: ParseExt;
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

export function parsearExtension(e: ExtensionCruda, paquete: string): GrupoParseado[] {
    const base = `extensions[${JSON.stringify(paquete)}]`;
    const out: GrupoParseado[] = [];
    if (!esObjeto(e)) return out;
    if (esObjeto(e.components)) {
        for (const [slug, c] of Object.entries(e.components)) {
            if (esObjeto(c) && typeof c.css === 'string') out.push({ slug, ruta: `${base}.components.${slug}.css`, parse: parsearConCache(c.css) });
        }
    }
    if (typeof e.utilities === 'string') out.push({ slug: undefined, ruta: `${base}.utilities`, parse: parsearConCache(e.utilities) });
    return out;
}

export const erroresDeLectura = (grupos: readonly GrupoParseado[]): ConfigKeyError[] =>
    grupos.flatMap((g) => g.parse.errores.map((d) => ({ path: g.ruta, ...d }) as ConfigKeyError));
