// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { screens as screensDelCore, buildVocabularyColors } from '../config/scales';
import { esComponente, etiquetaEn } from './llave-scope';
import { vocabularioClasico } from './migrar-clasico';
import { crearTraductorTailwind, partir, type Convertida, type NoConvertida, type TipoNoConvertida } from './migrar-tailwind';
import { escalasDe } from './naming-table';
import { recorrerLiterales, type ContextoLiteral, type DecisionLiteral } from './recorrer-literales';
import { construirMapa, PALABRAS_SUELTAS_TAILWIND, RAICES_TAILWIND, type MapaTailwind } from './tailwind-map';
import type { TaishoExtensions } from './extension';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import type { MotivoTailwind, NotaTailwind } from './avisos-tipos';

export interface ContextoTailwind {
    mapa: MapaTailwind;
    nombres: ReadonlySet<string>;
    screens: Record<string, string>;
}

export function prepararTailwind(config: TaishoConfig, extensiones: TaishoExtensions = {}): ContextoTailwind {
    const { nombres } = vocabularioClasico(config, extensiones);
    const v = deriveThemeVocabulary(config, extensiones);
    const mapa = construirMapa({
        vigentes: nombres,
        esc: escalasDe({ gridMins: Object.keys(v.userGridMins) }),
        familias: Object.keys(buildVocabularyColors(v.userColors, v.userStates)),
    });
    return { mapa, nombres, screens: { ...screensDelCore, ...v.userScales.screens } };
}

export interface TemaTailwind {
    spacing: boolean;
    radio: boolean;
    texto: boolean;
    pantallas: boolean;
    familias: string[];
}

export const TEMA_VACIO: TemaTailwind = { spacing: false, radio: false, texto: false, pantallas: false, familias: [] };

export function unirTemas(a: TemaTailwind, b: TemaTailwind): TemaTailwind {
    return {
        spacing: a.spacing || b.spacing,
        radio: a.radio || b.radio,
        texto: a.texto || b.texto,
        pantallas: a.pantallas || b.pantallas,
        familias: [...new Set([...a.familias, ...b.familias])],
    };
}

