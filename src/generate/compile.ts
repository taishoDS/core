// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { buildVocabularyColors, defaultScales } from '../config/scales';
import { buildAtomicCSS } from './emit-atomic';
import { buildComponentsCSS } from './emit-components';
import { buildUtilitiesCSS } from './emit-utilities';
import { buildResetCSS } from './emit-reset';
import { buildFlatCSS, pares, parseUtilities, tablaPrefijos, tokenizar } from './emit-flat';
import { aliasDe, renombrar } from './naming-renames';
import { modificadoresDeComponentes } from './naming-table';
import { validarCadena } from './variantes';
import { deriveThemeVocabulary, type TaishoConfig, type ThemeVocabulary } from './vocabulary';
import { clasificarComponentes, vecino } from './resolve-extend';
import { componerUso, datosComposicion, esModificadorPropio, modificadoresPorPropia, propiasConCadenas } from './propias';
import { resolveSafelist } from './resolve-safelist';
import type { EngineWarning } from './avisos-tipos';
import { cssDeExtensiones, manifiestoDe } from './registro';
import { varsInContent } from './podar-tema';
import type { TaishoExtensions } from './extension';

export const DEFAULT_COPYRIGHT = 'Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).';

export interface ContentFile {
    /** Ruta relativa a la raíz del proyecto, separador POSIX ('/'). Se usa para ordenar y en los mensajes de error. */
    file: string;
    content: string;
    /** Hash del contenido, calculado por el borde. Sin hash, ese archivo no usa la caché. */
    hash?: string;
}

/** Memo opaco de compile: el borde sólo lo crea (`new Map()`), lo guarda entre llamadas o lo tira. */
export type CompileCache = Map<string, readonly string[]>;

export interface CompileOptions {
    /** Default: el mismo texto MIT que usa orchestrate. */
    copyright?: string;
    cache?: CompileCache;
    /**
     * Default `false`: el CSS completo (`taisho.full.css`). `true`: sólo lo que `files` usa, más la base fija (`@layer`,
     * reset, lo suelto). Ni las familias responsive curadas ni el safelist interno entran.
     */
    onDemand?: boolean;
    /** Extensiones por nombre de paquete: sus componentes y utilidades se compilan como los del Core, después de ellos. Se validan con `validateExtension`. */
    extensions?: TaishoExtensions;
}

export interface CompileResult {
    /** taisho.full.css completo, header incluido. */
    css: string;
    /** Variantes halladas en `files`, en bruto (incluye fragmentos como `md:ts-grid-cols`), en orden canónico. */
    variants: string[];
    /** Avisos que no frenan la compilación (`{ code, params }`, sin texto): clases armadas en runtime, prefijos desconocidos… Orden de aparición, sin repetidos. */
    warnings: EngineWarning[];
}

/** Clases que el JS del Core escribe en el DOM de un componente y que el HTML del proyecto no trae. */
export const CLASES_DEL_JS: Record<string, readonly string[]> = { toast: ['icon', 'icon-14'] };

