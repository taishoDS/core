// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { buildVocabularyColors, defaultScales } from '../config/scales';
import type { ThemeEntry } from '../config/taisho.types';
import { buildAtomicCSS } from './emit-atomic';
import { buildComponentsCSS } from './emit-components';
import { buildUtilitiesCSS } from './emit-utilities';
import { parseUtilities } from './emit-flat';
import { buildTokensCSS, resolveThemeTokens } from './emit-tokens';
import { aliasDe, renombrar } from './naming-renames';
import { CLASES_DE_TEMA, COMPONENTES, modificadoresSueltos } from './naming-table';
import { intentarClave, NOMBRE_ESCALA, validarValor, vecino } from './resolve-extend';
import { manifiestoDelCore, porPaquete } from './registro';
import type { ConfigErrorData, ConfigKeyError } from './errores-config';
import { colorLiteral, variablesLeidas } from './extension-css';
import { erroresDeLectura, erroresDeValor, LIMITES, parsearExtension, type GrupoParseado, type Nodo } from './extension-parser';
import { DEFAULT_GRID_MINS, DEFAULT_STATES, type TaishoConfig, type ThemeVocabulary } from './vocabulary';

/** Un componente que aporta una extensión. */
export interface ExtensionComponent {
    /**
     * Raíces que posee: `ts-<raíz>` o `ts-<raíz>-…`. Explícitas, por prefijo más largo. Cada bloque `@utility` de `css` es de una
     * de ellas; las raíces no se repiten entre componentes ni chocan con las del Core.
     */
    roots: string[];
    /** Bloques `@utility ts-…` en el dialecto del motor. Sólo `@utility` en el nivel superior; adentro, `@apply` a utilidades del Core o a bloques de este mismo componente. */
    css: string;
    /** Tokens propios -> `--ts-<roots[0]>-<clave>`. Aquí sí se permiten valores literales. El tema los cambia con `themes.<t>.components['<slug>']`. */
    tokens?: Record<string, string>;
}

/** Lo que un paquete le declara al Core. La identidad (el nombre del paquete) la pone quien lo descubre, no el dato. */
export interface TaishoExtension {
    /** slug en kebab-case (el de /docs) -> componente. Entra ENTERO si el código usa cualquiera de sus bloques. */
    components?: Record<string, ExtensionComponent>;
    /**
     * Raíces de utilidades sueltas, no atadas a ningún componente (`ts-<raíz>` o `ts-<raíz>-…`). Pasan por las mismas reglas que las de
     * los componentes (nombre válido, sin repetir, sin chocar con el Core, libres de prefijo contra las de otros paquetes y contra las
     * de los componentes de este) pero no llevan tokens.
     */
    roots?: string[];
    /** Utilidades nuevas `@utility ts-…`: entran por clase usada y aceptan variantes (`md:`, `hover:`) como las del Core. Cada una vive bajo una raíz de `roots` o de algún componente de este paquete. */
    utilities?: string;
}

/** Las extensiones que compila el Core, por nombre de paquete. Se aplican en orden alfabético de paquete, después del Core. */
export type TaishoExtensions = Readonly<Record<string, TaishoExtension>>;

/** Declara una extensión con sus tipos (no hace nada más: devuelve lo que recibe). */
export function defineExtension<T extends TaishoExtension>(e: T): T {
    return e;
}

/** Lo que `validateExtension` necesita saber de la config para armar los nombres que emite el Core. */
export type ThemeToValidate = Pick<ThemeVocabulary, 'userColors' | 'userStates' | 'userGridMins'>;

const temaDeFabrica = (): ThemeToValidate => ({ userColors: { brand: '#4F46E5' }, userStates: DEFAULT_STATES, userGridMins: DEFAULT_GRID_MINS });

const NOMBRE_RAIZ = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CLAVES_PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype', 'tostring']);
const prohibida = (clave: string) => CLAVES_PROHIBIDAS.has(clave.toLowerCase());

interface ContextoCore {
    emitidos: Set<string>;
    aplicables: Set<string>;
    slugs: Set<string>;
    variables: Set<string>;
    reservadas: Set<string>;
}