function bloquesTema(texto: string): Array<{ desde: number; contenido: string }> {
    const bloques: Array<{ desde: number; contenido: string }> = [];
    for (const m of texto.matchAll(/@theme\b[^{;]*\{/g)) {
        const desde = m.index! + m[0].length;
        let prof = 1;
        let k = desde;
        for (; k < texto.length && prof > 0; k++) {
            if (texto[k] === '{') prof++;
            else if (texto[k] === '}') prof--;
        }
        bloques.push({ desde: m.index!, contenido: texto.slice(desde, k - 1) });
    }
    return bloques;
}

export function leerTema(texto: string): TemaTailwind {
    let tema = TEMA_VACIO;
    for (const { contenido } of bloquesTema(texto)) {
        const nombres = [...contenido.matchAll(/(?<![\w-])--([A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]);
        tema = unirTemas(tema, {
            spacing: nombres.some((n) => n === 'spacing' || n.startsWith('spacing-')),
            radio: nombres.some((n) => n === 'radius' || n.startsWith('radius-')),
            texto: nombres.some((n) => n.startsWith('text-')),
            pantallas: nombres.some((n) => n.startsWith('breakpoint-')),
            familias: nombres.flatMap((n) => /^color-([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)-\d+$/.exec(n)?.[1] ?? []),
        });
    }
    return tema;
}

export type TipoSinConvertir = TipoNoConvertida | 'theme-value' | 'conflict' | 'untouched' | 'fragment' | 'classlist' | 'already-scoped';
export type TipoFuera = 'apply' | 'import' | 'theme' | 'source' | 'plugin' | 'config' | 'merge' | 'possible-class' | 'missing-ts';

export interface ConvertidaTexto {
    línea: number;
    origen: string;
    scope: string;
    exacta: boolean;
    notas?: NotaTailwind[];
}
export interface SinConvertirTexto {
    línea: number;
    token: string;
    tipo: TipoSinConvertir;
    motivo: MotivoTailwind;
}
export interface FueraTexto {
    línea: number;
    token: string;
    tipo: TipoFuera;
    motivo: MotivoTailwind;
    sugerencia?: string;
}
export interface AjenaTexto {
    línea: number;
    token: string;
}

export interface ResultadoMigrarTailwind {
    texto: string;
    llaves: number;
    convertidas: ConvertidaTexto[];
    sinConvertir: SinConvertirTexto[];
    ajenas: AjenaTexto[];
    fuera: FueraTexto[];
    totales: { tokens: number; convertidos: number; sinConvertir: number; ajenos: number };
}

export interface OpcionesMigrarTailwind extends ContextoTailwind {
    tema?: TemaTailwind;
    esCss?: boolean;
}

const RAICES = new Set(RAICES_TAILWIND);
const SUELTAS = new Set(PALABRAS_SUELTAS_TAILWIND);
const COLOR = /^(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|accent|caret|decoration|shadow|placeholder)-[a-z]+(?:-[a-z]+)*-\d{2,3}(?:\/\d+)?$/;
const ARBITRARIA = /^!?-?[a-z][a-z0-9-]*-?\[/;
const VARIANTE = /^(?:hover|focus|focus-visible|focus-within|active|disabled|enabled|checked|invalid|required|optional|visited|target|open|empty|first|last|only|odd|even|first-of-type|last-of-type|dark|print|rtl|ltr|portrait|landscape|before|after|placeholder|file|marker|selection|backdrop|motion-safe|motion-reduce|contrast-more|forced-colors|sm|md|lg|xl|\d+xl|(?:group|peer|aria|data|has|not|max|min|supports|in|nth)-.+|@.+|\[.+)$/;
const DUDOSO = /[-:]/;

type Eval =
    | { k: 'conv'; r: Convertida }
    | { k: 'no'; tipo: TipoSinConvertir; motivo: MotivoTailwind }
    | { k: 'ajena'; nombre?: boolean };

const LITERAL_TW = /(?<![\w:-])(?:class|className|class:list)\s*=\s*("[^"]*"|'[^']*')|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
const TOKEN_TW = /(?<!\S)()(\S+)/g;
const ABRE_FN = /(?<![\w$.])(?:clsx|cn|cx|classnames|classNames|twMerge|twJoin|cva|tv)\s*\(/g;
const ABRE_ATTR = /(?<![\w.-])(?:class:list|className|class)\s*=\s*\{/g;
const ABRE_VUE = /(?<![\w.-])(?:v-bind)?:class\s*=\s*(["'])/g;
const ABRE_ATTR_CON_COMILLAS = /(?<![\w:-])(?:class|className|class:list)\s*=\s*(["'])/g;
const DIRECTIVA = /(?<![\w.-])class:([^\s={}>/"'`]+)/g;
const TIENE_TS = /(?<![\w:.-])ts(?![\w:-])/;

function saltarString(t: string, i: number): number {
    const q = t[i];
    for (let k = i + 1; k < t.length; k++) {
        if (t[k] === '\\') k++;
        else if (t[k] === q) return k;
        else if (q !== '`' && t[k] === '\n') return i;
    }
    return i;
}

function cierre(t: string, desde: number, abre: string, cierra: string): number {
    let prof = 1;
    for (let i = desde; i < t.length; i++) {
        const c = t[i];
        if (c === '"' || c === "'" || c === '`') i = saltarString(t, i);
        else if (c === abre) prof++;
        else if (c === cierra && --prof === 0) return i;
    }
    return -1;
}

const rangosStyle = (texto: string): Array<[number, number]> => [...texto.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => [m.index!, m.index! + m[0].length]);

export function migrarTailwind(entrada: string, o: OpcionesMigrarTailwind): ResultadoMigrarTailwind {
    const { nombres, esCss = false } = o;
    const tema = o.tema ?? TEMA_VACIO;
    const mapa = conFamiliasDelTema(o.mapa, nombres, tema.familias);
    const filas = new Map(mapa.filas.map((f) => [f.tailwind, f]));
    const traducir = crearTraductorTailwind({ mapa, screens: o.screens, esComponente: (b) => nombres.has(`ts-${b}`) });
    const traducirSinNombres = crearTraductorTailwind({ mapa, screens: o.screens });
    const sinEquivalente = new Set(mapa.sinEquivalente.flatMap((g) => g.clases));
    const prefijosSin = [...sinEquivalente].filter((c) => /^[a-z-]+-\*$/.test(c)).map((c) => c.slice(0, -1));
    const pantallas = new Set([...Object.keys(o.screens), ...mapa.variantes.map((v) => v.tailwind.slice(0, -1))]);
    const choques = new Set([...SUELTAS].filter((w) => nombres.has(`ts-${w}`) && filas.get(w)?.scope !== w));

    const convertidas: ConvertidaTexto[] = [];
    const sinConvertir: SinConvertirTexto[] = [];
    const ajenas: AjenaTexto[] = [];
    const fuera: FueraTexto[] = [];
    const nuevoSinConvertir = (línea: number, token: string, tipo: TipoSinConvertir, motivo: MotivoTailwind) => sinConvertir.push({ línea, token, tipo, motivo });

    const saltos: number[] = [];
    for (let i = entrada.indexOf('\n'); i >= 0; i = entrada.indexOf('\n', i + 1)) saltos.push(i);
    const lineaDe = (pos: number) => {
        let a = 0;
        let b = saltos.length;
        while (a < b) {
            const m = (a + b) >> 1;
            if (saltos[m] < pos) a = m + 1;
            else b = m;
        }
        return a + 1;
    };

    function baseEsTailwind(b: string): boolean {
        if (filas.has(b) || sinEquivalente.has(b) || prefijosSin.some((p) => b.startsWith(p)) || COLOR.test(b) || ARBITRARIA.test(b) || SUELTAS.has(b)) return true;
        if (b === 'group' || b === 'peer' || b === '@container' || /^(?:group|peer)\/|^@container\//.test(b)) return true;
        if (b.startsWith('!') || b.endsWith('!')) return baseEsTailwind(b.replace(/^!|!$/g, ''));
        return b.includes('-') && RAICES.has(b.replace(/^-/, '').split('-')[0]);
    }
    const tieneVariantes = (partes: string[]) => partes.length > 1 && partes.slice(0, -1).every((v) => VARIANTE.test(v) || pantallas.has(v));
    const esTailwind = (tok: string) => {
        if (/["'`=\\<>]/.test(tok)) return false;
        const partes = partir(tok);
        return tieneVariantes(partes) ? partes.at(-1) !== '' : baseEsTailwind(partes.at(-1) as string);
    };

    function evaluar(tok: string, pegado: boolean): Eval {
        const partes = partir(tok);
        const b = partes.at(-1) as string;
        if (pegado) {
            const raiz = b.replace(/^[!-]/, '').split('-')[0];
            return esTailwind(tok) || RAICES.has(raiz) ? { k: 'no', tipo: 'fragment', motivo: { code: 'runtime-class', params: {} } } : { k: 'ajena' };
        }
        if (tema.pantallas && partes.slice(0, -1).some((v) => pantallas.has(v))) {
            return { k: 'no', tipo: 'theme-value', motivo: { code: 'theme-breakpoints', params: {} } };
        }
        const fila = filas.get(b);
        if (fila) {
            if (tema.spacing && fila.familia === 'medidas' && fila.px !== undefined) return { k: 'no', tipo: 'theme-value', motivo: { code: 'theme-spacing', params: { class: b, px: fila.px } } };
            if (tema.radio && fila.familia === 'radio') return { k: 'no', tipo: 'theme-value', motivo: { code: 'theme-radius', params: { class: b } } };
            if (tema.texto && fila.familia === 'tamaño de texto') return { k: 'no', tipo: 'theme-value', motivo: { code: 'theme-text', params: { class: b } } };
        }
        if (partes.length === 1 && choques.has(b)) {
            return { k: 'no', tipo: 'conflict', motivo: { code: 'component-conflict', params: { class: b } } };
        }
        const r = traducir(tok);
        if (!('tipo' in r)) return { k: 'conv', r };
        if (r.tipo === 'component' && partes.length === 1 && !baseEsTailwind(b)) return { k: 'ajena', nombre: true };
        if (r.tipo === 'component' && partes.length === 1) return porQue(traducirSinNombres(tok) as NoConvertida);
        if (r.tipo === 'base' && !tieneVariantes(partes) && !baseEsTailwind(b)) return { k: 'ajena' };
        return porQue(r);
    }
    const porQue = (r: NoConvertida): Eval => ({ k: 'no', tipo: r.tipo, motivo: r.motivo });

    const regiones: Array<[number, number]> = [];
    const vue = new Set<number>();
    if (!esCss) {
        for (const m of entrada.matchAll(ABRE_FN)) {
            const desde = m.index! + m[0].length;
            const fin = cierre(entrada, desde, '(', ')');
            if (fin > 0) regiones.push([desde, fin]);
        }
        for (const m of entrada.matchAll(ABRE_ATTR)) {
            const desde = m.index! + m[0].length;
            const fin = cierre(entrada, desde, '{', '}');
            if (fin > 0) regiones.push([desde, fin]);
        }
        for (const m of entrada.matchAll(ABRE_VUE)) {
            const comilla = m.index! + m[0].length - 1;
            vue.add(comilla);
            regiones.push([comilla + 1, entrada.indexOf(m[1], comilla + 1)]);
        }
        for (const m of entrada.matchAll(ABRE_ATTR_CON_COMILLAS)) {
            const comilla = m.index! + m[0].length - 1;
            const fin = entrada.indexOf(m[1], comilla + 1);
            if (fin > 0) regiones.push([comilla + 1, fin]);
        }
    }
    const enRegion = (abs: number) => regiones.some(([a, b]) => abs >= a && abs < b);

    const css: Array<[number, number]> = esCss ? [[0, entrada.length]] : rangosStyle(entrada);
    const protegido = (pos: number) => css.some(([a, b]) => pos >= a && pos < b);

    const dry = new WeakMap<ContextoLiteral, { evals: Eval[]; i: number }>();
    const NO: DecisionLiteral = { convertir: false, llave: false, heredaLlave: false };

    const itemsDe = (c: ContextoLiteral) =>
        c.estaticas.flatMap((t, k) =>
            [...t.matchAll(TOKEN_TW)].map((m) => ({ token: m[2], pegado: (k > 0 && m.index === 0) || (k < c.estaticas.length - 1 && m.index! + m[0].length === t.length) })),
        );

    const motivoClassList = (ev: Eval): MotivoTailwind => ({ code: 'classlist', params: ev.k === 'conv' ? { converted: ev.r.scope } : {} });

    const politica = (c: ContextoLiteral): DecisionLiteral => {
        const línea = lineaDe(c.abs);
        const items = itemsDe(c).filter((t) => t.token !== 'ts');
        if (c.classList) {
            for (const { token, pegado } of items) {
                const ev = evaluar(token, pegado);
                if (ev.k === 'ajena') ajenas.push({ línea, token });
                else nuevoSinConvertir(línea, token, 'classlist', motivoClassList(ev));
            }
            return NO;
        }
        if (!c.esAtributo && vue.has(c.abs)) return { convertir: true, llave: false, heredaLlave: false, dentro: true };

        if (!c.esAtributo && !enRegion(c.abs)) {
            if (c.tieneLlave) return NO;
            if (c.etiqueta && /[\w:@.-]+\s*=\s*$/.test(c.fuente.slice(Math.max(0, c.abs - 60), c.abs))) return NO;
            if (!(items.length >= 2 && items.every((t) => !t.pegado && esTailwind(t.token)))) {
                for (const { token, pegado } of items) {
                    if (!pegado && DUDOSO.test(token) && esTailwind(token)) fuera.push({ línea, token, tipo: 'possible-class', motivo: { code: 'possible-class', params: {} } });
                }
                return NO;
            }
        }

        if (c.tieneLlave) {
            for (const { token, pegado } of items) {
                const partes = partir(token);
                const ev = evaluar(token, pegado);
                if (nombres.has(`ts-${partes.at(-1)}`) && !pegado && ev.k !== 'no') ajenas.push({ línea, token });
                else if (ev.k === 'ajena') ajenas.push({ línea, token });
                else if (ev.k === 'no') nuevoSinConvertir(línea, token, ev.tipo, ev.motivo);
                else nuevoSinConvertir(línea, token, 'already-scoped', { code: 'already-scoped', params: { class: token, converted: ev.r.scope } });
            }
            return NO;
        }

        const evals = items.map(({ token, pegado }) => evaluar(token, pegado));
        const hayConv = evals.some((e) => e.k === 'conv');
        const lleva = hayConv || c.llaveDelContenedor;
        const finales = evals.map((e, n): Eval => (e.k === 'ajena' && e.nombre && lleva ? { k: 'no', tipo: 'conflict', motivo: { code: 'name-conflict', params: { class: items[n].token } } } : e));
        const chocantes = items.filter((_, n) => finales[n].k === 'no' && (finales[n] as { tipo?: string }).tipo === 'conflict').map((t) => t.token);
        if (chocantes.length) {
            items.forEach((t, n) => {
                const ev = finales[n];
                if (ev.k === 'ajena') ajenas.push({ línea, token: t.token });
                else if (ev.k === 'no') nuevoSinConvertir(línea, t.token, ev.tipo, ev.motivo);
                else nuevoSinConvertir(línea, t.token, 'untouched', { code: 'untouched', params: { class: t.token, converted: ev.r.scope, conflicts: chocantes } });
            });
            return NO;
        }
        dry.set(c, { evals: finales, i: 0 });
        return { convertir: true, llave: hayConv && !c.llaveDelContenedor, heredaLlave: lleva };
    };

    const recorrido = esCss
        ? { texto: entrada, llaves: 0 }
        : recorrerLiterales(entrada, {
              literal: LITERAL_TW,
              tokenizador: TOKEN_TW,
              reconoce: () => true,
              protegido,
              lineaDe,
              politica,
              token: ({ token, línea, literal }) => {
                  const st = dry.get(literal) as { evals: Eval[]; i: number };
                  const ev = st.evals[st.i++];
                  if (ev.k === 'conv') {
                      convertidas.push({ línea, origen: token, scope: ev.r.scope, exacta: ev.r.exacta, ...(ev.r.notas ? { notas: ev.r.notas } : {}) });
                      return ev.r.scope;
                  }
                  if (ev.k === 'no') nuevoSinConvertir(línea, token, ev.tipo, ev.motivo);
                  else ajenas.push({ línea, token });
                  return null;
              },
          });
    let texto = recorrido.texto;
    const llaves = recorrido.llaves;

    if (!esCss) {
        const antes = [...entrada.matchAll(DIRECTIVA)].filter((m) => m[1] !== 'list').map((m) => ({
            i: m.index!,
            nombre: m[1],
            tenia: protegido(m.index!) || TIENE_TS.test(sinDirectivas(entrada, m.index!)),
        }));
        let n = 0;
        texto = texto.replace(DIRECTIVA, (m: string, nombre: string, i: number) => {
            if (nombre === 'list') return m;
            const previo = antes[n++];
            const línea = lineaDe(previo.i);
            if (previo.tenia) {
                ajenas.push({ línea, token: `class:${nombre}` });
                return m;
            }
            const ev = evaluar(nombre, false);
            if (ev.k === 'ajena') ajenas.push({ línea, token: `class:${nombre}` });
            else if (ev.k === 'no') nuevoSinConvertir(línea, `class:${nombre}`, ev.tipo, ev.motivo);
            else {
                convertidas.push({ línea, origen: `class:${nombre}`, scope: `class:${ev.r.scope}`, exacta: ev.r.exacta, ...(ev.r.notas ? { notas: ev.r.notas } : {}) });
                const etiqueta = etiquetaEn(texto, i);
                if (etiqueta && !TIENE_TS.test(sinDirectivas(texto, i))) fuera.push({ línea, token: `class:${ev.r.scope}`, tipo: 'missing-ts', motivo: { code: 'directive-without-ts', params: { component: esComponente(etiqueta.nombre) } } });
                return `class:${ev.r.scope}`;
            }
            return m;
        });
    }

    for (const [a, b] of css) reportarCss(entrada.slice(a, b), a);
    for (const m of entrada.matchAll(/(?:from\s*|require\(\s*|import\(\s*)(["'])tailwind-merge\1/g)) {
        fuera.push({ línea: lineaDe(m.index!), token: 'tailwind-merge', tipo: 'merge', motivo: { code: 'tailwind-merge', params: {} } });
    }

    function sinDirectivas(t: string, i: number): string {
        const e = etiquetaEn(t, i);
        return e ? t.slice(e.desde, e.hasta).replace(/class:[^\s=>/]+/g, '') : '';
    }

    function reportarCss(trozo: string, base: number) {
        const linea = (i: number) => lineaDe(base + i);
        for (const m of trozo.matchAll(/@apply\s+([^;}]+)/g)) {
            const clases = m[1].replace(/!important/g, '').split(/\s+/).filter(Boolean);
            const evals = clases.map((c) => ({ c, ev: evaluar(c, false) }));
            const traduccion = evals.map(({ c, ev }) => (ev.k === 'conv' ? ev.r.scope : c)).join(' ');
            const sin = evals.filter(({ ev }) => ev.k !== 'conv').map(({ c, ev }) => ({ class: c, reason: ev.k === 'no' ? ev.motivo : null }));
            const selector = selectorDe(trozo, m.index!);
            const nombre = /^\.([A-Za-z_][\w-]*)$/.exec(selector)?.[1];
            const sirve = sin.length === 0 && !!nombre && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(nombre) && !nombres.has(`ts-${nombre}`) && evals.every(({ ev }) => ev.k === 'conv' && !ev.r.scope.includes(':'));
            fuera.push({
                línea: linea(m.index!),
                token: `@apply ${clases.join(' ')}`,
                tipo: 'apply',
                motivo: { code: 'apply', params: { translation: traduccion, untranslated: sin } },
                ...(sirve ? { sugerencia: `utilities: { '${nombre}': [${evals.map(({ ev }) => `'${(ev as { r: Convertida }).r.scope}'`).join(', ')}] }` } : {}),
            });
        }
        for (const m of trozo.matchAll(/@import\s+(?:url\(\s*)?["']tailwindcss[^"']*["'][^;]*;?|@tailwind\s+\w+\s*;?/g)) {
            fuera.push({ línea: linea(m.index!), token: m[0].trim(), tipo: 'import', motivo: { code: 'tailwind-import', params: {} } });
        }
        for (const t of bloquesTema(trozo)) {
            const q = leerTema(`@theme {${t.contenido}}`);
            const params = { families: q.familias, breakpoints: q.pantallas, radius: q.radio, spacing: q.spacing, text: q.texto };
            fuera.push({ línea: linea(t.desde), token: '@theme', tipo: 'theme', motivo: { code: 'theme-block', params } });
        }
        for (const [re, tipo] of [[/@source\b[^;]*;?/g, 'source'], [/@plugin\b[^;]*;?/g, 'plugin'], [/@config\b[^;]*;?/g, 'config']] as const) {
            for (const m of trozo.matchAll(re)) fuera.push({ línea: linea(m.index!), token: m[0].trim(), tipo, motivo: { code: 'tailwind-directive', params: { directive: tipo } } });
        }
    }

    sinConvertir.sort((a, b) => a.línea - b.línea);
    fuera.sort((a, b) => a.línea - b.línea);
    return {
        texto,
        llaves,
        convertidas,
        sinConvertir,
        ajenas,
        fuera,
        totales: { tokens: convertidas.length + sinConvertir.length + ajenas.length, convertidos: convertidas.length, sinConvertir: sinConvertir.length, ajenos: ajenas.length },
    };
}

function selectorDe(css: string, pos: number): string {
    let prof = 0;
    let i = pos - 1;
    for (; i >= 0; i--) {
        if (css[i] === '}') prof++;
        else if (css[i] === '{') {
            if (prof === 0) break;
            prof--;
        }
    }
    if (i < 0) return '';
    const antes = css.slice(0, i);
    return antes.slice(Math.max(antes.lastIndexOf('}'), antes.lastIndexOf(';'), antes.lastIndexOf('{')) + 1).trim();
}

function conFamiliasDelTema(mapa: MapaTailwind, nombres: ReadonlySet<string>, familias: string[]): MapaTailwind {
    if (!familias.length) return mapa;
    const c = mapa.colores;
    const yaVan = (f: string) => c.escalonesCompartidos.every((e) => nombres.has(`ts-bg-${f}-${e}`));
    const nuevas = familias.filter((f) => !c.familiasCompartidas.includes(f) && c.familiasSoloTaisho.includes(f) && yaVan(f));
    const pedir = familias.filter((f) => !c.familiasCompartidas.includes(f) && !c.familiasSoloTaisho.includes(f) && !c.familiasSoloTailwind.includes(f));
    return { ...mapa, colores: { ...c, familiasCompartidas: [...c.familiasCompartidas, ...nuevas], familiasSoloTailwind: [...c.familiasSoloTailwind, ...pedir] } };
}