export function derivarVocabulario(config: TaishoConfig, tema: ThemeVocabulary = deriveThemeVocabulary(config), extensiones: TaishoExtensions = {}) {
    const manifiesto = manifiestoDe(extensiones);
    const extra = cssDeExtensiones(extensiones);
    const { userColors, userStates, userGridMins, userScales, userUtilities, themeChangesDensity } = tema;

    const vocabularyColors = buildVocabularyColors(userColors, userStates);
    const reset = buildResetCSS(config.darkMode, userScales);
    const atomic = buildAtomicCSS(vocabularyColors, userGridMins, userScales);
    const utilities = buildUtilitiesCSS(userScales) + extra.utilities;
    const components = buildComponentsCSS(userColors, userStates, userScales, themeChangesDensity) + extra.components;
    const alias = aliasDe([atomic, utilities, components].flatMap((css) => parseUtilities(css).map((b) => b.name)));

    const emitidos = [atomic, utilities, components].flatMap((css) => parseUtilities(css).map((b) => b.name.replaceAll('\\', '')));
    const vigentes = new Set<string>();
    for (const n of emitidos) if (!renombrar(n)) vigentes.add(n);
    for (const nuevo of alias.values()) vigentes.add(nuevo);

    const prefijos = tablaPrefijos(userScales.screens);
    const propias = Object.keys(userUtilities).filter((k) => !esModificadorPropio(k));
    const modificadoresPropios = modificadoresPorPropia(userUtilities);
    const esUtilidad = (base: string) => vigentes.has(`ts-${base}`) || (Object.hasOwn(userUtilities, base) && !esModificadorPropio(base));
    const { atomicas, componentes, esComponente: esComp } = clasificarComponentes(manifiesto, atomic, utilities, alias);
    const esComponente = (base: string) => !Object.hasOwn(userUtilities, base) && esComp(base);

    const nombresCortos = [...vigentes].map((n) => n.slice(3));
    const vocabulario = [...nombresCortos, ...propias];
    const cadenasPropias = propiasConCadenas(userUtilities);
    const tonos = [...new Set([...components.matchAll(/^ {2}&\.(variant-[A-Za-z0-9-]+?-\d+) \{$/gm)].map((m) => m[1]))];
    return { manifiesto, userScales, tonos, userUtilities, cadenasPropias, modificadoresPropios, reset, atomic, utilities, components, alias, prefijos, esUtilidad, atomicas, componentes, esComponente, nombresCortos, vocabulario };
}

export function clasesPropias(config: TaishoConfig, tema: ThemeVocabulary, vocab: Vocabulario, extensiones: TaishoExtensions = {}): string[] {
    const propias = Object.keys(vocab.userUtilities).filter((k) => !esModificadorPropio(k));
    let deExtend: string[] = [];
    if (Object.keys(config.extend ?? {}).length) {
        const base = new Set(derivarVocabulario(config, { ...tema, userScales: defaultScales, userUtilities: {} }, extensiones).nombresCortos);
        deExtend = vocab.nombresCortos.filter((n) => !base.has(n));
    }
    return [...deExtend, ...propias];
}

export type Vocabulario = ReturnType<typeof derivarVocabulario>;

export interface AnalisisArchivo {
    variantes: string[];
    planas: string[];
    warnings: EngineWarning[];
    enteros: string[];
}

function contextoDe(v: Vocabulario) {
    let c = contextos.get(v);
    if (!c) {
        const sugerir = (prefijo: string) => vecino(prefijo, v.prefijos.keys());
        const slugsLargosPrimero = Object.keys(v.manifiesto.componentes).sort((a, b) => b.length - a.length);
        const dueno = new Map<string, string>();
        for (const [slug, comp] of Object.entries(v.manifiesto.componentes)) {
            for (const b of comp.bloques) for (const n of [b, (v.alias.get(`ts-${b}`) ?? `ts-${b}`).slice(3)]) dueno.set(n, slug);
        }
        c = { sugerir, slugsLargosPrimero, dueno };
        contextos.set(v, c);
    }
    return c;
}
const contextos = new WeakMap<Vocabulario, { sugerir: (prefijo: string) => string | undefined; slugsLargosPrimero: string[]; dueno: Map<string, string> }>();

const sumarAviso = (avisos: Map<string, EngineWarning>, a: EngineWarning) => {
    const clave = JSON.stringify(a);
    if (!avisos.has(clave)) avisos.set(clave, a);
};

export function analizarArchivo(v: Vocabulario, file: string, tokens: readonly string[], onDemand: boolean): AnalisisArchivo {
    const { prefijos, esUtilidad, esComponente, vocabulario, cadenasPropias } = v;
    const { sugerir, slugsLargosPrimero, dueno } = contextoDe(v);
    const variantes = new Set<string>();
    const planas = new Set<string>();
    const warnings = new Map<string, EngineWarning>();
    const avisar = (a: EngineWarning) => sumarAviso(warnings, { ...a, file });
    const enteros = new Set<string>();
    for (const { variantes: cadena, base } of pares(tokens, onDemand)) {
        const escrita = cadena.join('') + base;
        if (cadena.length === 1 && cadena[0] === 'class:') {
            planas.add(base);
            continue;
        }
        const r = validarCadena(cadena, prefijos);
        if (esComponente(base) && (r.ok || r.motivo !== 'desconocido')) {
            avisar({ code: 'variant-on-component', params: { class: escrita, variants: [...cadena], component: base } });
            continue;
        }
        if (!esUtilidad(base)) continue;
        if (r.ok) {
            const hojas = cadenasPropias.get(base);
            const mala = hojas && componerUso(cadena, hojas, prefijos).find((c) => !c.ok);
            if (mala && !mala.ok) avisar({ code: 'invalid-composition', params: datosComposicion(escrita, base, cadena, mala) });
            else variantes.add(escrita);
        }
        else if (r.motivo === 'data-ts') {
            avisar({ code: 'data-ts-variant', params: { class: escrita } });
        } else if (r.motivo === 'desconocido') {
            const sugerida = sugerir(r.prefijo);
            avisar({ code: 'unknown-prefix', params: { prefix: r.prefijo, class: escrita, ...(sugerida && { suggestion: sugerida }) } });
        } else if (r.canonica) {
            avisar({ code: 'out-of-order', params: { class: escrita, suggestion: r.canonica.join('') + base } });
        } else {
            avisar({ code: 'invalid-chain', params: { class: escrita } });
        }
    }
    for (const token of tokens) {
        if (token === 'markInvalid') for (const c of ['input-hint', 'input-footer', 'icon', 'icon-14']) planas.add(c);
        if (token.startsWith('data-ts-')) {
            const nombre = token.slice(8);
            const slug = slugsLargosPrimero.find((s) => nombre === s || nombre.startsWith(`${s}-`));
            if (slug) enteros.add(slug);
        }
        if (token.endsWith('{')) {
            if (onDemand) planas.add(token);
            const fragmento = token.slice(0, -1).split(':').pop()!;
            if (vocabulario.some((n) => n.length > fragmento.length && n.startsWith(fragmento))) {
                avisar({ code: 'runtime-class', params: { fragment: fragmento } });
            }
        } else if (onDemand) {
            const limpio = token.replace(/^[./]+|[./:]+$/g, '');
            if (limpio && !limpio.includes(':')) planas.add(limpio);
        }
    }
    if (onDemand) {
        for (const p of planas) {
            const slug = dueno.get(p);
            if (slug) enteros.add(slug);
        }
    }
    return { variantes: [...variantes], planas: [...planas], warnings: [...warnings.values()], enteros: [...enteros] };
}

export function unirAnalisis(v: Vocabulario, config: TaishoConfig, analisis: Iterable<AnalisisArchivo>, onDemand: boolean) {
    const { prefijos, vocabulario } = v;
    const { dueno } = contextoDe(v);
    const variantes = new Set<string>();
    const planas = new Set<string>();
    const warnings = new Map<string, EngineWarning>();
    if (config.scope !== undefined) sumarAviso(warnings, { code: 'scope-option', params: {} });
    const safelist = resolveSafelist(config.safelist, {
        vocabulario,
        modificadores: new Set([...[...v.modificadoresPropios.values()].flat(), ...modificadoresDeComponentes(v.components)]),
        prefijos,
        componentes: Object.keys(v.manifiesto.componentes),
        tonos: v.tonos,
    });
    if (onDemand) {
        for (const x of safelist.variantes) variantes.add(x);
        for (const p of safelist.planas) planas.add(p);
    }
    const enteros = new Set(safelist.componentes);
    for (const a of analisis) {
        for (const x of a.variantes) variantes.add(x);
        for (const x of a.planas) planas.add(x);
        for (const x of a.warnings) sumarAviso(warnings, x);
        for (const x of a.enteros) enteros.add(x);
    }

    const forzadas = new Set<string>();
    if (onDemand) {
        for (const p of safelist.planas) {
            const slug = dueno.get(p);
            if (slug) enteros.add(slug);
        }
        // De un componente usado entra siempre su bloque principal (el de su nombre; si no hay, el primero). Los demás entran si el
        // proyecto los nombra (o un fragmento armado en runtime, `card-{`, puede generarlos), si los crea el JS del Core (`runtime`)
        // o si el componente está en el safelist, que lo pide entero.
        const fragmentos = [...planas].filter((p) => p.endsWith('{')).map((p) => p.slice(0, -1));
        const nombrado = (b: string) => [b, (v.alias.get(`ts-${b}`) ?? `ts-${b}`).slice(3)].some((n) => planas.has(n) || planas.has(`ts-${n}`) || fragmentos.some((f) => n.startsWith(f)));
        const delSafelist = new Set([...safelist.componentes, ...[...safelist.planas].filter((p) => p in v.manifiesto.componentes)]);
        for (const slug of enteros) {
            for (const clase of CLASES_DEL_JS[slug] ?? []) planas.add(clase);
            const c = v.manifiesto.componentes[slug];
            const principales = c.bloques.filter((b) => b === slug || b === slug.replaceAll('-', ''));
            const principal = new Set(principales.length ? principales : c.bloques.slice(0, 1));
            for (const b of [...c.bloques.filter((b) => principal.has(b) || delSafelist.has(slug) || nombrado(b)), ...c.runtime]) forzadas.add(`ts-${b}`);
        }
    }
    return { variantes, planas, warnings: [...warnings.values()], forzadas, enteros };
}

function ordenar(files: Iterable<ContentFile>): ContentFile[] {
    const ordenados = [...files].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
    for (let i = 1; i < ordenados.length; i++) {
        if (ordenados[i].file === ordenados[i - 1].file) {
            throw new Error(`compile: ruta duplicada "${ordenados[i].file}".`);
        }
    }
    return ordenados;
}

export function compile(
    config: TaishoConfig,
    files: Iterable<ContentFile>,
    options: CompileOptions = {},
): CompileResult {
    const ordenados = ordenar(files);
    return compilarCon(derivarVocabulario(config, deriveThemeVocabulary(config, options.extensions), options.extensions), config, ordenados, options);
}

export function compilarCon(
    v: Vocabulario,
    config: TaishoConfig,
    files: Iterable<ContentFile>,
    options: CompileOptions = {},
): CompileResult {
    const { cache } = options;
    const copyright = options.copyright ?? DEFAULT_COPYRIGHT;
    const onDemand = options.onDemand ?? false;
    const ordenados = ordenar(files);

    const analisis = ordenados.map((f) => {
        let tokens = f.hash !== undefined ? cache?.get(f.hash) : undefined;
        if (!tokens) {
            tokens = tokenizar(f.content);
            if (f.hash !== undefined && cache && !cache.has(f.hash)) cache.set(f.hash, tokens);
        }
        return analizarArchivo(v, f.file, tokens, onDemand);
    });
    const { variantes, planas, warnings, forzadas } = unirAnalisis(v, config, analisis, onDemand);

    const css =
        `/* TaishoDS — ${copyright} */\n` +
        buildFlatCSS({
            reset: v.reset,
            atomic: v.atomic,
            utilities: v.utilities,
            components: v.components,
            variantesUsadas: variantes,
            usadas: onDemand ? planas : undefined,
            forzadas,
            varsDelProyecto: onDemand ? new Set(varsInContent(ordenados)) : undefined,
            scales: v.userScales,
            userUtilities: v.userUtilities,
        });
    return { css, variants: [...variantes], warnings };
}