function contextoCore(tema: ThemeToValidate): ContextoCore {
    const colores = buildVocabularyColors(tema.userColors, tema.userStates);
    const nombres = (css: string) => parseUtilities(css).map((b) => b.name.replaceAll('\\', ''));
    const atomicas = [...nombres(buildAtomicCSS(colores, tema.userGridMins, defaultScales)), ...nombres(buildUtilitiesCSS())];
    const deComponentes = nombres(buildComponentsCSS(tema.userColors, tema.userStates, defaultScales));
    const aplicables = new Set([...atomicas, ...aliasDe(atomicas).values()]);
    const emitidos = new Set([...aplicables, ...deComponentes, ...aliasDe(deComponentes).values()]);
    const entrada: ThemeEntry = { name: 'x', group: 'root', def: { colors: { ...temaDeFabrica().userColors, ...tema.userColors } } } as ThemeEntry;
    const css = buildTokensCSS(resolveThemeTokens(entrada, {}, tema.userStates));
    const variables = new Set([...css.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]));
    const primero = (s: string) => s.split('-')[0];
    const reservadas = new Set<string>([
        ...[...emitidos].map((n) => primero(n.slice(3))),
        ...COMPONENTES,
        ...CLASES_DE_TEMA,
        ...[...variables].map((v) => primero(v.startsWith('--ts-') ? v.slice(5) : v.slice(2))),
    ]);
    return { emitidos, aplicables, slugs: new Set(Object.keys(manifiestoDelCore.componentes)), variables, reservadas };
}

type Clase = 'root' | 'slug' | 'block' | 'utility' | 'variable';

type Nombres = Record<Clase, string[]>;

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

const raizDelCore = (raiz: string, core: ContextoCore) =>
    (COMPONENTES as readonly string[]).includes(raiz) ||
    core.reservadas.has(raiz) ||
    [...core.slugs].some((s) => s === raiz || s.replaceAll('-', '') === raiz) ||
    [...core.emitidos].some((n) => n === `ts-${raiz}` || n.startsWith(`ts-${raiz}-`));

function aplicados(nodos: readonly Nodo[]): string[] {
    return nodos.flatMap((n) => (n.t === 'apply' ? n.destinos : n.t === 'decl' ? [] : aplicados(n.hijos)));
}

function declaraciones(nodos: readonly Nodo[]): Array<{ prop: string; valor: string }> {
    return nodos.flatMap((n) => (n.t === 'decl' ? [{ prop: n.prop, valor: n.valor }] : n.t === 'apply' ? [] : declaraciones(n.hijos)));
}

const SATURA = 2 ** 30;

type Ajenos = ReadonlySet<string>;

function validarUna(e: TaishoExtension, paquete: string, core: ContextoCore, grupos: readonly GrupoParseado[], ajenos: Ajenos = new Set()): { errores: ConfigKeyError[]; nombres: Nombres; raices: string[] } {
    const errores: ConfigKeyError[] = [];
    const nombres: Nombres = { root: [], slug: [], block: [], utility: [], variable: [] };
    const agregar = (path: string, datos: ConfigErrorData) => { errores.push({ path, ...datos } as ConfigKeyError); };
    const forma = (path: string, expected: string) => agregar(path, { code: 'ext-shape', params: { expected } });
    const base = `extensions[${JSON.stringify(paquete)}]`;
    if (!esObjeto(e)) { forma(base, 'object'); return { errores, nombres, raices: [] }; }
    if (e.components !== undefined && !esObjeto(e.components)) forma(`${base}.components`, 'object');
    if (e.utilities !== undefined && typeof e.utilities !== 'string') forma(`${base}.utilities`, 'string');
    const sueltas = Array.isArray(e.roots) && e.roots.every((r) => typeof r === 'string') ? e.roots : undefined;
    if (e.roots !== undefined && sueltas === undefined) forma(`${base}.roots`, 'string[]');
    let componentes = esObjeto(e.components) ? Object.entries(e.components) : [];
    if (componentes.length > LIMITES.componentes) {
        agregar(`${base}.components`, { code: 'ext-limit', params: { what: 'components', max: LIMITES.componentes } });
        componentes = [];
    }

    const duenoDeRaiz = new Map<string, string>();
    const raices = new Map<string, string[]>();
    for (const [slug, c] of componentes) {
        const ruta = `${base}.components.${slug}`;
        if (!NOMBRE_RAIZ.test(slug) || prohibida(slug)) agregar(ruta, { code: 'ext-name-invalid', params: { kind: 'slug', name: slug } });
        else if (core.slugs.has(slug)) agregar(ruta, { code: 'ext-conflicts-core', params: { kind: 'slug', name: slug } });
        else nombres.slug.push(slug);
        if (!esObjeto(c)) { forma(ruta, 'object'); continue; }
        if (!Array.isArray(c.roots) || c.roots.some((r) => typeof r !== 'string')) { forma(`${ruta}.roots`, 'string[]'); continue; }
        if (c.roots.length === 0) agregar(`${ruta}.roots`, { code: 'ext-roots-empty', params: {} });
        if (c.roots.length > LIMITES.raices) { agregar(`${ruta}.roots`, { code: 'ext-limit', params: { what: 'roots', max: LIMITES.raices } }); continue; }
        const propias: string[] = [];
        for (const raiz of c.roots) {
            if (!NOMBRE_RAIZ.test(raiz) || prohibida(raiz)) { agregar(`${ruta}.roots`, { code: 'ext-name-invalid', params: { kind: 'root', name: raiz } }); continue; }
            const otro = duenoDeRaiz.get(raiz);
            if (otro !== undefined) { agregar(`${ruta}.roots`, { code: 'ext-root-repeated', params: { root: raiz, other: otro } }); continue; }
            duenoDeRaiz.set(raiz, slug);
            propias.push(raiz);
            nombres.root.push(raiz);
            if (raizDelCore(raiz, core)) agregar(`${ruta}.roots`, { code: 'ext-conflicts-core', params: { kind: 'root', name: raiz } });
        }
        raices.set(slug, propias);
    }
    if (sueltas !== undefined) {
        if (sueltas.length > LIMITES.raices) agregar(`${base}.roots`, { code: 'ext-limit', params: { what: 'roots', max: LIMITES.raices } });
        else {
            const deComponentes = [...duenoDeRaiz.keys()];
            const enPrefijo = (a: string, b: string) => a === b || a.startsWith(`${b}-`) || b.startsWith(`${a}-`);
            for (const raiz of sueltas) {
                if (!NOMBRE_RAIZ.test(raiz) || prohibida(raiz)) { agregar(`${base}.roots`, { code: 'ext-name-invalid', params: { kind: 'root', name: raiz } }); continue; }
                const otro = duenoDeRaiz.get(raiz);
                if (otro !== undefined) { agregar(`${base}.roots`, { code: 'ext-root-repeated', params: { root: raiz, other: otro } }); continue; }
                duenoDeRaiz.set(raiz, '');
                nombres.root.push(raiz);
                if (raizDelCore(raiz, core)) agregar(`${base}.roots`, { code: 'ext-conflicts-core', params: { kind: 'root', name: raiz } });
                for (const otra of deComponentes) if (enPrefijo(raiz, otra)) agregar(`${base}.roots`, { code: 'ext-roots-overlap', params: { root: raiz, other: otra, package: paquete, otherPackage: paquete } });
            }
        }
    }
    const todasLasRaices = [...duenoDeRaiz.keys()];
    const dueno = (bloque: string) => {
        let mejor: string | undefined;
        for (const r of todasLasRaices) {
            if ((bloque === `ts-${r}` || bloque.startsWith(`ts-${r}-`)) && (mejor === undefined || r.length > mejor.length)) mejor = r;
        }
        return mejor === undefined ? undefined : duenoDeRaiz.get(mejor);
    };

    const variablesVistas = new Set<string>();
    for (const [slug, c] of componentes) {
        if (!esObjeto(c) || c.tokens === undefined) continue;
        const ruta = `${base}.components.${slug}.tokens`;
        if (!esObjeto(c.tokens)) { forma(ruta, 'object'); continue; }
        const entradas = Object.entries(c.tokens);
        if (entradas.length > LIMITES.tokens) { agregar(ruta, { code: 'ext-limit', params: { what: 'tokens', max: LIMITES.tokens } }); continue; }
        const raiz = raices.get(slug)?.[0];
        for (const [clave, valor] of entradas) {
            const rutaClave = `${ruta}.${clave}`;
            if (clave.length > LIMITES.clave) { agregar(rutaClave.slice(0, 120), { code: 'ext-limit', params: { what: 'key-length', max: LIMITES.clave } }); continue; }
            if (!NOMBRE_ESCALA.test(clave) || prohibida(clave)) { agregar(rutaClave, { code: 'ext-name-invalid', params: { kind: 'token', name: clave } }); continue; }
            const variable = raiz === undefined ? undefined : `--ts-${raiz}-${clave}`;
            if (typeof valor === 'string' && valor.length > LIMITES.valor) agregar(rutaClave, { code: 'ext-limit', params: { what: 'value-length', max: LIMITES.valor } });
            else {
                let seguro = true;
                intentarClave(errores, () => validarValor(rutaClave, valor), () => { seguro = false; });
                if (seguro && typeof valor === 'string') for (const d of erroresDeValor(valor, variable ?? clave)) agregar(rutaClave, d);
            }
            if (variable === undefined) continue;
            nombres.variable.push(variable);
            if (core.variables.has(variable)) agregar(rutaClave, { code: 'ext-conflicts-core', params: { kind: 'variable', name: variable } });
            if (variablesVistas.has(variable)) agregar(rutaClave, { code: 'ext-variable-repeated', params: { variable } });
            variablesVistas.add(variable);
        }
    }

    errores.push(...erroresDeLectura(grupos));
    const total = grupos.reduce((n, g) => n + g.parse.bloques.length, 0);
    if (total > LIMITES.bloques) agregar(base, { code: 'ext-limit', params: { what: 'blocks', max: LIMITES.bloques } });
    const bloquesVistos = new Set<string>();
    const grupoDe = new Map<string, string>();
    const arbol = new Map<string, Nodo[]>();
    for (const g of grupos) for (const b of g.parse.bloques) if (!grupoDe.has(b.name)) { grupoDe.set(b.name, g.slug ?? ''); arbol.set(b.name, b.nodos); }
    const aplicadosPor = new Map<string, string[]>();
    for (const g of grupos) {
        const slug = g.slug;
        const propias = slug === undefined ? undefined : raices.get(slug) ?? [];
        for (const { name, nodos } of g.parse.bloques) {
            if (bloquesVistos.has(name)) agregar(g.ruta, { code: 'ext-block-repeated', params: { block: name } });
            bloquesVistos.add(name);
            if (core.emitidos.has(name) || renombrar(name)) agregar(g.ruta, { code: 'ext-conflicts-core', params: { kind: slug === undefined ? 'utility' : 'block', name } });
            nombres[slug === undefined ? 'utility' : 'block'].push(name);
            if (slug !== undefined) {
                if (dueno(name) !== slug) agregar(g.ruta, { code: 'ext-block-not-owned', params: { block: name, roots: propias ?? [] } });
            } else if (dueno(name) === undefined) agregar(g.ruta, { code: 'ext-utility-no-root', params: { block: name } });
            for (const { prop, valor } of declaraciones(nodos)) {
                const texto = `${prop}: ${valor.replace(/"[^"]*"|'[^']*'/g, (m) => m[0] + m[0])}`;
                const color = colorLiteral(texto);
                if (color) agregar(g.ruta, { code: 'ext-color-literal', params: { block: name, value: color.value, kind: color.kind } });
                for (const variable of new Set(variablesLeidas(texto))) {
                    if (core.variables.has(variable) || todasLasRaices.some((r) => variable === `--ts-${r}` || variable.startsWith(`--ts-${r}-`))) continue;
                    const suggestion = vecino(variable, core.variables);
                    agregar(g.ruta, { code: 'ext-var-not-public', params: { block: name, variable, ...(suggestion && { suggestion }) } });
                }
            }
            aplicadosPor.set(name, aplicados(nodos));
        }
        const sueltas = modificadoresSueltos(g.parse.bloques.map((b) => b.css).join(''), [...COMPONENTES, ...todasLasRaices]);
        for (const m of sueltas) agregar(g.ruta, { code: 'ext-modifier-loose', params: { block: m.utility, selector: m.selector, motive: m.motivo } });
    }
    for (const [slug, c] of componentes) if (esObjeto(c) && c.css !== undefined && typeof c.css !== 'string') forma(`${base}.components.${slug}.css`, 'string');

    const rutaDe = new Map<string, string>();
    for (const g of grupos) for (const b of g.parse.bloques) if (!rutaDe.has(b.name)) rutaDe.set(b.name, g.ruta);
    const aristas = new Map<string, string[]>();
    for (const [bloque, destinos] of aplicadosPor) {
        const ruta = rutaDe.get(bloque)!;
        const propio = grupoDe.get(bloque);
        for (const destino of new Set(destinos)) {
            if (core.aplicables.has(destino)) continue;
            const g = grupoDe.get(destino);
            if (g !== undefined && g === propio) { aristas.set(bloque, [...(aristas.get(bloque) ?? []), destino]); continue; }
            const reason = g !== undefined || ajenos.has(destino) ? 'other-component' : core.emitidos.has(destino) ? 'core-component' : 'unknown';
            const suggestion = reason === 'unknown' ? vecino(destino, core.aplicables) : undefined;
            agregar(ruta, { code: 'ext-apply-target', params: { block: bloque, target: destino, reason, ...(suggestion && { suggestion }) } });
        }
    }
    const estado = new Map<string, 1 | 2>();
    let hayCiclo = false;
    const visitar = (u: string) => {
        estado.set(u, 1);
        for (const v of aristas.get(u) ?? []) {
            if (estado.get(v) === 1) {
                hayCiclo = true;
                agregar(rutaDe.get(u)!, { code: 'ext-apply-target', params: { block: u, target: v, reason: 'cycle' } });
            } else if (!estado.has(v)) visitar(v);
        }
        estado.set(u, 2);
    };
    for (const b of aristas.keys()) if (!estado.has(b)) visitar(b);
    if (!hayCiclo) {
        const hondo = new Map<string, number>();
        const tamano = new Map<string, number>();
        const propio = new Map<string, number>();
        for (const g of grupos) for (const b of g.parse.bloques) if (!propio.has(b.name)) propio.set(b.name, b.css.length);
        const medir = (b: string): { d: number; t: number } => {
            const d0 = hondo.get(b);
            if (d0 !== undefined) return { d: d0, t: tamano.get(b)! };
            let d = 0;
            let t = propio.get(b) ?? 0;
            for (const x of new Set(aristas.get(b) ?? [])) {
                const r = medir(x);
                d = Math.max(d, r.d + 1);
                t = Math.min(SATURA, t + r.t * aplicadosPor.get(b)!.filter((y) => y === x).length);
            }
            hondo.set(b, d);
            tamano.set(b, t);
            return { d, t };
        };
        let suma = 0;
        for (const b of aplicadosPor.keys()) {
            const { d, t } = medir(b);
            suma = Math.min(SATURA, suma + t);
            if (d > LIMITES.profundidadApply) agregar(rutaDe.get(b)!, { code: 'ext-apply-budget', params: { block: b, limit: 'depth', max: LIMITES.profundidadApply } });
            else if (t > LIMITES.expansionBloque) agregar(rutaDe.get(b)!, { code: 'ext-apply-budget', params: { block: b, limit: 'block-size', max: LIMITES.expansionBloque } });
        }
        if (suma > LIMITES.expansionTotal) agregar(base, { code: 'ext-apply-budget', params: { block: paquete, limit: 'total-size', max: LIMITES.expansionTotal } });
    }

    return { errores, nombres, raices: todasLasRaices };
}

/**
 * Valida UNA extensión contra el Core. Devuelve todos los errores juntos (códigos y params, sin texto: `configErrorLine` los redacta en es/en);
 * vacío = válida. `packageName` es el nombre del paquete que la declara (sale de su `package.json`). Sin `theme`, el Core se arma con la marca
 * y los estados de fábrica; el consumidor pasa los suyos para que los choques con sus colores también se vean. Los choques con OTRA
 * extensión y los de `themes.<t>.components` los ve la compilación (`deriveThemeVocabulary`), que conoce a todas.
 */
export function validateExtension(e: TaishoExtension, packageName: string, theme: ThemeToValidate = temaDeFabrica()): ConfigKeyError[] {
    return validarUna(e, packageName, contextoCore(theme), parsearExtension(e, packageName)).errores;
}

export function validarExtensiones(extensiones: TaishoExtensions, config: TaishoConfig, tema: ThemeToValidate): ConfigKeyError[] {
    const lista = porPaquete(extensiones);
    const hayComponentes = Object.values(config.themes).some((t) => t.components !== undefined);
    if (lista.length === 0 && !hayComponentes) return [];
    const errores: ConfigKeyError[] = [];
    const core = lista.length ? contextoCore(tema) : undefined;
    const leidas = lista.map(([paquete, e]) => parsearExtension(e, paquete));
    const nombresDe = leidas.map((gs) => new Set(gs.flatMap((g) => g.parse.bloques.map((b) => b.name))));
    const duenos = new Map<string, string>();
    const raicesPrevias = new Map<string, string>();
    const prefijosPrevios = new Map<string, { raiz: string; paquete: string }>();
    lista.forEach(([paquete, e], i) => {
        const ajenos = new Set(nombresDe.filter((_, j) => j !== i).flatMap((s) => [...s]));
        const r = validarUna(e, paquete, core!, leidas[i], ajenos);
        errores.push(...r.errores);
        for (const clase of Object.keys(r.nombres) as Clase[]) {
            for (const name of r.nombres[clase]) {
                const clave = `${clase === 'utility' ? 'block' : clase}:${name}`;
                const otro = duenos.get(clave);
                if (otro !== undefined && otro !== paquete) errores.push({ path: `extensions[${JSON.stringify(paquete)}]`, code: 'ext-conflicts-extension', params: { kind: clase, name, package: paquete, other: otro } });
                else duenos.set(clave, paquete);
            }
        }
        const ruta = `extensions[${JSON.stringify(paquete)}]`;
        for (const raiz of r.raices) {
            const segmentos = raiz.split('-');
            for (let k = 1; k < segmentos.length; k++) {
                const p = segmentos.slice(0, k).join('-');
                const otro = raicesPrevias.get(p);
                if (otro !== undefined && otro !== paquete) errores.push({ path: ruta, code: 'ext-roots-overlap', params: { root: raiz, other: p, package: paquete, otherPackage: otro } });
            }
            const largo = prefijosPrevios.get(raiz);
            if (largo !== undefined && largo.paquete !== paquete) errores.push({ path: ruta, code: 'ext-roots-overlap', params: { root: raiz, other: largo.raiz, package: paquete, otherPackage: largo.paquete } });
        }
        for (const raiz of r.raices) {
            if (!raicesPrevias.has(raiz)) raicesPrevias.set(raiz, paquete);
            const segmentos = raiz.split('-');
            for (let k = 1; k < segmentos.length; k++) {
                const p = segmentos.slice(0, k).join('-');
                if (!prefijosPrevios.has(p)) prefijosPrevios.set(p, { raiz, paquete });
            }
        }
    });
    const declarados = new Map<string, Set<string>>();
    for (const [, e] of lista) for (const [slug, c] of Object.entries(e.components ?? {})) declarados.set(slug, new Set(Object.keys(esObjeto(c?.tokens) ? c.tokens : {})));
    for (const [tema, def] of Object.entries(config.themes)) {
        for (const [slug, valores] of Object.entries(def.components ?? {})) {
            const ruta = `themes.${tema}.components.${slug}`;
            const claves = declarados.get(slug);
            if (!claves) {
                const suggestion = vecino(slug, declarados.keys());
                errores.push({ path: ruta, code: 'theme-component-unknown', params: { slug, ...(suggestion && { suggestion }) } });
                continue;
            }
            for (const [clave, valor] of Object.entries(valores)) {
                if (!claves.has(clave)) {
                    const suggestion = vecino(clave, claves);
                    errores.push({ path: `${ruta}.${clave}`, code: 'theme-component-token-unknown', params: { slug, key: clave, ...(suggestion && { suggestion }) } });
                } else intentarClave(errores, () => validarValor(`${ruta}.${clave}`, valor));
            }
        }
    }
    return errores;
}
